import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateInvoiceTotals, checkSpokenDiscrepancy } from "@/lib/calculations";
import { z } from "zod";

const ItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Item description is required"),
  quantity: z.union([z.number(), z.string()]).default(1),
  unitPriceCents: z.number().int().min(0),
});

const UpdateInvoiceSchema = z.object({
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
  missingFields: z.array(z.string()).optional().default([]),
  
  items: z.array(ItemSchema).min(1, "At least one line item is required"),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      with: {
        items: {
          orderBy: [invoiceItems.position],
        },
        snapshots: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Error fetching invoice: ${errorMsg}` },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch existing invoice to check status
    const existing = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Invoice not found." },
        { status: 404 }
      );
    }

    // MANDATORY REQUIREMENT (Test G):
    // Previously issued snapshots must NOT be modified.
    if (existing.status === "issued") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invoice has already been issued and cannot be modified. Issued snapshots are immutable for accounting integrity.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = UpdateInvoiceSchema.safeParse(body);

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

    // Recalculate deterministic totals
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

    // Update invoice record
    const [updatedInvoice] = await db
      .update(invoices)
      .set({
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
        missingFields: data.missingFields,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id))
      .returning();

    // Delete existing items and insert refreshed items
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));

    const lineItemValues = data.items.map((item, index) => {
      const qty = typeof item.quantity === "number" ? item.quantity : parseFloat(item.quantity) || 1;
      const itemTotal = Math.round(qty * item.unitPriceCents);
      return {
        invoiceId: id,
        position: index,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPriceCents: item.unitPriceCents,
        totalCents: itemTotal,
      };
    });

    const updatedItems = await db
      .insert(invoiceItems)
      .values(lineItemValues)
      .returning();

    return NextResponse.json({
      success: true,
      invoice: {
        ...updatedInvoice,
        items: updatedItems,
      },
      discrepancy,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Failed to update invoice:", errorMsg);
    return NextResponse.json(
      { success: false, error: `Failed to update invoice: ${errorMsg}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Invoice not found." },
        { status: 404 }
      );
    }

    if (existing.status === "issued") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete an issued invoice snapshot. It is locked for audit integrity.",
        },
        { status: 403 }
      );
    }

    await db.delete(invoices).where(eq(invoices.id, id));

    return NextResponse.json({
      success: true,
      message: "Draft invoice deleted successfully.",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to delete invoice: ${errorMsg}` },
      { status: 500 }
    );
  }
}
