import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems, issuedSnapshots } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { checkSpokenDiscrepancy } from "@/lib/calculations";
import { computeSnapshotIntegrityHash } from "@/lib/integrity";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { confirmedByUserId } = body;

    // Fetch existing invoice
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      with: {
        items: {
          orderBy: [invoiceItems.position],
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found." },
        { status: 404 }
      );
    }

    if (invoice.status === "issued") {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice is already issued. Cannot re-issue an immutable document.",
        },
        { status: 400 }
      );
    }

    // MANDATORY REQUIREMENT (Test B):
    // "If a spoken total does not match the calculated sum, flag the discrepancy and prevent issuance until the user resolves it."
    const discrepancy = checkSpokenDiscrepancy(
      invoice.totalCents,
      invoice.spokenTotalCents,
      invoice.currency as "EUR" | "GBP"
    );

    if (discrepancy.hasDiscrepancy) {
      return NextResponse.json(
        {
          success: false,
          error: `Issuance blocked: ${discrepancy.message}. Please edit line items or clear the discrepancy before issuing.`,
          discrepancy,
        },
        { status: 422 }
      );
    }

    if (!invoice.clientName || invoice.clientName.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Issuance blocked: Client name is required." },
        { status: 422 }
      );
    }

    if (!invoice.items || invoice.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Issuance blocked: Invoice must have at least one line item." },
        { status: 422 }
      );
    }

    // Generate formal invoice number if not already assigned
    const currentYear = new Date().getFullYear();
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(issuedSnapshots);
    
    const nextNumber = count + 1;
    const assignedInvoiceNumber =
      invoice.invoiceNumber && invoice.invoiceNumber.trim() !== ""
        ? invoice.invoiceNumber
        : `INV-${currentYear}-${String(nextNumber).padStart(4, "0")}`;

    const issueDateStr = new Date().toISOString().split("T")[0];

    // Build complete frozen snapshot
    const snapshotData = {
      id: invoice.id,
      invoiceNumber: assignedInvoiceNumber,
      issueDate: issueDateStr,
      serviceDate: invoice.serviceDate,
      dueDate: invoice.dueDate,
      paymentTerms: invoice.paymentTerms,
      currency: invoice.currency,
      isVatRegistered: invoice.isVatRegistered,
      vatRatePercent: invoice.vatRatePercent,
      isVatInclusive: invoice.isVatInclusive,
      vatExemptReason: invoice.vatExemptReason,
      supplier: {
        name: invoice.supplierName,
        address: invoice.supplierAddress,
        email: invoice.supplierEmail,
        phone: invoice.supplierPhone,
        vatNumber: invoice.supplierVatNumber,
        bankName: invoice.supplierBankName,
        iban: invoice.supplierIban,
        bic: invoice.supplierBic,
      },
      client: {
        name: invoice.clientName,
        address: invoice.clientAddress,
        email: invoice.clientEmail,
        phone: invoice.clientPhone,
      },
      descriptionOfWork: invoice.descriptionOfWork,
      items: invoice.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPriceCents: it.unitPriceCents,
        totalCents: it.totalCents,
      })),
      subtotalCents: invoice.subtotalCents,
      vatAmountCents: invoice.vatAmountCents,
      totalCents: invoice.totalCents,
      notes: invoice.notes,
      rawTranscript: invoice.rawTranscript,
      issuedAt: new Date().toISOString(),
      confirmedByUser: confirmedByUserId || "authorized_user",
    };

    // Calculate SHA-256 integrity hash
    const integrityHash = computeSnapshotIntegrityHash(snapshotData);

    // Persist snapshot to immutable audit table
    const [snapshotRecord] = await db
      .insert(issuedSnapshots)
      .values({
        invoiceId: invoice.id,
        invoiceNumber: assignedInvoiceNumber,
        snapshotData,
        integrityHash,
      })
      .returning();

    // Mark invoice as issued with hash
    const [updatedInvoice] = await db
      .update(invoices)
      .set({
        status: "issued",
        invoiceNumber: assignedInvoiceNumber,
        issueDate: issueDateStr,
        integrityHash,
        issuedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Invoice successfully issued and locked.",
      invoice: {
        ...updatedInvoice,
        items: invoice.items,
      },
      snapshot: snapshotRecord,
      integrityHash,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Issuance error:", errorMsg);
    return NextResponse.json(
      { success: false, error: `Failed to issue invoice: ${errorMsg}` },
      { status: 500 }
    );
  }
}
