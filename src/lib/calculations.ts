export type CurrencyCode = "EUR" | "GBP";

export interface LineItemData {
  id?: string;
  description: string;
  quantity: number | string;
  unitPriceCents: number;
  totalCents?: number;
}

export interface VatCalculationOptions {
  isVatRegistered: boolean;
  vatRatePercent: number; // e.g. 18 for 18%
  isVatInclusive: boolean;
}

export interface InvoiceCalculatedTotals {
  subtotalCents: number;
  vatAmountCents: number;
  totalCents: number;
  netCents: number;
  grossCents: number;
  isVatInclusive: boolean;
  vatRatePercent: number;
  isVatRegistered: boolean;
}

export interface DiscrepancyCheckResult {
  hasDiscrepancy: boolean;
  differenceCents: number;
  spokenTotalCents: number | null;
  calculatedTotalCents: number;
  message: string | null;
}

/**
 * Standard rounding to nearest integer minor unit (cents/pence) using half-up rule.
 */
export function roundToCents(amount: number): number {
  return Math.round(amount);
}

/**
 * Parses user or AI input into integer cents.
 * Handles strings like "750", "1085.50", "€1,880.00", "£45"
 */
export function parseToCents(val: number | string | null | undefined): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") {
    return Math.round(val);
  }
  // Strip currency symbols and commas
  const cleaned = val.replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Formats integer cents to display string with currency symbol.
 */
export function formatCurrency(
  cents: number | null | undefined,
  currency: CurrencyCode = "EUR"
): string {
  const safeCents = typeof cents === "number" && !isNaN(cents) ? cents : 0;
  const major = safeCents / 100;
  const symbol = currency === "GBP" ? "£" : "€";
  return `${symbol}${major.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Calculates a line item's total in integer minor currency units.
 */
export function calculateLineItemTotal(
  quantity: number | string,
  unitPriceCents: number
): number {
  const qty = typeof quantity === "number" ? quantity : parseFloat(String(quantity)) || 0;
  return Math.round(qty * unitPriceCents);
}

/**
 * Deterministic VAT and subtotal calculation engine.
 * Never relies on LLM arithmetic.
 */
export function calculateInvoiceTotals(
  items: LineItemData[],
  options: VatCalculationOptions
): InvoiceCalculatedTotals {
  const { isVatRegistered, vatRatePercent, isVatInclusive } = options;

  // Calculate sum of line item totals
  const lineItemsSumCents = items.reduce((sum, item) => {
    const itemTotal =
      typeof item.totalCents === "number"
        ? item.totalCents
        : calculateLineItemTotal(item.quantity, item.unitPriceCents);
    return sum + itemTotal;
  }, 0);

  if (!isVatRegistered || vatRatePercent <= 0) {
    return {
      subtotalCents: lineItemsSumCents,
      vatAmountCents: 0,
      totalCents: lineItemsSumCents,
      netCents: lineItemsSumCents,
      grossCents: lineItemsSumCents,
      isVatInclusive: false,
      vatRatePercent: 0,
      isVatRegistered: false,
    };
  }

  const rateFactor = vatRatePercent / 100;

  if (isVatInclusive) {
    // Pricing is VAT-inclusive (Gross = lineItemsSum)
    // Net = round(Gross / (1 + rate))
    // VAT = Gross - Net
    const grossCents = lineItemsSumCents;
    const netCents = Math.round(grossCents / (1 + rateFactor));
    const vatAmountCents = grossCents - netCents;

    return {
      subtotalCents: netCents, // Standard accounting convention: subtotal = net
      vatAmountCents,
      totalCents: grossCents,
      netCents,
      grossCents,
      isVatInclusive: true,
      vatRatePercent,
      isVatRegistered: true,
    };
  } else {
    // Pricing is VAT-exclusive (Net = lineItemsSum)
    // VAT = round(Net * rate)
    // Gross = Net + VAT
    const netCents = lineItemsSumCents;
    const vatAmountCents = Math.round(netCents * rateFactor);
    const grossCents = netCents + vatAmountCents;

    return {
      subtotalCents: netCents,
      vatAmountCents,
      totalCents: grossCents,
      netCents,
      grossCents,
      isVatInclusive: false,
      vatRatePercent,
      isVatRegistered: true,
    };
  }
}

/**
 * Checks for discrepancies between the speaker's claimed total and calculated total.
 */
export function checkSpokenDiscrepancy(
  calculatedTotalCents: number,
  spokenTotalCents: number | null | undefined,
  currency: CurrencyCode = "EUR"
): DiscrepancyCheckResult {
  if (spokenTotalCents === null || spokenTotalCents === undefined) {
    return {
      hasDiscrepancy: false,
      differenceCents: 0,
      spokenTotalCents: null,
      calculatedTotalCents,
      message: null,
    };
  }

  const diff = spokenTotalCents - calculatedTotalCents;

  if (diff !== 0) {
    const absDiff = Math.abs(diff);
    const spokenFormatted = formatCurrency(spokenTotalCents, currency);
    const calcFormatted = formatCurrency(calculatedTotalCents, currency);
    const diffFormatted = formatCurrency(absDiff, currency);

    const message = `Spoken total (${spokenFormatted}) does not match calculated total (${calcFormatted}). Discrepancy of ${diffFormatted} must be resolved before issuance.`;

    return {
      hasDiscrepancy: true,
      differenceCents: diff,
      spokenTotalCents,
      calculatedTotalCents,
      message,
    };
  }

  return {
    hasDiscrepancy: false,
    differenceCents: 0,
    spokenTotalCents,
    calculatedTotalCents,
    message: null,
  };
}
