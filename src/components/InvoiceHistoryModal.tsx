"use client";

import React, { useEffect, useState } from "react";
import {
  History,
  X,
  FileText,
  Trash2,
  RefreshCw,
  Download,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { generateInvoicePdf, InvoicePdfData } from "@/lib/pdfGenerator";
import { InvoiceFormData } from "./InvoiceEditor";

interface SavedInvoiceRecord {
  id: string;
  invoiceNumber: string | null;
  status: "draft" | "issued";
  createdAt: string;
  updatedAt: string;
  clientName: string;
  clientAddress: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  serviceDate: string | null;
  dueDate: string | null;
  paymentTerms: string | null;
  currency: "EUR" | "GBP";
  isVatRegistered: boolean;
  vatRatePercent: string;
  isVatInclusive: boolean;
  vatExemptReason: string | null;
  supplierName: string;
  supplierAddress: string | null;
  supplierEmail: string | null;
  supplierPhone: string | null;
  supplierVatNumber: string | null;
  supplierBankName: string | null;
  supplierIban: string | null;
  supplierBic: string | null;
  descriptionOfWork: string | null;
  spokenTotalCents: number | null;
  notes: string | null;
  subtotalCents: number;
  vatAmountCents: number;
  totalCents: number;
  rawTranscript: string | null;
  missingFields: string[] | null;
  integrityHash: string | null;
  issuedAt: string | null;
  items: Array<{
    id: string;
    position: number;
    description: string;
    quantity: string;
    unitPriceCents: number;
    totalCents: number;
  }>;
}

interface InvoiceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectInvoice: (formData: InvoiceFormData) => void;
  onRefreshCount: (count: number) => void;
}

export function InvoiceHistoryModal({
  isOpen,
  onClose,
  onSelectInvoice,
  onRefreshCount,
}: InvoiceHistoryModalProps) {
  const [invoices, setInvoices] = useState<SavedInvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/invoices");
      const data = await res.json();
      if (data.success && Array.isArray(data.invoices)) {
        setInvoices(data.invoices);
        onRefreshCount(data.invoices.length);
      } else {
        setErrorMessage(data.error || "Failed to load saved records.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Error connecting to database: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInvoices();
    }
  }, [isOpen]);

  const handleDeleteDraft = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this draft?")) return;

    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setInvoices((prev) => prev.filter((inv) => inv.id !== id));
        onRefreshCount(invoices.length - 1);
      } else {
        alert(data.error || "Could not delete invoice.");
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleDownloadIssuedPdf = (inv: SavedInvoiceRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const pdfData: InvoicePdfData = {
      invoiceNumber: inv.invoiceNumber || "INV",
      status: inv.status,
      issueDate: inv.serviceDate || inv.createdAt.split("T")[0],
      serviceDate: inv.serviceDate,
      dueDate: inv.dueDate,
      paymentTerms: inv.paymentTerms,
      currency: inv.currency,
      isVatRegistered: inv.isVatRegistered,
      vatRatePercent: parseFloat(inv.vatRatePercent) || 0,
      isVatInclusive: inv.isVatInclusive,
      supplierName: inv.supplierName,
      supplierAddress: inv.supplierAddress,
      supplierEmail: inv.supplierEmail,
      supplierPhone: inv.supplierPhone,
      supplierVatNumber: inv.supplierVatNumber,
      supplierBankName: inv.supplierBankName,
      supplierIban: inv.supplierIban,
      supplierBic: inv.supplierBic,
      clientName: inv.clientName,
      clientAddress: inv.clientAddress,
      clientEmail: inv.clientEmail,
      clientPhone: inv.clientPhone,
      descriptionOfWork: inv.descriptionOfWork,
      notes: inv.notes,
      subtotalCents: inv.subtotalCents,
      vatAmountCents: inv.vatAmountCents,
      totalCents: inv.totalCents,
      integrityHash: inv.integrityHash,
      items: inv.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPriceCents: it.unitPriceCents,
        totalCents: it.totalCents,
      })),
    };

    const doc = generateInvoicePdf(pdfData);
    doc.save(`invoice-${inv.invoiceNumber || "issued"}.pdf`);
  };

  const handleLoadInvoice = (inv: SavedInvoiceRecord) => {
    const formData: InvoiceFormData = {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      clientName: inv.clientName,
      clientAddress: inv.clientAddress || "",
      clientEmail: inv.clientEmail || "",
      clientPhone: inv.clientPhone || "",
      supplierName: inv.supplierName,
      supplierAddress: inv.supplierAddress || "",
      supplierEmail: inv.supplierEmail || "",
      supplierPhone: inv.supplierPhone || "",
      supplierVatNumber: inv.supplierVatNumber || "",
      supplierBankName: inv.supplierBankName || "",
      supplierIban: inv.supplierIban || "",
      supplierBic: inv.supplierBic || "",
      serviceDate: inv.serviceDate || "",
      dueDate: inv.dueDate || "",
      paymentTerms: inv.paymentTerms || "14 days",
      currency: inv.currency,
      isVatRegistered: inv.isVatRegistered,
      vatRatePercent: parseFloat(inv.vatRatePercent) || 0,
      isVatInclusive: inv.isVatInclusive,
      vatExemptReason: inv.vatExemptReason || "",
      descriptionOfWork: inv.descriptionOfWork || "",
      notes: inv.notes || "",
      spokenTotalCents: inv.spokenTotalCents,
      rawTranscript: inv.rawTranscript || "",
      missingFields: inv.missingFields || [],
      items: inv.items.map((it) => ({
        id: it.id,
        description: it.description,
        quantity: it.quantity,
        unitPriceMajor: (it.unitPriceCents / 100).toFixed(2),
      })),
    };

    onSelectInvoice(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-left max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-10 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Invoice Records & History</h3>
          </div>
          <button
            onClick={fetchInvoices}
            disabled={isLoading}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors mr-6 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* List of Invoices */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isLoading && invoices.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Loading saved records from PostgreSQL...
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <FileText className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              No invoices saved yet. Record a voice description to create your first draft.
            </div>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => handleLoadInvoice(inv)}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-950 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-200 text-sm group-hover:text-emerald-400 transition-colors">
                      {inv.clientName || "Untitled Client"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        inv.status === "issued"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {inv.status}
                    </span>
                    {inv.invoiceNumber && (
                      <span className="text-xs font-mono text-slate-400">
                        {inv.invoiceNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Created {new Date(inv.createdAt).toLocaleDateString()} • {inv.items?.length || 0} line items
                    {inv.integrityHash && " • SHA-256 Hashed"}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                  <span className="text-sm font-bold font-mono text-slate-100">
                    {formatCurrency(inv.totalCents, inv.currency)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {inv.status === "issued" ? (
                      <button
                        type="button"
                        onClick={(e) => handleDownloadIssuedPdf(inv, e)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors"
                        title="Download Issued PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteDraft(inv.id, e)}
                        className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete draft"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
