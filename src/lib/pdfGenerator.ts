import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "./calculations";

export interface InvoicePdfData {
  id?: string;
  invoiceNumber?: string | null;
  status: "draft" | "issued";
  issueDate?: string | null;
  serviceDate?: string | null;
  dueDate?: string | null;
  paymentTerms?: string | null;
  currency: "EUR" | "GBP";
  
  isVatRegistered: boolean;
  vatRatePercent: number | string;
  isVatInclusive: boolean;
  vatExemptReason?: string | null;

  supplierName: string;
  supplierAddress?: string | null;
  supplierEmail?: string | null;
  supplierPhone?: string | null;
  supplierVatNumber?: string | null;
  supplierBankName?: string | null;
  supplierIban?: string | null;
  supplierBic?: string | null;

  clientName: string;
  clientAddress?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;

  descriptionOfWork?: string | null;
  notes?: string | null;
  subtotalCents: number;
  vatAmountCents: number;
  totalCents: number;
  integrityHash?: string | null;
  issuedAt?: string | null;

  items: Array<{
    description: string;
    quantity: number | string;
    unitPriceCents: number;
    totalCents: number;
  }>;
}

/**
 * Generates a branded, publication-ready vector PDF invoice.
 */
export function generateInvoicePdf(data: InvoicePdfData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  let currentY = margin;

  const isDraft = data.status === "draft";
  const currency = data.currency || "EUR";

  // 1. Watermark if DRAFT
  if (isDraft) {
    doc.saveGraphicsState();
    doc.setTextColor(220, 225, 232);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(54);
    // Draw diagonal text in background
    doc.text("DRAFT INVOICE", pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 45,
    });
    doc.restoreGraphicsState();
  }

  // 2. Header Branding
  // Slate/Navy header block
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, currentY, pageWidth - margin * 2, 28, "F");

  // Matos Systems Logo Mark & Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("MATOS SYSTEMS", margin + 8, currentY + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("VOICEDOCS INVOICING ENGINE", margin + 8, currentY + 18);

  // Status Badge in Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  if (isDraft) {
    doc.setFillColor(234, 179, 8); // amber-500
    doc.roundedRect(pageWidth - margin - 42, currentY + 7, 34, 14, 2, 2, "F");
    doc.setTextColor(15, 23, 42);
    doc.text("DRAFT", pageWidth - margin - 25, currentY + 16, { align: "center" });
  } else {
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.roundedRect(pageWidth - margin - 42, currentY + 7, 34, 14, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("ISSUED", pageWidth - margin - 25, currentY + 16, { align: "center" });
  }

  currentY += 34;

  // 3. Invoice Number & Date Bar
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  const invNumberText = data.invoiceNumber || "DRAFT-PREVIEW";
  doc.text(`INVOICE: ${invNumberText}`, margin, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const dateText = data.issueDate ? `Issue Date: ${data.issueDate}` : `Draft Date: ${new Date().toISOString().split("T")[0]}`;
  doc.text(dateText, pageWidth - margin, currentY, { align: "right" });

  currentY += 8;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 7;

  // 4. Supplier & Client Columns
  const colWidth = (pageWidth - margin * 2 - 10) / 2;
  const leftX = margin;
  const rightX = margin + colWidth + 10;

  // Supplier
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("FROM (SUPPLIER)", leftX, currentY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(data.supplierName || "Matos Technical Solutions Ltd", leftX, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  let supplierY = currentY + 10;
  if (data.supplierAddress) {
    const splitAddr = doc.splitTextToSize(data.supplierAddress, colWidth);
    doc.text(splitAddr, leftX, supplierY);
    supplierY += splitAddr.length * 4;
  }
  if (data.supplierVatNumber) {
    doc.text(`VAT ID: ${data.supplierVatNumber}`, leftX, supplierY);
    supplierY += 4;
  }
  if (data.supplierEmail) {
    doc.text(`Email: ${data.supplierEmail}`, leftX, supplierY);
    supplierY += 4;
  }

  // Client
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("BILL TO (CLIENT)", rightX, currentY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(data.clientName || "[Client Name Required]", rightX, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  let clientY = currentY + 10;
  if (data.clientAddress) {
    const splitAddr = doc.splitTextToSize(data.clientAddress, colWidth);
    doc.text(splitAddr, rightX, clientY);
    clientY += splitAddr.length * 4;
  } else {
    doc.setTextColor(156, 163, 175);
    doc.text("(Address not provided)", rightX, clientY);
    clientY += 4;
    doc.setTextColor(71, 85, 105);
  }
  if (data.clientEmail) {
    doc.text(`Email: ${data.clientEmail}`, rightX, clientY);
    clientY += 4;
  }
  if (data.paymentTerms) {
    doc.text(`Payment Terms: ${data.paymentTerms}`, rightX, clientY);
    clientY += 4;
  }
  if (data.dueDate) {
    doc.text(`Due Date: ${data.dueDate}`, rightX, clientY);
    clientY += 4;
  }

  currentY = Math.max(supplierY, clientY) + 6;

  // 5. Line Items Table
  const tableRows = (data.items || []).map((item, idx) => [
    String(idx + 1),
    item.description,
    String(item.quantity),
    formatCurrency(item.unitPriceCents, currency),
    formatCurrency(item.totalCents, currency),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["#", "Description of Work / Items", "Qty", "Unit Price", "Amount"]],
    body: tableRows,
    margin: { left: margin, right: margin },
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 26, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
    },
    styles: {
      cellPadding: 3.5,
      overflow: "linebreak",
    },
  });

  // Position after table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastTable = (doc as any).lastAutoTable;
  currentY = lastTable ? lastTable.finalY + 8 : currentY + 40;

  // 6. Summary Totals Box (Right Aligned)
  const totalsBoxWidth = 80;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;

  doc.setFillColor(248, 250, 252);
  doc.rect(totalsBoxX, currentY, totalsBoxWidth, 32, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(totalsBoxX, currentY, totalsBoxWidth, 32, "S");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);

  const vatLabel = data.isVatRegistered
    ? `VAT (${data.vatRatePercent}%)`
    : "VAT (Not Registered / Exempt)";

  // Subtotal
  doc.text("Subtotal (Net):", totalsBoxX + 4, currentY + 7);
  doc.text(
    formatCurrency(data.subtotalCents, currency),
    pageWidth - margin - 4,
    currentY + 7,
    { align: "right" }
  );

  // VAT
  doc.text(vatLabel, totalsBoxX + 4, currentY + 14);
  doc.text(
    formatCurrency(data.vatAmountCents, currency),
    pageWidth - margin - 4,
    currentY + 14,
    { align: "right" }
  );

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(totalsBoxX + 4, currentY + 18, pageWidth - margin - 4, currentY + 18);

  // Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("TOTAL DUE:", totalsBoxX + 4, currentY + 25);
  doc.text(
    formatCurrency(data.totalCents, currency),
    pageWidth - margin - 4,
    currentY + 25,
    { align: "right" }
  );

  // 7. Payment Details (Left Box)
  const payBoxWidth = colWidth + 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("PAYMENT DETAILS & BANK TRANSFER", margin, currentY + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  let bankY = currentY + 9;
  if (data.supplierBankName) {
    doc.text(`Bank: ${data.supplierBankName}`, margin, bankY);
    bankY += 4;
  }
  if (data.supplierIban) {
    doc.text(`IBAN: ${data.supplierIban}`, margin, bankY);
    bankY += 4;
  }
  if (data.supplierBic) {
    doc.text(`BIC / SWIFT: ${data.supplierBic}`, margin, bankY);
    bankY += 4;
  }
  if (data.paymentTerms) {
    doc.text(`Terms: ${data.paymentTerms}`, margin, bankY);
    bankY += 4;
  }

  currentY = Math.max(currentY + 36, bankY + 4);

  // 8. Notes & Description of Work
  if (data.notes || data.descriptionOfWork) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("NOTES & PROJECT SCOPE:", margin, currentY);
    currentY += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const notesText = [data.descriptionOfWork, data.notes].filter(Boolean).join(" — ");
    const splitNotes = doc.splitTextToSize(notesText, pageWidth - margin * 2);
    doc.text(splitNotes, margin, currentY);
    currentY += splitNotes.length * 3.5;
  }

  // 9. Document Integrity Footer
  const footerY = pageHeight - margin + 6;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);

  if (data.status === "issued" && data.integrityHash) {
    doc.text(
      `ISSUED RECORD — SHA-256 AUDIT DIGEST: ${data.integrityHash}`,
      margin,
      footerY
    );
  } else {
    doc.text(
      "DRAFT RECORD — Unissued working document. Certified values assigned upon formal issuance.",
      margin,
      footerY
    );
  }

  doc.text(
    "Matos VoiceDocs • Commercial Invoice Engine",
    pageWidth - margin,
    footerY,
    { align: "right" }
  );

  return doc;
}
