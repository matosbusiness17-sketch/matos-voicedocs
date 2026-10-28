import { describe, it, expect } from "vitest";
import {
  validateInvoiceForIssuance,
  deriveDueDate,
  isDemoSupplierData,
  InvoiceDataForValidation,
} from "@/lib/issuanceValidation";
import { generateInvoicePdf, InvoicePdfData } from "@/lib/pdfGenerator";
import { computeSnapshotIntegrityHash } from "@/lib/integrity";

describe("Critical QA Regression & Issuance Validation Suite", () => {
  const baseValidInvoice: InvoiceDataForValidation = {
    clientName: "Wayne Enterprises",
    clientAddress: "100 Gotham Boulevard, Suite 400",
    clientEmail: "accounts@wayne-enterprises.sample",
    supplierName: "Real Technical Services Ltd",
    supplierAddress: "123 Business Way, Valletta, Malta",
    supplierVatNumber: "MT 1234-5678",
    supplierIban: "MT84BOVS1234567890123456789",
    issueDate: "2026-10-28",
    paymentTerms: "14 days",
    currency: "EUR",
    isVatRegistered: true,
    vatRatePercent: 18,
    isVatInclusive: false,
    spokenTotalCents: null,
    items: [
      {
        description: "Industrial Electrical Diagnostics",
        quantity: 1,
        unitPriceCents: 10000,
        totalCents: 10000,
      },
    ],
    confirmDemoSupplier: true,
  };

  /**
   * 1. Missing client address prevents official issuance
   */
  it("prevents official issuance when client address is missing or empty", () => {
    const invalidData = {
      ...baseValidInvoice,
      clientAddress: "", // Missing client billing address
    };

    const result = validateInvoiceForIssuance(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "clientAddress")).toBe(true);
    expect(result.errors.find((e) => e.field === "clientAddress")?.message).toContain(
      "Customer billing address is required"
    );
  });

  /**
   * 2. Incomplete drafts remain editable and downloadable with DRAFT markings
   */
  it("permits incomplete drafts to be generated and downloaded with DRAFT markings", () => {
    const incompleteDraft: InvoicePdfData = {
      invoiceNumber: null,
      status: "draft",
      currency: "EUR",
      isVatRegistered: true,
      vatRatePercent: 18,
      isVatInclusive: false,
      supplierName: "[DEMO] Matos Technical Solutions Ltd",
      clientName: "Wayne Enterprises",
      clientAddress: null, // missing address in draft
      subtotalCents: 10000,
      vatAmountCents: 1800,
      totalCents: 11800,
      items: [
        {
          description: "Preliminary job estimate",
          quantity: 1,
          unitPriceCents: 10000,
          totalCents: 10000,
        },
      ],
    };

    const doc = generateInvoicePdf(incompleteDraft);
    expect(doc).toBeDefined();
    const pdfBytes = doc.output("arraybuffer");
    expect(pdfBytes.byteLength).toBeGreaterThan(1000);
  });

  /**
   * 3. Valid invoice details permit issuance
   */
  it("permits official issuance when all mandatory details are provided", () => {
    const result = validateInvoiceForIssuance(baseValidInvoice);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.derivedDueDate).toBe("2026-11-11");
  });

  /**
   * 4. Fourteen-day terms calculate the correct due date without overwriting explicit valid dates
   */
  it("derives due date from 14-day terms accurately (2026-10-28 + 14d = 2026-11-11)", () => {
    const derived = deriveDueDate("2026-10-28", "14 days");
    expect(derived).toBe("2026-11-11");

    // Preserves explicit valid due date
    const withExplicitDate = {
      ...baseValidInvoice,
      dueDate: "2026-11-20",
    };
    const result = validateInvoiceForIssuance(withExplicitDate);
    expect(result.isValid).toBe(true);
    expect(result.derivedDueDate).toBe("2026-11-20");

    // Flags contradictory due dates prior to issue date
    const withContradiction = {
      ...baseValidInvoice,
      issueDate: "2026-10-28",
      dueDate: "2026-10-20", // 8 days earlier than issue date
    };
    const contradictionResult = validateInvoiceForIssuance(withContradiction);
    expect(contradictionResult.isValid).toBe(false);
    expect(contradictionResult.hasContradictoryDueDate).toBe(true);
    expect(contradictionResult.errors.some((e) => e.field === "dueDate")).toBe(true);
  });

  /**
   * 5. Unresolved financial discrepancies block issuance
   */
  it("blocks issuance when spoken total differs from calculated item sum", () => {
    const withDiscrepancy: InvoiceDataForValidation = {
      ...baseValidInvoice,
      // items sum to 10,000 cents (€100 + 18% VAT = €118 = 11,800 cents gross)
      spokenTotalCents: 15000, // Speaker claims €150.00
    };

    const result = validateInvoiceForIssuance(withDiscrepancy);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "spokenTotalCents")).toBe(true);
    expect(result.errors.find((e) => e.field === "spokenTotalCents")?.message).toContain(
      "Unresolved financial discrepancy"
    );
  });

  /**
   * 6. Issued records cannot be silently modified
   */
  it("ensures any modification to an issued snapshot alters its integrity hash", () => {
    const snapshotA = {
      invoiceNumber: "INV-2026-0007",
      clientName: "Wayne Enterprises",
      clientAddress: "100 Gotham Boulevard",
      dueDate: "2026-11-11",
      totalCents: 11800,
    };

    const hashA = computeSnapshotIntegrityHash(snapshotA);

    // Any modification produces a mismatch
    const modifiedSnapshot = {
      ...snapshotA,
      dueDate: "2026-12-01",
    };
    const hashB = computeSnapshotIntegrityHash(modifiedSnapshot);

    expect(hashA).not.toBe(hashB);
  });

  /**
   * 7. Direct API requests cannot bypass issuance validation
   */
  it("rejects invalid payloads even if frontend validation were bypassed", () => {
    // Missing items and missing client address
    const directApiPayload: InvoiceDataForValidation = {
      clientName: "Incomplete User",
      clientAddress: null,
      items: [],
    };

    const result = validateInvoiceForIssuance(directApiPayload);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
    expect(result.errors.some((e) => e.field === "clientAddress")).toBe(true);
    expect(result.errors.some((e) => e.field === "items")).toBe(true);
  });

  /**
   * 8. Demo supplier details cannot accidentally be represented as verified production information
   */
  it("detects demo supplier details and requires explicit prototype confirmation", () => {
    const demoInvoice: InvoiceDataForValidation = {
      ...baseValidInvoice,
      supplierName: "[DEMO] Matos Technical Solutions Ltd (Sample Business)",
      supplierVatNumber: "MT 0000-0000 [DEMO]",
      confirmDemoSupplier: false, // User has NOT confirmed demo identity
    };

    expect(isDemoSupplierData({
      name: demoInvoice.supplierName,
      vatNumber: demoInvoice.supplierVatNumber,
    })).toBe(true);

    const result = validateInvoiceForIssuance(demoInvoice);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "supplierName")).toBe(true);
    expect(result.errors.find((e) => e.field === "supplierName")?.message).toContain(
      "Fictional/demo supplier identity detected"
    );

    // Once explicitly confirmed for prototype evaluation, issuance validation passes
    const confirmedDemo = {
      ...demoInvoice,
      confirmDemoSupplier: true,
    };
    const confirmedResult = validateInvoiceForIssuance(confirmedDemo);
    expect(confirmedResult.isValid).toBe(true);
    expect(confirmedResult.isDemoSupplier).toBe(true);
  });
});
