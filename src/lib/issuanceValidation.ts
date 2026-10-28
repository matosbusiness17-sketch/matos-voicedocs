import { calculateInvoiceTotals, checkSpokenDiscrepancy, CurrencyCode } from "./calculations";

export interface ItemForValidation {
  description: string;
  quantity: number | string;
  unitPriceCents: number;
  totalCents?: number;
}

export interface InvoiceDataForValidation {
  id?: string;
  clientName?: string | null;
  clientAddress?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;

  supplierName?: string | null;
  supplierAddress?: string | null;
  supplierEmail?: string | null;
  supplierPhone?: string | null;
  supplierVatNumber?: string | null;
  supplierBankName?: string | null;
  supplierIban?: string | null;
  supplierBic?: string | null;

  issueDate?: string | null;
  serviceDate?: string | null;
  dueDate?: string | null;
  paymentTerms?: string | null;
  currency?: CurrencyCode | string | null;

  isVatRegistered?: boolean;
  vatRatePercent?: number | string;
  isVatInclusive?: boolean;

  spokenTotalCents?: number | null;
  items: ItemForValidation[];

  // Demo confirmation flag
  confirmDemoSupplier?: boolean;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export interface IssuanceValidationResult {
  isValid: boolean;
  errors: ValidationErrorDetail[];
  derivedDueDate: string | null;
  isDemoSupplier: boolean;
  hasContradictoryDueDate: boolean;
  contradictionMessage: string | null;
}

/**
 * Checks whether the supplier information contains synthetic demo/placeholder details.
 */
export function isDemoSupplierData(supplier: {
  name?: string | null;
  vatNumber?: string | null;
  iban?: string | null;
  address?: string | null;
}): boolean {
  const name = (supplier.name || "").toLowerCase();
  const vat = (supplier.vatNumber || "").toLowerCase();
  const iban = (supplier.iban || "").toLowerCase();
  const address = (supplier.address || "").toLowerCase();

  return (
    name.includes("demo") ||
    name.includes("sample") ||
    vat.includes("demo") ||
    vat.includes("0000-0000") ||
    vat.includes("2458-9912") || // original placeholder
    iban.includes("demo") ||
    iban.includes("0000000001234567890") ||
    address.includes("demo") ||
    address.includes("sample")
  );
}

/**
 * Derives a due date from an issue date and payment terms string.
 * Example: issueDate = "2026-10-28", paymentTerms = "14 days" => "2026-11-11"
 */
export function deriveDueDate(
  issueDateStr: string,
  paymentTerms: string | null | undefined
): string | null {
  if (!issueDateStr || !paymentTerms) return null;

  const terms = paymentTerms.trim().toLowerCase();
  const issueDate = new Date(issueDateStr);
  if (isNaN(issueDate.getTime())) return null;

  // Match "X days" or "X day"
  const daysMatch = terms.match(/^(\d+)\s*days?$/i);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + days);
    return dueDate.toISOString().split("T")[0];
  }

  // Match "X weeks"
  const weeksMatch = terms.match(/^(\d+)\s*weeks?$/i);
  if (weeksMatch) {
    const weeks = parseInt(weeksMatch[1], 10);
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + weeks * 7);
    return dueDate.toISOString().split("T")[0];
  }

  // Match "due upon receipt" or "immediate"
  if (terms.includes("upon receipt") || terms.includes("immediate")) {
    return issueDateStr;
  }

  // Match "X months" or "end of month"
  const monthsMatch = terms.match(/^(\d+)\s*months?$/i);
  if (monthsMatch) {
    const months = parseInt(monthsMatch[1], 10);
    const dueDate = new Date(issueDate);
    dueDate.setMonth(dueDate.getMonth() + months);
    return dueDate.toISOString().split("T")[0];
  }

  return null;
}

/**
 * Centralized, rigorous issuance validation function.
 * Shared by both the frontend invoice editor/preview and server-side issuance route.
 */
export function validateInvoiceForIssuance(
  data: InvoiceDataForValidation
): IssuanceValidationResult {
  const errors: ValidationErrorDetail[] = [];

  // 1. Mandatory Customer / Client Information
  if (!data.clientName || data.clientName.trim() === "") {
    errors.push({
      field: "clientName",
      message: "Customer name is mandatory for official invoice issuance.",
    });
  }

  // CRITICAL QA REQUIREMENT: For standard invoices, require client billing address
  if (!data.clientAddress || data.clientAddress.trim() === "") {
    errors.push({
      field: "clientAddress",
      message:
        "Customer billing address is required before official issuance. Incomplete customer details cannot be certified on an official tax invoice.",
    });
  }

  // 2. Mandatory Supplier Information
  if (!data.supplierName || data.supplierName.trim() === "") {
    errors.push({
      field: "supplierName",
      message: "Supplier business name is required.",
    });
  }

  if (!data.supplierAddress || data.supplierAddress.trim() === "") {
    errors.push({
      field: "supplierAddress",
      message: "Supplier business address is required.",
    });
  }

  // 3. Line Items Validation
  if (!data.items || data.items.length === 0) {
    errors.push({
      field: "items",
      message: "Invoice must contain at least one line item.",
    });
  } else {
    data.items.forEach((item, index) => {
      if (!item.description || item.description.trim() === "") {
        errors.push({
          field: `items[${index}].description`,
          message: `Line item #${index + 1} requires a valid description.`,
        });
      }
      const qty = typeof item.quantity === "number" ? item.quantity : parseFloat(String(item.quantity));
      if (isNaN(qty) || qty <= 0) {
        errors.push({
          field: `items[${index}].quantity`,
          message: `Line item #${index + 1} quantity must be greater than zero.`,
        });
      }
      if (typeof item.unitPriceCents !== "number" || isNaN(item.unitPriceCents) || item.unitPriceCents < 0) {
        errors.push({
          field: `items[${index}].unitPriceCents`,
          message: `Line item #${index + 1} unit price cannot be negative.`,
        });
      }
    });
  }

  // 4. Financial Calculations & Discrepancy Checks
  const currency: CurrencyCode = data.currency === "GBP" ? "GBP" : "EUR";
  const vatRate = typeof data.vatRatePercent === "number" ? data.vatRatePercent : parseFloat(String(data.vatRatePercent)) || 0;

  const totals = calculateInvoiceTotals(
    data.items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPriceCents: it.unitPriceCents,
    })),
    {
      isVatRegistered: !!data.isVatRegistered,
      vatRatePercent: vatRate,
      isVatInclusive: !!data.isVatInclusive,
    }
  );

  if (totals.totalCents <= 0) {
    errors.push({
      field: "totalCents",
      message: "Invoice total must be greater than zero.",
    });
  }

  // Spoken Discrepancy (Mandatory Test B)
  const discrepancy = checkSpokenDiscrepancy(totals.totalCents, data.spokenTotalCents, currency);
  if (discrepancy.hasDiscrepancy) {
    errors.push({
      field: "spokenTotalCents",
      message: `Unresolved financial discrepancy: ${discrepancy.message}`,
    });
  }

  // 5. Issue Date and Payment Terms & Due Date Derivation
  const issueDateStr = data.issueDate || "2026-10-28";
  let finalDueDate = data.dueDate && data.dueDate.trim() !== "" ? data.dueDate.trim() : null;
  let hasContradictoryDueDate = false;
  let contradictionMessage: string | null = null;

  if (finalDueDate) {
    // Validate that explicit dueDate is not earlier than issueDate
    if (finalDueDate < issueDateStr) {
      hasContradictoryDueDate = true;
      contradictionMessage = `Explicit payment due date (${finalDueDate}) cannot precede the invoice issue date (${issueDateStr}).`;
      errors.push({
        field: "dueDate",
        message: contradictionMessage,
      });
    }
  } else if (data.paymentTerms && data.paymentTerms.trim() !== "") {
    // Automatically derive due date from payment terms (e.g. 14 days)
    const derived = deriveDueDate(issueDateStr, data.paymentTerms);
    if (derived) {
      finalDueDate = derived;
    } else {
      errors.push({
        field: "dueDate",
        message: `Could not automatically determine payment due date from terms "${data.paymentTerms}". Please specify a due date.`,
      });
    }
  } else {
    errors.push({
      field: "paymentTerms",
      message: "Payment terms or explicit payment due date must be specified before issuance.",
    });
  }

  // 6. Demo Supplier Data Guard
  const isDemoSupplier = isDemoSupplierData({
    name: data.supplierName,
    vatNumber: data.supplierVatNumber,
    iban: data.supplierIban,
    address: data.supplierAddress,
  });

  if (isDemoSupplier && !data.confirmDemoSupplier) {
    errors.push({
      field: "supplierName",
      message:
        "Fictional/demo supplier identity detected. You must confirm usage of synthetic demonstration details before proceeding with prototype issuance.",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    derivedDueDate: finalDueDate,
    isDemoSupplier,
    hasContradictoryDueDate,
    contradictionMessage,
  };
}
