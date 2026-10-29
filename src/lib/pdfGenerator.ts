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
  isDemoSupplier?: boolean;

  items: Array<{
    description: string;
    quantity: number | string;
    unitPriceCents: number;
    totalCents: number;
  }>;
}

/**
 * Draws diagonal background watermark for draft invoices.
 */
function drawDraftWatermark(doc: jsPDF, pageWidth: number, pageHeight: number) {
  doc.saveGraphicsState();
  doc.setTextColor(238, 242, 246);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(54);
  doc.text("DRAFT INVOICE", pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: 45,
  });
  doc.restoreGraphicsState();
}

/**
 * Generates a branded, publication-ready vector PDF invoice with collision-free,
 * dynamically wrapped columns and structured multi-line footer.
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

  // 1. Watermark if DRAFT on Page 1
  if (isDraft) {
    drawDraftWatermark(doc, pageWidth, pageHeight);
  }

  // 2. Header Branding Block
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, currentY, pageWidth - margin * 2, 28, "F");

  // Logo Mark & Engine Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("MATOS SYSTEMS", margin + 8, currentY + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("VOICEDOCS INVOICING ENGINE", margin + 8, currentY + 18);

  // Status Badge in Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  if (isDraft) {
    doc.setFillColor(234, 179, 8); // amber-500
    doc.roundedRect(pageWidth - margin - 40, currentY + 7, 32, 14, 2, 2, "F");
    doc.setTextColor(15, 23, 42);
    doc.text("DRAFT", pageWidth - margin - 24, currentY + 16, { align: "center" });
  } else {
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.roundedRect(pageWidth - margin - 40, currentY + 7, 32, 14, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("ISSUED", pageWidth - margin - 24, currentY + 16, { align: "center" });
  }

  // Demo Dataset Banner if synthetic supplier details used
  if (data.isDemoSupplier) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(234, 88, 12); // orange-600
    doc.text(
      "[PROTOTYPE DEMONSTRATION — SYNTHETIC SUPPLIER DETAILS]",
      margin + 8,
      currentY + 24
    );
  }

  currentY += 34;

  // 3. Invoice Number & Date Bar
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  const invNumberText = data.invoiceNumber || "DRAFT-PREVIEW";
  doc.text(`INVOICE: ${invNumberText}`, margin, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const dateText = data.issueDate
    ? `Issue Date: ${data.issueDate}`
    : `Draft Date: ${data.serviceDate || "2026-10-28"}`;
  doc.text(dateText, pageWidth - margin, currentY, { align: "right" });

  currentY += 6;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 7;

  // 4. Supplier & Client Columns (Properly bounded and dynamically wrapped)
  const contentWidth = pageWidth - margin * 2;
  const colGap = 10;
  const colWidth = (contentWidth - colGap) / 2; // Exactly 82mm
  const leftX = margin;
  const rightX = margin + colWidth + colGap; // 110mm

  // --- Left Column: Supplier ---
  let supplierY = currentY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("FROM (SUPPLIER)", leftX, supplierY);
  supplierY += 4.5;

  // Supplier Name (Strictly wrapped to colWidth)
  const supplierName = data.supplierName || "Matos Technical Solutions Ltd";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const splitSupplierName = doc.splitTextToSize(supplierName, colWidth);
  doc.text(splitSupplierName, leftX, supplierY);
  supplierY += splitSupplierName.length * 4.2 + 1;

  // Supplier Address & Contact (Strictly wrapped to colWidth)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  if (data.supplierAddress && data.supplierAddress.trim() !== "") {
    const splitAddr = doc.splitTextToSize(data.supplierAddress, colWidth);
    doc.text(splitAddr, leftX, supplierY);
    supplierY += splitAddr.length * 3.8 + 1;
  }
  if (data.supplierVatNumber) {
    const splitVat = doc.splitTextToSize(`VAT ID: ${data.supplierVatNumber}`, colWidth);
    doc.text(splitVat, leftX, supplierY);
    supplierY += splitVat.length * 3.8 + 0.5;
  }
  if (data.supplierEmail) {
    const splitEmail = doc.splitTextToSize(`Email: ${data.supplierEmail}`, colWidth);
    doc.text(splitEmail, leftX, supplierY);
    supplierY += splitEmail.length * 3.8 + 0.5;
  }
  if (data.supplierPhone) {
    const splitPhone = doc.splitTextToSize(`Phone: ${data.supplierPhone}`, colWidth);
    doc.text(splitPhone, leftX, supplierY);
    supplierY += splitPhone.length * 3.8 + 0.5;
  }

  // --- Right Column: Client ---
  let clientY = currentY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("BILL TO (CLIENT)", rightX, clientY);
  clientY += 4.5;

  // Client Name (Strictly wrapped to colWidth)
  const clientName = data.clientName || "[Client Name Required]";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const splitClientName = doc.splitTextToSize(clientName, colWidth);
  doc.text(splitClientName, rightX, clientY);
  clientY += splitClientName.length * 4.2 + 1;

  // Client Address & Metadata (Strictly wrapped to colWidth)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  if (data.clientAddress && data.clientAddress.trim() !== "") {
    const splitAddr = doc.splitTextToSize(data.clientAddress, colWidth);
    doc.text(splitAddr, rightX, clientY);
    clientY += splitAddr.length * 3.8 + 1;
  } else {
    doc.setTextColor(156, 163, 175);
    doc.text("(Address not provided)", rightX, clientY);
    clientY += 4.5;
    doc.setTextColor(71, 85, 105);
  }
  if (data.clientEmail) {
    const splitEmail = doc.splitTextToSize(`Email: ${data.clientEmail}`, colWidth);
    doc.text(splitEmail, rightX, clientY);
    clientY += splitEmail.length * 3.8 + 0.5;
  }
  if (data.clientPhone) {
    const splitPhone = doc.splitTextToSize(`Phone: ${data.clientPhone}`, colWidth);
    doc.text(splitPhone, rightX, clientY);
    clientY += splitPhone.length * 3.8 + 0.5;
  }
  if (data.paymentTerms) {
    const splitTerms = doc.splitTextToSize(`Payment Terms: ${data.paymentTerms}`, colWidth);
    doc.text(splitTerms, rightX, clientY);
    clientY += splitTerms.length * 3.8 + 0.5;
  }
  if (data.dueDate) {
    const splitDue = doc.splitTextToSize(`Due Date: ${data.dueDate}`, colWidth);
    doc.text(splitDue, rightX, clientY);
    clientY += splitDue.length * 3.8 + 0.5;
  }

  // Dynamic vertical position derived from tallest column + clearance
  currentY = Math.max(supplierY, clientY) + 6;

  // 5. Line Items Table (with bottom margin reservation for footer)
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
    margin: { left: margin, right: margin, bottom: 28 }, // Leaves 28mm safe zone for footer
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
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
      cellPadding: 3,
      overflow: "linebreak",
    },
    willDrawPage: (hookData) => {
      // Draw watermark on page 2+ before table content is drawn
      if (isDraft && hookData.pageNumber > 1) {
        drawDraftWatermark(doc, pageWidth, pageHeight);
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastTable = (doc as any).lastAutoTable;
  currentY = lastTable ? lastTable.finalY + 7 : currentY + 35;

  // 6. Summary Totals Box & Payment Details
  const totalsBoxWidth = 80;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;
  const payBoxWidth = totalsBoxX - margin - 8;

  // Check if summary and payment details fit on current page; break page if needed
  const requiredSummaryHeight = 38;
  if (currentY + requiredSummaryHeight > pageHeight - 28) {
    doc.addPage();
    if (isDraft) {
      drawDraftWatermark(doc, pageWidth, pageHeight);
    }
    currentY = margin + 8;
  }

  // --- Right: Summary Totals Box ---
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(totalsBoxX, currentY, totalsBoxWidth, 34, "F");
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(totalsBoxX, currentY, totalsBoxWidth, 34, "S");

  doc.setFontSize(8);
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
  doc.text(vatLabel, totalsBoxX + 4, currentY + 15);
  doc.text(
    formatCurrency(data.vatAmountCents, currency),
    pageWidth - margin - 4,
    currentY + 15,
    { align: "right" }
  );

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(totalsBoxX + 4, currentY + 20, pageWidth - margin - 4, currentY + 20);

  // Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("TOTAL DUE:", totalsBoxX + 4, currentY + 28);
  doc.text(
    formatCurrency(data.totalCents, currency),
    pageWidth - margin - 4,
    currentY + 28,
    { align: "right" }
  );

  // --- Left: Payment Details ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("PAYMENT DETAILS & BANK TRANSFER", margin, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  let bankY = currentY + 10;

  if (data.supplierBankName) {
    const splitBank = doc.splitTextToSize(`Bank: ${data.supplierBankName}`, payBoxWidth);
    doc.text(splitBank, margin, bankY);
    bankY += splitBank.length * 3.6;
  }
  if (data.supplierIban) {
    const splitIban = doc.splitTextToSize(`IBAN: ${data.supplierIban}`, payBoxWidth);
    doc.text(splitIban, margin, bankY);
    bankY += splitIban.length * 3.6;
  }
  if (data.supplierBic) {
    const splitBic = doc.splitTextToSize(`BIC / SWIFT: ${data.supplierBic}`, payBoxWidth);
    doc.text(splitBic, margin, bankY);
    bankY += splitBic.length * 3.6;
  }
  if (data.paymentTerms) {
    const splitTerms = doc.splitTextToSize(`Payment Terms: ${data.paymentTerms}`, payBoxWidth);
    doc.text(splitTerms, margin, bankY);
    bankY += splitTerms.length * 3.6;
  }

  currentY = Math.max(currentY + 38, bankY + 4);

  // 7. Notes & Description of Work (Cleanly placed with multi-page handling)
  if (data.notes || data.descriptionOfWork) {
    const notesText = [data.descriptionOfWork, data.notes].filter(Boolean).join(" — ");
    const splitNotes = doc.splitTextToSize(notesText, contentWidth);
    const requiredNotesHeight = splitNotes.length * 3.5 + 8;

    if (currentY + requiredNotesHeight > pageHeight - 28) {
      doc.addPage();
      if (isDraft) {
        drawDraftWatermark(doc, pageWidth, pageHeight);
      }
      currentY = margin + 8;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("NOTES & PROJECT SCOPE:", margin, currentY);
    currentY += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(splitNotes, margin, currentY);
    currentY += splitNotes.length * 3.5 + 4;
  }

  // 8. Document Integrity Footer (Rendered across ALL pages with two distinct, non-overlapping rows)
  const totalPages = doc.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);

    const footerDividerY = pageHeight - margin - 5; // e.g. 297 - 18 - 5 = 274mm
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.35);
    doc.line(margin, footerDividerY, pageWidth - margin, footerDividerY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);

    // Row 1: Legal / Audit Status (Left) & Page Counter (Right)
    const row1Y = footerDividerY + 4;
    if (data.status === "issued" && data.integrityHash) {
      doc.text(
        `ISSUED RECORD • SHA-256 AUDIT DIGEST: ${data.integrityHash}`,
        margin,
        row1Y
      );
    } else {
      doc.text(
        "DRAFT RECORD • Unissued working document. Official numbers and certified values assigned upon issuance.",
        margin,
        row1Y
      );
    }
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, row1Y, {
      align: "right",
    });

    // Row 2: Prototype Branding & Commercial Notice (Vertically distinct, exactly 4mm lower)
    const row2Y = footerDividerY + 8;
    doc.text(
      "Matos VoiceDocs • Mobile Voice-to-Invoice System (Matos Systems)",
      margin,
      row2Y
    );
    doc.text(
      "Demonstration Prototype • Not Certified as a Fiscal Cash Register",
      pageWidth - margin,
      row2Y,
      { align: "right" }
    );
  }

  return doc;
}
