export interface SendWhatsAppPayload {
  to: string;
  message: string;
  mediaBase64?: string;
  filename?: string;
}

export async function sendWhatsApp(payload: SendWhatsAppPayload): Promise<{ success: boolean; data?: any }> {
  const { to, message, mediaBase64, filename } = payload;
  const rawDigits = (to || "").replace(/\D/g, "");
  const cleanTo = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits.length === 11 && rawDigits.startsWith("0") ? `91${rawDigits.slice(1)}` : rawDigits;

  // 1. Check for client-side direct Meta credentials in environment variables or localStorage
  const token = (
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_WHATSAPP_TOKEN) ||
    localStorage.getItem("WHATSAPP_TOKEN") ||
    ""
  ).trim();
  
  const phoneNumberId = (
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_WHATSAPP_PHONE_NUMBER_ID) ||
    localStorage.getItem("WHATSAPP_PHONE_NUMBER_ID") ||
    ""
  ).trim();

  if (token && phoneNumberId) {
    try {
      let mediaId: string | null = null;
      if (mediaBase64) {
        const base64Data = mediaBase64.includes(",") ? mediaBase64.split(",")[1] : mediaBase64;
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const isPdf = filename?.endsWith(".pdf");
        const mimeType = isPdf ? "application/pdf" : "image/png";
        const blob = new Blob([bytes], { type: mimeType });
        const safeFilename = (filename || "document.pdf").replace(/[^a-zA-Z0-9_\.\-]/g, "_");

        const formData = new FormData();
        formData.append("file", blob, safeFilename);
        formData.append("messaging_product", "whatsapp");
        formData.append("type", mimeType);

        const uploadRes = await fetch(
          `https://graph.facebook.com/v20.0/${phoneNumberId}/media`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          }
        );

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          const metaErr = uploadData.error?.message || "Media upload failed";
          const errorCode = uploadData.error?.code;
          if (uploadData.error?.type === "OAuthException" || errorCode === 190 || errorCode === 102) {
            throw new Error(`WhatsApp Authentication Failed: ${metaErr}. Please update WHATSAPP_TOKEN.`);
          }
          throw new Error(`WhatsApp Media Error: ${metaErr} (Code: ${errorCode})`);
        }
        mediaId = uploadData.id;
      }

      const messageBody: any = {
        messaging_product: "whatsapp",
        to: cleanTo,
      };

      if (mediaId) {
        const isPdf = filename?.endsWith(".pdf");
        messageBody.type = isPdf ? "document" : "image";
        messageBody[isPdf ? "document" : "image"] = {
          id: mediaId,
          ...(isPdf ? { filename: filename } : { caption: message }),
        };
      } else {
        messageBody.type = "text";
        messageBody.text = { body: message };
      }

      const sendRes = await fetch(
        `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messageBody),
        }
      );

      const sendData = await sendRes.json();
      if (!sendRes.ok) {
        const metaErr = sendData.error?.message || "Message dispatch failed";
        const errorCode = sendData.error?.code;
        if (errorCode === 131030) {
          throw new Error(`WhatsApp API Error: Recipient (+${cleanTo}) is not in Meta Sandbox verified recipients list.`);
        }
        throw new Error(`WhatsApp API Error: ${metaErr} (Code: ${errorCode})`);
      }

      return { success: true, data: sendData };
    } catch (clientErr: any) {
      console.warn("Direct client Meta API call failed:", clientErr.message);
      // Fallthrough to try backend route
    }
  }

  // 2. Make backend call to /api/send-whatsapp safely checking response content-type
  const response = await fetch("/api/send-whatsapp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: cleanTo,
      message,
      mediaBase64,
      filename,
    }),
  });

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || "WhatsApp API delivery failed.");
    }
    return { success: true, data };
  } else {
    // If response is HTML (e.g. Firebase Hosting static rewrite index.html) or non-JSON:
    const text = await response.text();
    if (text.startsWith("<!") || text.includes("<html") || response.status === 404) {
      throw new Error(
        "WhatsApp Backend API server (/api/send-whatsapp) is not active on this static hosting deployment. Ensure Node backend (server.ts) is running or configure WHATSAPP_TOKEN."
      );
    }
    throw new Error(`WhatsApp server returned non-JSON response (Status ${response.status}).`);
  }
}
