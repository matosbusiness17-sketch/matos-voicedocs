import { z } from "zod";

export const ExtractedLineItemSchema = z.object({
  description: z.string().describe("Description of the service, labor, or material item"),
  quantity: z.number().default(1).describe("Quantity or units (e.g. 1, 2.5, 40)"),
  unitPriceCents: z.number().describe("Unit price in integer minor currency units (cents or pence, e.g. 75000 for 750.00)"),
});

export const ExtractedInvoiceSchema = z.object({
  clientName: z.string().nullable().describe("Client or business name if mentioned; null if missing"),
  clientAddress: z.string().nullable().describe("Client address if mentioned; null if missing"),
  clientEmail: z.string().nullable().describe("Client email if mentioned; null if missing"),
  clientPhone: z.string().nullable().describe("Client phone number if mentioned; null if missing"),
  
  serviceDate: z.string().nullable().describe("Date work was performed (YYYY-MM-DD or spoken text); null if missing"),
  dueDate: z.string().nullable().describe("Explicit payment due date (YYYY-MM-DD or spoken text); null if missing"),
  paymentTerms: z.string().nullable().describe("Payment terms spoken, e.g. '14 days', 'due upon receipt', '30 days'; null if missing. DO NOT default to 30 days if not spoken."),
  
  currency: z.enum(["EUR", "GBP"]).default("EUR").describe("Currency detected from context (EUR or GBP)"),
  
  descriptionOfWork: z.string().nullable().describe("Overall description or scope of work completed"),
  lineItems: z.array(ExtractedLineItemSchema).describe("Line items explicitly mentioned with quantities and unit prices"),
  
  spokenTotalCents: z.number().nullable().describe("The total amount explicitly stated/claimed by the speaker in integer minor units (cents/pence), e.g. 208500 for £2,085. Null if speaker did not state an overall total."),
  
  isVatRegistered: z.boolean().default(true).describe("Whether VAT applies or is mentioned"),
  vatRatePercent: z.number().default(18).describe("VAT rate percentage if mentioned or standard Malta 18% / UK 20%"),
  isVatInclusive: z.boolean().default(false).describe("True if speaker stated prices are VAT-inclusive / include VAT; false otherwise"),
  
  notes: z.string().nullable().describe("Any additional customer notes or warranties mentioned"),
  
  missingFields: z.array(z.string()).describe("List of critical invoice fields not found in transcript (e.g. 'Client address', 'Due date')"),
  ambiguities: z.array(z.string()).describe("List of any ambiguous details needing user verification"),
});

export type ExtractedInvoice = z.infer<typeof ExtractedInvoiceSchema>;
export type ExtractedLineItem = z.infer<typeof ExtractedLineItemSchema>;
