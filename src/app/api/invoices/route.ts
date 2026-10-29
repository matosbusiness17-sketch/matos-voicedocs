import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems } from "@/db/schema";
import { desc } from "drizzle-orm";
import { calculateInvoiceTotals, checkSpokenDiscrepancy } from "@/lib/calculations";
import { z } from "zod";

const ItemSchema = z.object({
  description: z.string().min(1, "Item description is required"),
  quantity: z.union([z.number(), z.string()]).default(1),
  unitPriceCents: z.number().int().min(0),
});

const CreateInvoiceSchema = z.object({
  invoiceNumber: z.string().optional().nullable(),
  clientName: z.string().min(1, "Client name is required"),
  clientAddress: z.string().optional().nullable(),
  clientEmail: z.string().email().optional().nullable().or(z.literal("")),
  clientPhone: z.string().optional().nullable(),
  serviceDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  currency: z.enum(["EUR", "GBP"]).default("EUR"),
  
  isVatRegistered: z.boolean().default(true),
  vatRatePercent: z.coerce.number().default(18),
  isVatInclusive: z.boolean().default(false),
  vatExemptReason: z.string().optional().nullable(),

  supplierName: z.string().default("Matos Technical Solutions Ltd"),
  supplierAddress: z.string().optional().nullable(),
  supplierEmail: z.string().optional().nullable(),
  supplierPhone: z.string().optional().nullable(),
  supplierVatNumber: z.string().optional().nullable(),
  supplierBankName: z.string().optional().nullable(),
  supplierIban: z.string().optional().nullable(),
  supplierBic: z.string().optional().nullable(),

  descriptionOfWork: z.string().optional().nullable(),
  spokenTotalCents: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
  rawTranscript: z.string().optional().nullable(),
  missingFields: z.array(z.string()).optional().default([]),
  
  items: z.array(ItemSchema).min(1, "At least one line item is required"),
});

export async function GET() {
  try {
    const allInvoices = await db.query.invoices.findMany({
      orderBy: [desc(invoices.updatedAt)],
      with: {
        items: {
          orderBy: [invoiceItems.position],
        },
      },
    });

    return NextResponse.json({
      success: true,
      invoices: allInvoices,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Failed to fetch invoices:", errorMsg);
    return NextResponse.json(
      { success: false, error: "Database error fetching invoices." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateInvoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues.map((i) => i.message).join(", "),
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Deterministically calculate totals
    const calculated = calculateInvoiceTotals(
      data.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPriceCents: it.unitPriceCents,
      })),
      {
        isVatRegistered: data.isVatRegistered,
        vatRatePercent: data.vatRatePercent,
        isVatInclusive: data.isVatInclusive,
      }
    );

    const discrepancy = checkSpokenDiscrepancy(
      calculated.totalCents,
      data.spokenTotalCents,
      data.currency
    );

    // Insert invoice
    const [insertedInvoice] = await db
      .insert(invoices)
      .values({
        invoiceNumber: data.invoiceNumber || null,
        status: "draft",
        clientName: data.clientName,
        clientAddress: data.clientAddress || null,
        clientEmail: data.clientEmail || null,
        clientPhone: data.clientPhone || null,
        serviceDate: data.serviceDate || null,
        dueDate: data.dueDate || null,
        paymentTerms: data.paymentTerms || "14 days",
        currency: data.currency,
        isVatRegistered: data.isVatRegistered,
        vatRatePercent: data.vatRatePercent.toString(),
        isVatInclusive: data.isVatInclusive,
        vatExemptReason: data.vatExemptReason || null,
        supplierName: data.supplierName,
        supplierAddress: data.supplierAddress || null,
        supplierEmail: data.supplierEmail || null,
        supplierPhone: data.supplierPhone || null,
        supplierVatNumber: data.supplierVatNumber || null,
        supplierBankName: data.supplierBankName || null,
        supplierIban: data.supplierIban || null,
        supplierBic: data.supplierBic || null,
        descriptionOfWork: data.descriptionOfWork || null,
        spokenTotalCents: data.spokenTotalCents || null,
        notes: data.notes || null,
        subtotalCents: calculated.subtotalCents,
        vatAmountCents: calculated.vatAmountCents,
        totalCents: calculated.totalCents,
        rawTranscript: data.rawTranscript || null,
        missingFields: data.missingFields,
      })
      .returning();

    // Insert line items
    const lineItemValues = data.items.map((item, index) => {
      const qty = typeof item.quantity === "number" ? item.quantity : parseFloat(item.quantity) || 1;
      const itemTotal = Math.round(qty * item.unitPriceCents);
      return {
        invoiceId: insertedInvoice.id,
        position: index,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPriceCents: item.unitPriceCents,
        totalCents: itemTotal,
      };
    });

    const insertedItems = await db
      .insert(invoiceItems)
      .values(lineItemValues)
      .returning();

    return NextResponse.json({
      success: true,
      invoice: {
        ...insertedInvoice,
        items: insertedItems,
      },
      discrepancy,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Failed to create draft invoice:", errorMsg);
    return NextResponse.json(
      { success: false, error: `Failed to create invoice: ${errorMsg}` },
      { status: 500 }
    );
  }
}
