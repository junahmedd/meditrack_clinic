import { jsPDF } from "jspdf";

export interface InvoiceItem {
  description: string;
  subdescription?: string;
  sac?: string;
  category?: string;
  qty?: number;
  rate: number;
  amount: number;
}

export interface InvoicePDFData {
  invoiceNumber: string;
  dateTime: string;
  clinic: {
    name: string;
    address?: string;
    phone?: string;
    gstNumber?: string;
  };
  patient: {
    name: string;
    phone: string;
    age?: string;
    gender?: string;
    mrn?: string;
  };
  doctor: {
    name: string;
    specialty?: string;
    category?: string;
  };
  consultationDetails?: {
    diagnosis?: string;
    notes?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  tax?: number;
  grandTotal: number;
  paymentStatus: "Paid" | "Unpaid" | string;
  paymentMethod: "UPI" | "Cash" | string;
}

export function generateInvoicePDF(data: InvoicePDFData): { pdfDataUri: string; pdfBlob: Blob; pdfBase64: string } {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 15;
  let y = margin;

  // Colors matching the on-screen exact TAX INVOICE theme
  const primaryBlue = [37, 99, 235]; // #2563eb
  const darkText = [15, 23, 42]; // #0f172a (slate-900)
  const mutedText = [100, 116, 139]; // #64748b (slate-500)
  const borderGray = [226, 232, 240]; // #e2e8f0 (slate-200)
  const boxBg = [248, 250, 252]; // #f8fafc (slate-50)
  const tableHeaderBg = [241, 245, 249]; // #f1f5f9 (slate-100)
  const paidGreenBg = [220, 252, 231]; // #dcfce7
  const paidGreenText = [22, 101, 52]; // #166534

  // Top Accent Bar
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.rect(0, 0, pageWidth, 4, "F");

  y = 14;

  // Header Left: Logo + Clinic Information
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text("MediTrack", margin, y);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text("CLINIC MANAGEMENT SYSTEM", margin + 28, y - 0.5);

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(data.clinic.name || "Meditrack GP & Family Health Center", margin, y);

  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(data.clinic.address || "Suite 101, Medical Block A", margin, y);

  y += 4;
  const clinicPhone = data.clinic.phone || "+91 98765 43210";
  const clinicGst = data.clinic.gstNumber || "33ABCDE1234F1Z5";
  doc.text(`Phone: ${clinicPhone}  •  GSTIN: ${clinicGst}`, margin, y);

  // Header Right: Paid Badge + TAX INVOICE Title + Invoice No
  const rightX = pageWidth - margin;
  let headerRightY = 14;

  const isPaid = (data.paymentStatus || "").toUpperCase() === "PAID";
  const badgeText = `${isPaid ? "PAID" : "UNPAID"} • ${data.paymentMethod?.toUpperCase() || "CASH"}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  const badgeWidth = doc.getTextWidth(badgeText) + 6;

  doc.setFillColor(paidGreenBg[0], paidGreenBg[1], paidGreenBg[2]);
  doc.roundedRect(rightX - badgeWidth, headerRightY - 4, badgeWidth, 5.5, 1.5, 1.5, "F");
  doc.setTextColor(paidGreenText[0], paidGreenText[1], paidGreenText[2]);
  doc.text(badgeText, rightX - badgeWidth + 3, headerRightY);

  headerRightY += 6.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text("TAX INVOICE", rightX, headerRightY, { align: "right" });

  headerRightY += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text(data.invoiceNumber || "INV-2026-3936", rightX, headerRightY, { align: "right" });

  y += 6;
  // Main Horizontal Line below header
  doc.setDrawColor(darkText[0], darkText[1], darkText[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  y += 6;

  // Patient & Consulting Doctor Information Box
  const boxHeight = 20;
  doc.setFillColor(boxBg[0], boxBg[1], boxBg[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, pageWidth - margin * 2, boxHeight, 2.5, 2.5, "FD");

  const boxInnerY = y + 4.5;
  const col2X = pageWidth / 2 + 5;

  // Left Column: Billed To Patient
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text("BILLED TO (PATIENT)", margin + 4, boxInnerY);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(data.patient.name, margin + 4, boxInnerY + 5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(data.patient.phone || "", margin + 4, boxInnerY + 9.5);

  // Right Column: Consulting Doctor
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text("CONSULTING DOCTOR", col2X, boxInnerY);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(data.doctor.name, col2X, boxInnerY + 5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Date: ${data.dateTime}`, col2X, boxInnerY + 9.5);

  y += boxHeight + 6;

  // Itemized Table Header
  const tableWidth = pageWidth - margin * 2;
  const colX = {
    num: margin + 3,
    desc: margin + 12,
    sac: margin + 100,
    qty: margin + 125,
    rate: margin + 148,
    amount: pageWidth - margin - 3,
  };

  doc.setFillColor(tableHeaderBg[0], tableHeaderBg[1], tableHeaderBg[2]);
  doc.rect(margin, y, tableWidth, 7, "F");
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.line(margin, y, pageWidth - margin, y);
  doc.line(margin, y + 7, pageWidth - margin, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);

  doc.text("#", colX.num, y + 4.8);
  doc.text("SERVICE DESCRIPTION", colX.desc, y + 4.8);
  doc.text("SAC", colX.sac, y + 4.8);
  doc.text("QTY", colX.qty, y + 4.8, { align: "center" });
  doc.text("RATE", colX.rate, y + 4.8, { align: "right" });
  doc.text("AMOUNT", colX.amount, y + 4.8, { align: "right" });

  y += 7;

  // Table Body Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);

  data.items.forEach((item, index) => {
    const rowY = y + 5;

    // Item Number
    doc.text(String(index + 1), colX.num, rowY);

    // Item Description (Title + Subdescription)
    doc.setFont("helvetica", "bold");
    doc.text(item.description, colX.desc, rowY);

    const subText = item.subdescription || (index === 0 ? "Outpatient clinical assessment" : "");
    if (subText) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text(subText, colX.desc, rowY + 3.8);
      doc.setFontSize(8.5);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    }

    // SAC Code
    doc.setFont("helvetica", "normal");
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(item.sac || "999312", colX.sac, rowY);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);

    // Qty
    doc.text(String(item.qty || 1), colX.qty, rowY, { align: "center" });

    // Rate
    doc.text(`Rs ${item.rate.toFixed(0)}`, colX.rate, rowY, { align: "right" });

    // Amount
    doc.setFont("helvetica", "bold");
    doc.text(`Rs ${item.amount.toFixed(0)}`, colX.amount, rowY, { align: "right" });

    y += subText ? 10 : 7;

    // Thin row divider line
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.line(margin, y, pageWidth - margin, y);
  });

  y += 4;

  // Totals Section
  const totalsX = colX.amount;
  const labelsX = colX.rate - 20;

  // Subtotal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text("Subtotal", labelsX, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(`Rs ${data.subtotal.toFixed(0)}`, totalsX, y, { align: "right" });

  y += 4.5;
  // GST Exemption Line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text("Healthcare GST Exemption (0% - Notfn 12/2017)", margin, y);
  doc.text("Rs 0.00", totalsX, y, { align: "right" });

  y += 4;
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.line(margin, y, pageWidth - margin, y);

  y += 5.5;
  // Total Amount Paid Line
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(`Total Amount Paid (${data.paymentMethod || "Cash"})`, margin, y);

  doc.setFontSize(11);
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text(`Rs ${data.grandTotal.toFixed(2)}`, totalsX, y, { align: "right" });

  y += 12;

  // Footer Section: Notes & Authorized Signatory
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.line(margin, y, pageWidth - margin, y);

  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);

  // Left Footer Notes
  doc.text("• Computer generated official Tax Invoice.", margin, y);
  doc.text("• Prescriptions valid for 15 days from issue date.", margin, y + 3.8);

  // Right Footer Signatory
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text("Authorized Signatory", rightX, y, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`${data.clinic.name || "Meditrack GP & Family Health Center"} Desk`, rightX, y + 3.8, { align: "right" });

  const pdfDataUri = doc.output("datauristring");
  const pdfArrayBuffer = doc.output("arraybuffer");
  const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });
  const pdfBase64 = pdfDataUri.split(",")[1] || "";

  return { pdfDataUri, pdfBlob, pdfBase64 };
}
