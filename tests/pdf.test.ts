import { describe, it, expect } from "vitest";
import { generateInvoicePdf, InvoicePdfData } from "@/lib/pdfGenerator";

describe("Branded PDF Invoice Generator", () => {
  const baseInvoiceData: InvoicePdfData = {
    invoiceNumber: "INV-2026-0001",
    status: "draft",
    issueDate: "2026-10-28",
    paymentTerms: "14 days",
    currency: "EUR",
    isVatRegistered: true,
    vatRatePercent: 18,
    isVatInclusive: false,
    supplierName: "Matos Technical Solutions Ltd",
    supplierAddress: "Tower Business Centre, Swatar, Malta",
    supplierEmail: "invoicing@matos-solutions.com",
    supplierVatNumber: "MT 2458-9912",
    clientName: "Wayne Enterprises",
    clientAddress: "100 Gotham Boulevard",
    subtotalCents: 10000,
    vatAmountCents: 1800,
    totalCents: 11800,
    items: [
      {
        description: "Electrical installation & testing",
        quantity: 1,
        unitPriceCents: 10000,
        totalCents: 10000,
      },
    ],
  };

  it("generates draft PDF with watermark successfully", () => {
    const doc = generateInvoicePdf({ ...baseInvoiceData, status: "draft" });
    expect(doc).toBeDefined();
    const output = doc.output("arraybuffer");
    expect(output.byteLength).toBeGreaterThan(1000);
  });

  it("generates issued PDF with integrity hash footer successfully", () => {
    const doc = generateInvoicePdf({
      ...baseInvoiceData,
      status: "issued",
      integrityHash:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    });
    expect(doc).toBeDefined();
    const output = doc.output("arraybuffer");
    expect(output.byteLength).toBeGreaterThan(1000);
  });
});
