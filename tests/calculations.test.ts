import { describe, it, expect } from "vitest";
import {
  calculateInvoiceTotals,
  checkSpokenDiscrepancy,
  formatCurrency,
  parseToCents,
  roundToCents,
} from "@/lib/calculations";

describe("Deterministic Financial Calculations Engine", () => {
  /**
   * MANDATORY TEST SCENARIO A: Correct arithmetic
   * Labor £750, materials £1,085, waste disposal £45.
   * Expected total: £1,880 without VAT.
   */
  it("Test A: Correct arithmetic (£750 + £1,085 + £45 = £1,880 without VAT)", () => {
    const items = [
      { description: "Labor", quantity: 1, unitPriceCents: 75000 },
      { description: "Materials", quantity: 1, unitPriceCents: 108500 },
      { description: "Waste disposal", quantity: 1, unitPriceCents: 4500 },
    ];

    const result = calculateInvoiceTotals(items, {
      isVatRegistered: false,
      vatRatePercent: 0,
      isVatInclusive: false,
    });

    expect(result.subtotalCents).toBe(188000);
    expect(result.vatAmountCents).toBe(0);
    expect(result.totalCents).toBe(188000);
    expect(formatCurrency(result.totalCents, "GBP")).toBe("£1,880.00");
  });

  /**
   * MANDATORY TEST SCENARIO B: Spoken discrepancy
   * Same line items, but speaker claims £2,085.
   * Must flag a £205 discrepancy and prevent issuance until resolved.
   */
  it("Test B: Spoken discrepancy flags £205 discrepancy and signals issue blocking", () => {
    const items = [
      { description: "Labor", quantity: 1, unitPriceCents: 75000 },
      { description: "Materials", quantity: 1, unitPriceCents: 108500 },
      { description: "Waste disposal", quantity: 1, unitPriceCents: 4500 },
    ];

    const totals = calculateInvoiceTotals(items, {
      isVatRegistered: false,
      vatRatePercent: 0,
      isVatInclusive: false,
    });

    // Calculated total: £1,880 (188,000 cents)
    expect(totals.totalCents).toBe(188000);

    // Speaker claims £2,085 (208,500 cents)
    const spokenTotalCents = 208500;
    const discrepancy = checkSpokenDiscrepancy(totals.totalCents, spokenTotalCents, "GBP");

    expect(discrepancy.hasDiscrepancy).toBe(true);
    expect(discrepancy.differenceCents).toBe(20500); // 20,500 cents = £205.00
    expect(discrepancy.message).toContain("£205.00");
    expect(discrepancy.message).toContain("must be resolved before issuance");
  });

  /**
   * MANDATORY TEST SCENARIO C: VAT included
   * Valid 18% VAT-inclusive gross amount of €118 yields net €100 and VAT €18.
   */
  it("Test C: 18% VAT-inclusive gross €118 yields net €100 and VAT €18", () => {
    const items = [
      { description: "Consulting & Installation", quantity: 1, unitPriceCents: 11800 },
    ];

    const result = calculateInvoiceTotals(items, {
      isVatRegistered: true,
      vatRatePercent: 18,
      isVatInclusive: true,
    });

    expect(result.netCents).toBe(10000); // €100.00 net
    expect(result.vatAmountCents).toBe(1800); // €18.00 VAT
    expect(result.totalCents).toBe(11800); // €118.00 gross total
    expect(result.netCents + result.vatAmountCents).toBe(result.totalCents);
    expect(formatCurrency(result.netCents, "EUR")).toBe("€100.00");
    expect(formatCurrency(result.vatAmountCents, "EUR")).toBe("€18.00");
    expect(formatCurrency(result.totalCents, "EUR")).toBe("€118.00");
  });

  it("calculates VAT-exclusive correctly (e.g. €100 + 18% VAT = €118)", () => {
    const items = [
      { description: "Electrical work", quantity: 1, unitPriceCents: 10000 },
    ];

    const result = calculateInvoiceTotals(items, {
      isVatRegistered: true,
      vatRatePercent: 18,
      isVatInclusive: false,
    });

    expect(result.netCents).toBe(10000);
    expect(result.vatAmountCents).toBe(1800);
    expect(result.totalCents).toBe(11800);
  });

  it("handles decimal quantities accurately", () => {
    const items = [
      { description: "Hourly labor", quantity: 2.5, unitPriceCents: 5000 }, // 2.5 * 50 = 125.00
    ];

    const result = calculateInvoiceTotals(items, {
      isVatRegistered: false,
      vatRatePercent: 0,
      isVatInclusive: false,
    });

    expect(result.totalCents).toBe(12500);
  });
});
