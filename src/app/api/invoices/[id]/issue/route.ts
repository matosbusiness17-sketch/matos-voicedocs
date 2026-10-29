import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems, issuedSnapshots } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { computeSnapshotIntegrityHash } from "@/lib/integrity";
import { validateInvoiceForIssuance } from "@/lib/issuanceValidation";
import { calculateInvoiceTotals } from "@/lib/calculations";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { confirmedByUserId, confirmDemoSupplier } = body;

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

    const issueDateStr = new Date().toISOString().split("T")[0];

    // Recalculate deterministic totals before official issuance (Requirement 5 & 6)
    const numericVatRate = parseFloat(String(invoice.vatRatePercent)) || 0;
    const recalculatedTotals = calculateInvoiceTotals(
      invoice.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPriceCents: it.unitPriceCents,
      })),
      {
        isVatRegistered: invoice.isVatRegistered,
        vatRatePercent: numericVatRate,
        isVatInclusive: invoice.isVatInclusive,
      }
    );

    // Consistency verification: reject issuance if totals or tax treatment are inconsistent
    if (
      invoice.subtotalCents !== recalculatedTotals.subtotalCents ||
      invoice.vatAmountCents !== recalculatedTotals.vatAmountCents ||
      invoice.totalCents !== recalculatedTotals.totalCents
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Issuance validation failed: Stored invoice financial totals are inconsistent with deterministic tax recalculation. Please review and re-save the draft before issuance.",
        },
        { status: 422 }
      );
    }

    // Centralized issuance validation (Requirement 1 & 2 & 3)
    const validation = validateInvoiceForIssuance({
      clientName: invoice.clientName,
      clientAddress: invoice.clientAddress,
      clientEmail: invoice.clientEmail,
      clientPhone: invoice.clientPhone,
      supplierName: invoice.supplierName,
      supplierAddress: invoice.supplierAddress,
      supplierEmail: invoice.supplierEmail,
      supplierPhone: invoice.supplierPhone,
      supplierVatNumber: invoice.supplierVatNumber,
      supplierBankName: invoice.supplierBankName,
      supplierIban: invoice.supplierIban,
      supplierBic: invoice.supplierBic,
      issueDate: issueDateStr,
      serviceDate: invoice.serviceDate,
      dueDate: invoice.dueDate,
      paymentTerms: invoice.paymentTerms,
      currency: invoice.currency,
      isVatRegistered: invoice.isVatRegistered,
      vatRatePercent: numericVatRate,
      isVatInclusive: invoice.isVatInclusive,
      spokenTotalCents: invoice.spokenTotalCents,
      items: invoice.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPriceCents: it.unitPriceCents,
        totalCents: it.totalCents,
      })),
      confirmDemoSupplier: !!confirmDemoSupplier,
    });

    if (!validation.isValid) {
      const errorSummary = validation.errors.map((e) => e.message).join(" ");
      return NextResponse.json(
        {
          success: false,
          error: `Issuance validation failed: ${errorSummary}`,
          validationErrors: validation.errors,
          isDemoSupplier: validation.isDemoSupplier,
        },
        { status: 422 }
      );
    }

    // Generate formal sequential invoice number if not already assigned
    const currentYear = new Date().getFullYear();
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(issuedSnapshots);

    const nextNumber = count + 1;
    const assignedInvoiceNumber =
      invoice.invoiceNumber && invoice.invoiceNumber.trim() !== ""
        ? invoice.invoiceNumber
        : `INV-${currentYear}-${String(nextNumber).padStart(4, "0")}`;

    // Use derived due date (e.g. 14 days from issueDate) if explicit due date was empty
    const resolvedDueDate = invoice.dueDate && invoice.dueDate.trim() !== ""
      ? invoice.dueDate.trim()
      : validation.derivedDueDate;

    // Build complete frozen snapshot using deterministically recalculated amounts
    const snapshotData = {
      id: invoice.id,
      invoiceNumber: assignedInvoiceNumber,
      issueDate: issueDateStr,
      serviceDate: invoice.serviceDate,
      dueDate: resolvedDueDate,
      paymentTerms: invoice.paymentTerms,
      currency: invoice.currency,
      isVatRegistered: invoice.isVatRegistered,
      vatRatePercent: numericVatRate,
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
        isSyntheticDemoData: validation.isDemoSupplier,
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
      subtotalCents: recalculatedTotals.subtotalCents,
      vatAmountCents: recalculatedTotals.vatAmountCents,
      totalCents: recalculatedTotals.totalCents,
      notes: invoice.notes,
      rawTranscript: invoice.rawTranscript,
      issuedAt: new Date().toISOString(),
      confirmedByUser: confirmedByUserId || "authorized_user",
      isSyntheticDemoDocument: validation.isDemoSupplier,
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

    // Mark invoice as issued with hash and derived due date
    const [updatedInvoice] = await db
      .update(invoices)
      .set({
        status: "issued",
        invoiceNumber: assignedInvoiceNumber,
        issueDate: issueDateStr,
        dueDate: resolvedDueDate,
        subtotalCents: recalculatedTotals.subtotalCents,
        vatAmountCents: recalculatedTotals.vatAmountCents,
        totalCents: recalculatedTotals.totalCents,
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
      isDemoSupplier: validation.isDemoSupplier,
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
