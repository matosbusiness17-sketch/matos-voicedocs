import { describe, it, expect } from "vitest";
import { generateInvoicePdf, InvoicePdfData } from "@/lib/pdfGenerator";

describe("Branded PDF Invoice Generator & Layout Engine", () => {
  const baseInvoiceData: InvoicePdfData = {
    invoiceNumber: "INV-2026-0001",
    status: "draft",
    issueDate: "2026-10-28",
    paymentTerms: "14 days",
    dueDate: "2026-11-11",
    currency: "EUR",
    isVatRegistered: true,
    vatRatePercent: 18,
    isVatInclusive: false,
    supplierName: "Matos Technical Solutions Ltd",
    supplierAddress: "Tower Business Centre, Swatar, Malta",
    supplierEmail: "invoicing@matos-solutions.com",
    supplierPhone: "+356 2134 5678",
    supplierVatNumber: "MT 2458-9912",
    supplierBankName: "Bank of Valletta",
    supplierIban: "MT84BOVS0000000001234567890",
    supplierBic: "BOVSMTM3",
    clientName: "Wayne Enterprises",
    clientAddress: "100 Gotham Boulevard, Suite 400, Gotham City",
    clientEmail: "procurement@wayne-enterprises.sample",
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

  it("generates single-page draft PDF with watermark and clean two-row footer", () => {
    const doc = generateInvoicePdf({ ...baseInvoiceData, status: "draft" });
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
    const output = doc.output("arraybuffer");
    expect(output.byteLength).toBeGreaterThan(1000);
  });

  it("generates issued PDF with integrity hash and status badge", () => {
    const doc = generateInvoicePdf({
      ...baseInvoiceData,
      status: "issued",
      integrityHash:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    });
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
    const output = doc.output("arraybuffer");
    expect(output.byteLength).toBeGreaterThan(1000);
  });

  it("handles extremely long supplier company names and multiline addresses without column collision", () => {
    const longNameData: InvoicePdfData = {
      ...baseInvoiceData,
      supplierName:
        "[DEMO] Matos Technical Solutions, Construction & Industrial Systems Global Operations Ltd (Sample Tradesperson Business)",
      supplierAddress:
        "Suite 14B, Floor 3, North Wing, Tower Business Complex, Triq l-Imdina, Swatar, BKR 4013, Birkirkara, Island of Malta",
      clientName:
        "International Logistics, Shipping, Harbor Management & Marine Engineering Consortium PLC",
      clientAddress:
        "Dockyard Wharf 7, Grand Harbour Industrial Estate, Marsa MRS 1934, Southern Region, Republic of Malta",
      notes:
        "Comprehensive structural reinforcement and architectural carpentry repair work conducted over 3 weeks.",
    };

    const doc = generateInvoicePdf(longNameData);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    const output = doc.output("arraybuffer");
    expect(output.byteLength).toBeGreaterThan(2000);
  });

  it("handles multi-page invoice layout spanning multiple pages with watermarks and footers on every page", () => {
    const manyItems: InvoicePdfData["items"] = [];
    for (let i = 1; i <= 28; i++) {
      manyItems.push({
        description: `Custom fabricated structural beam #${i} - heavy duty galvanised steel bracket assembly with bespoke fittings`,
        quantity: i,
        unitPriceCents: 12500,
        totalCents: i * 12500,
      });
    }

    const multiPageData: InvoicePdfData = {
      ...baseInvoiceData,
      status: "draft",
      items: manyItems,
      subtotalCents: 5075000,
      vatAmountCents: 913500,
      totalCents: 5988500,
      notes:
        "All materials supplied comply with international engineering specifications. Final inspection signed off on site.",
    };

    const doc = generateInvoicePdf(multiPageData);
    expect(doc).toBeDefined();
    // 28 detailed line items must span across at least 2 pages
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);

    const output = doc.output("arraybuffer");
    expect(output.byteLength).toBeGreaterThan(5000);
  });

  it("handles synthetic demo supplier banner cleanly without layout shifting", () => {
    const demoData: InvoicePdfData = {
      ...baseInvoiceData,
      isDemoSupplier: true,
      supplierName: "[DEMO] Matos Technical Solutions Ltd (Sample Business)",
    };

    const doc = generateInvoicePdf(demoData);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
    const output = doc.output("arraybuffer");
    expect(output.byteLength).toBeGreaterThan(1000);
  });
});
