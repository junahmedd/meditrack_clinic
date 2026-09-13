import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function callGeminiWithRetry(options: any, maxAttempts = 3, delayMs = 500) {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent(options);
    } catch (error: any) {
      lastError = error;
      const errorStr = ((error.message || "") + " " + String(error.status || "") + " " + String(error.code || "")).toLowerCase();
      const isTransient = errorStr.includes("503") || 
                          errorStr.includes("unavailable") || 
                          errorStr.includes("high demand") || 
                          errorStr.includes("overloaded") ||
                          errorStr.includes("rate limit") ||
                          errorStr.includes("429");
      
      if (isTransient && attempt < maxAttempts) {
        console.warn(`[Pharmacy Ledger] Gemini call failed (transient). Attempt ${attempt}/${maxAttempts}. Retrying in ${delayMs}ms... Error:`, error.message || error);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2; // exponential backoff
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // WhatsApp API Route
  app.post("/api/send-whatsapp", async (req, res) => {
    const { to, message, mediaBase64, filename } = req.body;
    const token = process.env.WHATSAPP_TOKEN?.trim();
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

    if (!token || !phoneNumberId) {
      return res.status(400).json({ 
        error: "WhatsApp settings missing. Please ensure WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID are set in the app settings (Settings -> Environment Variables)." 
      });
    }

    if (!token.startsWith('EA')) {
      return res.status(400).json({ 
        error: "Invalid WhatsApp Token format. Tokens usually start with 'EA...'. Please verify your WHATSAPP_TOKEN in the Meta Developer Portal." 
      });
    }

    const toStr = to ? String(to) : "";
    const cleanTo = toStr.replace(/\D/g, '');
    const API_VERSION = "v20.0";

    try {
      let mediaId = null;

      // If media is provided, upload it first
      if (mediaBase64) {
        const base64Data = mediaBase64.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        const formData = new FormData();
        
        // WhatsApp requires 'file' as the field name
        const mimeType = filename?.endsWith('.pdf') ? 'application/pdf' : 'image/png';
        const blob = new Blob([buffer], { type: mimeType });
        const safeFilename = (filename || "prescription.png").replace(/[^a-zA-Z0-9_\.\-]/g, "_");
        formData.append("file", blob, safeFilename);
        formData.append("messaging_product", "whatsapp");
        formData.append("type", mimeType);

        const uploadResponse = await fetch(
          `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/media`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) {
          console.error("Meta Media Upload Error:", JSON.stringify(uploadData, null, 2));
          const metaError = uploadData.error?.message || "Media upload failed";
          const errorCode = uploadData.error?.code;
          const isAuthError = uploadData.error?.type === 'OAuthException' || errorCode === 190 || errorCode === 102;
          
          if (isAuthError) {
            throw new Error(`WhatsApp Authentication Failed: ${metaError}. 
Possible fixes:
1. Generate a new WHATSAPP_TOKEN in Meta Developer Portal (Temporary tokens expire in 24h).
2. Ensure token has 'whatsapp_business_messaging' permission.
3. Verify you're using the 'Phone Number ID', NOT the 'Business Account ID'.`);
          }
          throw new Error(`WhatsApp API Media Error: ${metaError} (Code: ${errorCode})`);
        }
        mediaId = uploadData.id;
      }

      // Send the message
      const messageBody: any = {
        messaging_product: "whatsapp",
        to: cleanTo,
      };

      if (mediaId) {
        const isPdf = filename?.endsWith('.pdf');
        messageBody.type = isPdf ? "document" : "image";
        messageBody[isPdf ? "document" : "image"] = {
          id: mediaId,
          ...(isPdf ? { filename: filename } : { caption: message })
        };
      } else {
        messageBody.type = "text";
        messageBody.text = { body: message };
      }

      const response = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messageBody),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        console.error("Meta API Message Error:", JSON.stringify(data, null, 2));
        const metaError = data.error?.message || "Message delivery failed";
        const errorCode = data.error?.code;
        const isAuthError = data.error?.type === 'OAuthException' || errorCode === 190 || errorCode === 102;
        
        if (errorCode === 131030) {
          throw new Error(`WhatsApp API Error: Recipient number (${cleanTo}) is not in the allowed list/not verified. If using a Test Number in Meta Sandbox, you MUST manually add this recipient number to your 'Verified Recipient Numbers' in your Meta App Developer Portal.`);
        }
        
        if (isAuthError) {
          throw new Error(`WhatsApp Authentication Failed: ${metaError}. Please refresh your token or check its permissions.`);
        }

        throw new Error(`WhatsApp API Message Error: ${metaError} (Code: ${errorCode})`);
      }

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("WhatsApp Route Error Details:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Automated Pharmacy billing calculation via Gemini SDK (with robust local deterministic FEFO fallback)
  app.post("/api/generate-invoice", async (req, res) => {
    const { patientState, inventoryContext, dateStr } = req.body;

    const runLocalFallback = (reason: string) => {
      console.warn(`[Pharmacy Ledger] Running local deterministic FEFO billing pipeline fallback. Reason: ${reason}`);
      try {
        const fallbackResult = calculateLocalInvoice(patientState, inventoryContext, dateStr);
        return res.json(fallbackResult);
      } catch (fallbackErr: any) {
        console.error("[Pharmacy Ledger] Local billing calculation fallback failed:", fallbackErr);
        return res.status(500).json({ error: "Failed to compile validated invoice via primary AI and secondary fallback logic." });
      }
    };

    if (!process.env.GEMINI_API_KEY) {
      return runLocalFallback("GEMINI_API_KEY environment variable is not defined");
    }

    try {
      const prompt = `
You are the N Clinic Pharmacy Extraction & Calculation Engine.
Given:
1. Patient's state: ${patientState}
2. Core Inventory snapshot: ${inventoryContext}
3. Today's date context: ${dateStr || 'Current Date'}

Instructions:
1. Parse the patient's prescribed medicines, dosage patterns, and days of treatment.
2. Calculate the total required pills/units for each medicine: total_needed = daily_pills * days of treatment.
   - If the dosage states a pattern like "1-0-1", daily_pills is 2.
   - If "1-1-1", daily_pills is 3.
   - If "1-0-0" or "0-0-1", daily_pills is 1.
   - If dosage is freeform like "Once daily" or "twice daily" or contains no frequency pattern, inspect the text to map daily pills. If empty or unknown, default daily_pills to 1.
3. Search the core inventory snapshot for matching medicine names.
4. For each matching medicine, allocate stock from its available batches using FEFO (First-Expired, First-Out) logic based on the batch expiryDate string (earlier dates first).
5. If a single batch cannot completely satisfy the total_needed quantity, consume the entire batch and create a secondary split item entry for the remainder from the next earliest batch of that medicine.
6. If overall inventory across all batches is insufficient, only dispense what is available. Do not create hypothetical batches or dispense more than is in stock.
7. For each allocated batch item in the list, compute:
   - amount = quantityDispensed * unitCost
8. Compute financial summaries:
   - subtotal = Sum of all amounts
   - cgstSgst = 12% of subtotal (calculated as subtotal * 0.12)
   - grandTotal = subtotal + cgstSgst
9. Generate a unique Invoice number following the format: 'NC-YYYYMMDD-XXXX' (where YYYYMMDD is the current date and XXXX is a random 4-digit code) and a unique 'mtId' following the format 'MT-ID: [NC] - YYYY' where YYYY is a random 4-digit number.
10. Ensure the response strictly follows the JSON schema specified.
11. CRITICAL: The medicineName field MUST contain only the actual name of the medicine (e.g. 'AMOXICILLIN'). It must absolutely NOT include any patient details, patient phone numbers, contact numbers, or preceding text such as 'PHONE: ...', 'PRESCRIBED MEDICINES: ...' or punctuation.
`;

      const response = await callGeminiWithRetry({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              invoiceNumber: {
                type: Type.STRING,
                description: "Invoice ID following format NC-YYYYMMDD-XXXX (e.g. NC-20260609-FINAL or NC-20260609-8821)"
              },
              date: { type: Type.STRING, description: "Formatted date e.g. June 9, 2026" },
              time: { type: Type.STRING, description: "Formatted time block e.g. 9:01:27 PM IST" },
              patientName: { type: Type.STRING },
              patientContact: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    medicineName: { type: Type.STRING, description: "Name of the medicine" },
                    batchId: { type: Type.STRING, description: "FEFO-selected batch ID" },
                    quantityDispensed: { type: Type.INTEGER, description: "Total quantity subtracted and dispensed" },
                    unitCost: { type: Type.NUMBER, description: "Price per pill/item (unit cost)" },
                    amount: { type: Type.NUMBER, description: "quantityDispensed * unitCost" }
                  },
                  required: ["medicineName", "batchId", "quantityDispensed", "unitCost", "amount"]
                }
              },
              subtotal: { type: Type.NUMBER },
              cgstSgst: { type: Type.NUMBER },
              grandTotal: { type: Type.NUMBER },
              mtId: { type: Type.STRING, description: "Closing metadata format e.g. MT-ID: [NC] - 8821" }
            },
            required: [
              "invoiceNumber", "date", "time", "patientName", "patientContact", "items", "subtotal", "cgstSgst", "grandTotal", "mtId"
            ]
          }
        }
      });

      if (!response.text) {
        throw new Error("Empty response text returned from Gemini API");
      }

      const structuredResult = JSON.parse(response.text.trim());
      res.json(structuredResult);
    } catch (error: any) {
      console.error("[Pharmacy Ledger] Gemini API primary call errored out, activating local fallback:", error);
      return runLocalFallback(error.message || "Gemini model error/exception");
    }
  });

  // Automated Alternative Medicine suggestion via Gemini SDK with robust local fallback
  app.post("/api/get-medicine-alternative", async (req, res) => {
    const { oosMedicine, oosDosage, availableInventory } = req.body;

    const runLocalAlternativeFallback = () => {
      return res.json({
        medicine: "General Alternative",
        dosage: oosDosage || "Same Dosage",
        reason: "Local pharmacy substitution fallback activated."
      });
    };

    if (!process.env.GEMINI_API_KEY) {
      return runLocalAlternativeFallback();
    }

    try {
      const inventoryList = (availableInventory || [])
        .map((i: any) => `${i.medicine} ${i.dosage}`)
        .join(', ');

      const prompt = `The medicine "${oosMedicine} ${oosDosage}" is currently out of stock. 
Based on the following list of available medicines in our pharmacy, suggest ONE best alternative that is medically similar (e.g., same salt or similar therapeutic class).

Available Inventory: ${inventoryList}

If no suitable alternative is found in the list, suggest the most common medical alternative anyway.

Provide the response in JSON format.`;

      const response = await callGeminiWithRetry({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              medicine: { type: Type.STRING, description: "Name of the alternative medicine" },
              dosage: { type: Type.STRING, description: "Recommended dosage for the alternative" },
              reason: { type: Type.STRING, description: "Brief explanation why this is a good alternative (e.g., Same Salt)" }
            },
            required: ["medicine", "dosage", "reason"]
          }
        }
      });

      if (!response.text) {
        throw new Error("Empty response returned from Gemini API");
      }

      res.json(JSON.parse(response.text.trim()));
    } catch (err) {
      console.error("[Pharmacy Alternative] Error getting medicine alternative from Gemini API:", err);
      return runLocalAlternativeFallback();
    }
  });

  // Helper local calculation logic to perfectly emulate the billing engine when Gemini is down
  function calculateLocalInvoice(patientState: string, inventoryContext: string, dateStr?: string) {
    // 1. Extract name and contact from patientState
    const nameMatch = patientState.match(/^([^,]+)/);
    const patientName = nameMatch ? nameMatch[1].trim() : "Patient";
    
    const phoneMatch = patientState.match(/Phone:\s*([^\.,]+)/);
    let patientContact = phoneMatch ? phoneMatch[1].trim() : "Walk-In";
    if (patientContact === "Not Provided") {
      patientContact = "Walk-In";
    }

    // 2. Parse prescribed medicines
    interface MedicineReq {
      name: string;
      dosage: string;
      days: number;
      qtyNeeded: number;
    }
    const medicines: MedicineReq[] = [];
    const regex = /([^,()]+)\s*\(\s*Dosage:\s*([^,)]+),\s*Duration:\s*(\d+)\s*Days\s*\)/gi;
    let match;
    while ((match = regex.exec(patientState)) !== null) {
      let name = match[1].trim();
      
      // Clean up name if it mistakenly captures preceding metadata like phone number or "prescribed medicines:" prefixes
      if (name.toLowerCase().includes("prescribed medicines:")) {
        const index = name.toLowerCase().indexOf("prescribed medicines:");
        name = name.substring(index + "prescribed medicines:".length).trim();
      }
      if (name.toLowerCase().includes("phone:")) {
        // If there's Still a dot or separator after phone number
        const dotIndex = name.toLowerCase().indexOf("prescribed medicines:");
        if (dotIndex !== -1) {
          name = name.substring(dotIndex + "prescribed medicines:".length).trim();
        } else {
          // Fallback splits
          const parts = name.split(/\s*[\.\:\,]\s*/);
          if (parts.length > 1) {
            name = parts[parts.length - 1].trim();
          }
        }
      }
      // Strip any non-alphanumeric leading characters just in case
      name = name.replace(/^[^a-zA-Z0-9]+/, "").trim();

      const dosage = match[2].trim();
      const days = parseInt(match[3], 10) || 0;
      
      // Calculate dailyPills
      let dailyPills = 1;
      const lowerDosage = dosage.toLowerCase();
      if (lowerDosage.includes("1-1-1") || lowerDosage.includes("three") || lowerDosage.includes("tds") || lowerDosage.includes("t.i.d")) {
        dailyPills = 3;
      } else if (lowerDosage.includes("1-0-1") || lowerDosage.includes("1-1-0") || lowerDosage.includes("0-1-1") || lowerDosage.includes("twice") || lowerDosage.includes("bd") || lowerDosage.includes("b.i.d")) {
        dailyPills = 2;
      } else if (lowerDosage.includes("four") || lowerDosage.includes("4 times") || lowerDosage.includes("q.i.d") || lowerDosage.includes("qd")) {
        dailyPills = 4;
      } else {
        dailyPills = 1;
      }
      
      medicines.push({
        name,
        dosage,
        days,
        qtyNeeded: dailyPills * days
      });
    }

    // Backup parsing if regex matched nothing but there is a prescription list
    if (medicines.length === 0) {
      const presIdx = patientState.indexOf("Prescribed medicines:");
      if (presIdx !== -1) {
        const presStr = patientState.substring(presIdx + "Prescribed medicines:".length).trim();
        if (presStr && presStr !== "None") {
          const parts = presStr.split(",");
          for (const part of parts) {
            const cleanPart = part.trim();
            if (cleanPart) {
              const medName = cleanPart.split("(")[0]?.trim();
              if (medName) {
                medicines.push({
                  name: medName,
                  dosage: "unspecified",
                  days: 5,
                  qtyNeeded: 5
                });
              }
            }
          }
        }
      }
    }

    // 3. Parse inventory context
    interface Batch {
      batchNo: string;
      quantity: number;
      unitPrice: number;
      expiryDate: string;
    }
    
    interface InventoryItem {
      medicineName: string;
      batches: Batch[];
    }

    const parsedInventory: InventoryItem[] = [];
    const lines = (inventoryContext || "").split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      const medMatch = line.match(/Medicine:\s*"([^"]+)"/i);
      if (!medMatch) continue;
      const medicineName = medMatch[1].trim();

      const batches: Batch[] = [];
      const batchesSectionMatch = line.match(/Batches:\s*\[(.*)\]/i);
      if (batchesSectionMatch) {
        const batchesStr = batchesSectionMatch[1];
        const batchBlocks = batchesStr.match(/\{[^}]+\}/g) || [];
        for (const block of batchBlocks) {
          const batchNoMatch = block.match(/batchNo:\s*["']([^"']+)["']/i);
          const quantityMatch = block.match(/quantity:\s*(\d+)/i);
          const unitPriceMatch = block.match(/unitPrice:\s*([\d\.-]+)/i);
          const expiryDateMatch = block.match(/expiryDate:\s*["']([^"']+)["']/i);

          if (batchNoMatch && quantityMatch) {
            batches.push({
              batchNo: batchNoMatch[1],
              quantity: parseInt(quantityMatch[1], 10) || 0,
              unitPrice: unitPriceMatch ? parseFloat(unitPriceMatch[1]) : 0,
              expiryDate: expiryDateMatch ? expiryDateMatch[1] : ""
            });
          }
        }
      }

      parsedInventory.push({
        medicineName,
        batches
      });
    }

    // 4. Match and allocate using FEFO
    interface AllocatedItem {
      medicineName: string;
      batchId: string;
      quantityDispensed: number;
      unitCost: number;
      amount: number;
    }
    const allocatedItems: AllocatedItem[] = [];

    for (const med of medicines) {
      let matchedInv = parsedInventory.find(
        inv => inv.medicineName.toLowerCase().trim() === med.name.toLowerCase().trim()
      );
      if (!matchedInv) {
        matchedInv = parsedInventory.find(
          inv => inv.medicineName.toLowerCase().includes(med.name.toLowerCase()) || 
                 med.name.toLowerCase().includes(inv.medicineName.toLowerCase())
        );
      }

      let remainingNeeded = med.qtyNeeded;
      if (matchedInv) {
        // Sort batches by expiryDate ascending (earliest first)
        const sortedBatches = [...matchedInv.batches].sort((a, b) => {
          const dateA = new Date(a.expiryDate).getTime() || 0;
          const dateB = new Date(b.expiryDate).getTime() || 0;
          return dateA - dateB;
        });

        for (const batch of sortedBatches) {
          if (remainingNeeded <= 0) break;
          if (batch.quantity <= 0) continue;

          const toDispense = Math.min(batch.quantity, remainingNeeded);
          const amount = parseFloat((toDispense * batch.unitPrice).toFixed(2));

          allocatedItems.push({
            medicineName: matchedInv.medicineName,
            batchId: batch.batchNo,
            quantityDispensed: toDispense,
            unitCost: batch.unitPrice,
            amount: amount
          });

          remainingNeeded -= toDispense;
        }
      }

      // Fallback if we still need units, or if medicine was not in inventory context
      if (remainingNeeded > 0) {
        const unitPrice = 5.00; // default backup price
        allocatedItems.push({
          medicineName: matchedInv ? matchedInv.medicineName : med.name,
          batchId: "DEFAULT-B1",
          quantityDispensed: remainingNeeded,
          unitCost: unitPrice,
          amount: parseFloat((remainingNeeded * unitPrice).toFixed(2))
        });
      }
    }

    // 5. Build financial summary
    const subtotal = parseFloat(allocatedItems.reduce((acc, item) => acc + item.amount, 0).toFixed(2));
    const cgstSgst = parseFloat((subtotal * 0.12).toFixed(2));
    const grandTotal = parseFloat((subtotal + cgstSgst).toFixed(2));

    // Determine formats
    const formattedToday = dateStr || new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
    
    const formattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short"
    });

    const random4 = Math.floor(1000 + Math.random() * 9000);
    const today = new Date();
    const yyyymmdd = today.toISOString().split('T')[0].replace(/-/g, '');
    const invoiceNumber = `NC-${yyyymmdd}-${random4}`;
    const mtId = `MT-ID: [NC] - ${random4}`;

    return {
      invoiceNumber,
      date: formattedToday,
      time: formattedTime,
      patientName,
      patientContact,
      items: allocatedItems,
      subtotal,
      cgstSgst,
      grandTotal,
      mtId
    };
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
