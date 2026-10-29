"use client";

import React, { useState } from "react";
import {
  Download,
  Mail,
  ShieldCheck,
  ArrowLeft,
  Lock,
  FileCheck,
} from "lucide-react";
import { calculateInvoiceTotals, formatCurrency } from "@/lib/calculations";
import { generateInvoicePdf, InvoicePdfData } from "@/lib/pdfGenerator";
import { deriveDueDate, isDemoSupplierData } from "@/lib/issuanceValidation";
import { InvoiceFormData } from "./InvoiceEditor";

interface InvoicePreviewProps {
  invoiceData: InvoiceFormData;
  onBackToEdit: () => void;
  onOpenIssueModal: () => void;
  onOpenEmailModal: () => void;
  isIssued: boolean;
  assignedInvoiceNumber?: string | null;
  integrityHash?: string | null;
}

export function InvoicePreview({
  invoiceData,
  onBackToEdit,
  onOpenIssueModal,
  onOpenEmailModal,
  isIssued,
  assignedInvoiceNumber,
  integrityHash,
}: InvoicePreviewProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Compute items & totals for PDF
  const itemsForPdf = invoiceData.items.map((item) => {
    const priceNum = parseFloat(item.unitPriceMajor) || 0;
    const priceCents = Math.round(priceNum * 100);
    const qty = typeof item.quantity === "number" ? item.quantity : parseFloat(item.quantity) || 1;
    const totalCents = Math.round(qty * priceCents);
    return {
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: priceCents,
      totalCents,
    };
  });

  const vatRate = parseFloat(String(invoiceData.vatRatePercent)) || 0;
  const totals = calculateInvoiceTotals(itemsForPdf, {
    isVatRegistered: invoiceData.isVatRegistered,
    vatRatePercent: vatRate,
    isVatInclusive: invoiceData.isVatInclusive,
  });

  const todayStr = invoiceData.serviceDate || "2026-10-28";
  const derivedDueDate = deriveDueDate(todayStr, invoiceData.paymentTerms);
  const resolvedDueDate = invoiceData.dueDate && invoiceData.dueDate.trim() !== ""
    ? invoiceData.dueDate.trim()
    : derivedDueDate;

  const isDemoSupplier = isDemoSupplierData({
    name: invoiceData.supplierName,
    vatNumber: invoiceData.supplierVatNumber,
    iban: invoiceData.supplierIban,
    address: invoiceData.supplierAddress,
  });

  const pdfPayload: InvoicePdfData = {
    invoiceNumber: assignedInvoiceNumber || invoiceData.invoiceNumber || "DRAFT-PREVIEW",
    status: isIssued ? "issued" : "draft",
    issueDate: invoiceData.serviceDate || todayStr,
    serviceDate: invoiceData.serviceDate,
    dueDate: resolvedDueDate,
    paymentTerms: invoiceData.paymentTerms,
    currency: invoiceData.currency,
    isVatRegistered: invoiceData.isVatRegistered,
    vatRatePercent: vatRate,
    isVatInclusive: invoiceData.isVatInclusive,
    supplierName: invoiceData.supplierName,
    supplierAddress: invoiceData.supplierAddress,
    supplierEmail: invoiceData.supplierEmail,
    supplierPhone: invoiceData.supplierPhone,
    supplierVatNumber: invoiceData.supplierVatNumber,
    supplierBankName: invoiceData.supplierBankName,
    supplierIban: invoiceData.supplierIban,
    supplierBic: invoiceData.supplierBic,
    clientName: invoiceData.clientName,
    clientAddress: invoiceData.clientAddress,
    clientEmail: invoiceData.clientEmail,
    clientPhone: invoiceData.clientPhone,
    descriptionOfWork: invoiceData.descriptionOfWork,
    notes: invoiceData.notes,
    subtotalCents: totals.subtotalCents,
    vatAmountCents: totals.vatAmountCents,
    totalCents: totals.totalCents,
    integrityHash: integrityHash || null,
    isDemoSupplier,
    items: itemsForPdf,
  };

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      const doc = generateInvoicePdf(pdfPayload);
      const filename = `invoice-${pdfPayload.invoiceNumber || "draft"}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl backdrop-blur-md">
        <button
          onClick={onBackToEdit}
          disabled={isIssued}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all ${
            isIssued
              ? "text-slate-600 cursor-not-allowed"
              : "text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 cursor-pointer"
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isIssued ? "Locked (Issued)" : "Back to Editor"}</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {/* Download PDF button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-semibold text-xs transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isGeneratingPdf ? "Generating..." : "Download PDF"}</span>
          </button>

          {/* Email Draft button */}
          <button
            onClick={onOpenEmailModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-semibold text-xs transition-all cursor-pointer shadow-sm"
          >
            <Mail className="w-4 h-4 text-cyan-400" />
            <span>Prepare Email</span>
          </button>

          {/* Issue Official Invoice Button */}
          {!isIssued ? (
            <button
              onClick={onOpenIssueModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <FileCheck className="w-4 h-4" />
              <span>Issue Official Invoice</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-xs">
              <Lock className="w-3.5 h-3.5" />
              Officially Issued
            </span>
          )}
        </div>
      </div>

      {/* Audit Digest Verification Box when Issued */}
      {isIssued && integrityHash && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 overflow-hidden">
            <p className="font-bold text-emerald-200">
              Snapshot Verified & Recorded (Test G)
            </p>
            <p className="text-emerald-300/80">
              This invoice has been assigned official number{" "}
              <strong className="text-white">{assignedInvoiceNumber}</strong>. An immutable snapshot is stored in the database.
            </p>
            <p className="font-mono text-[11px] text-emerald-400 break-all select-all pt-1">
              SHA-256 Digest: {integrityHash}
            </p>
          </div>
        </div>
      )}

      {/* Styled Invoice Paper Document Canvas */}
      <div className="relative bg-white text-slate-900 rounded-2xl shadow-2xl p-8 sm:p-12 overflow-hidden border border-slate-200">
        {/* Subtle Watermark for Draft */}
        {!isIssued && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none overflow-hidden">
            <span className="text-slate-200 text-6xl sm:text-8xl font-black uppercase tracking-widest transform -rotate-30 opacity-70">
              DRAFT
            </span>
          </div>
        )}

        {/* Demo Supplier Notice Banner */}
        {isDemoSupplier && (
          <div className="relative z-10 mb-6 p-2.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-[11px] font-medium flex items-center justify-between">
            <span>⚠️ <strong>PROTOTYPE DEMONSTRATION:</strong> Document features synthetic demonstration supplier identity.</span>
            <span className="font-bold text-[10px] uppercase tracking-wider bg-orange-200 text-orange-900 px-2 py-0.5 rounded">DEMO CONTEXT</span>
          </div>
        )}

        {/* Invoice Header */}
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl font-black tracking-tight text-slate-900">
                MATOS SYSTEMS
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                VOICEDOCS
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Technical Solutions & Automated Documentation
            </p>
          </div>

          <div className="text-left sm:text-right">
            <div className="inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2"
              style={{
                backgroundColor: isIssued ? "#d1fae5" : "#fef3c7",
                color: isIssued ? "#065f46" : "#92400e",
              }}
            >
              {isIssued ? "OFFICIAL INVOICE" : "DRAFT INVOICE"}
            </div>
            <p className="text-base font-extrabold text-slate-900 font-mono">
              {assignedInvoiceNumber || invoiceData.invoiceNumber || "DRAFT-PREVIEW"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Date: {invoiceData.serviceDate || todayStr}
            </p>
          </div>
        </div>

        {/* Supplier & Client Address Grid */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-8 my-8 text-xs">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              From (Issuer)
            </p>
            <p className="font-bold text-sm text-slate-900">{invoiceData.supplierName}</p>
            <p className="text-slate-600 mt-1 whitespace-pre-line">{invoiceData.supplierAddress}</p>
            {invoiceData.supplierVatNumber && (
              <p className="text-slate-600 mt-1 font-mono font-medium">
                VAT ID: {invoiceData.supplierVatNumber}
              </p>
            )}
            {invoiceData.supplierEmail && (
              <p className="text-slate-600 mt-1">Email: {invoiceData.supplierEmail}</p>
            )}
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Bill To (Client)
            </p>
            <p className="font-bold text-sm text-slate-900">{invoiceData.clientName}</p>
            <p className="text-slate-600 mt-1 whitespace-pre-line">
              {invoiceData.clientAddress || "(Address not provided)"}
            </p>
            {invoiceData.clientEmail && (
              <p className="text-slate-600 mt-1">Email: {invoiceData.clientEmail}</p>
            )}
            {invoiceData.paymentTerms && (
              <p className="text-slate-600 mt-2 font-medium">
                Payment Terms: <span className="text-slate-900 font-semibold">{invoiceData.paymentTerms}</span>
              </p>
            )}
            {resolvedDueDate && (
              <p className="text-slate-600 mt-0.5 font-medium">
                Payment Due Date: <span className="text-slate-900 font-mono font-semibold">{resolvedDueDate}</span>
              </p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="relative z-10 my-8 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-slate-900 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-2 w-8">#</th>
                <th className="py-3 px-2">Description</th>
                <th className="py-3 px-2 text-center w-16">Qty</th>
                <th className="py-3 px-2 text-right w-24">Unit Price</th>
                <th className="py-3 px-2 text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {itemsForPdf.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3 px-2 font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-2 font-medium text-slate-900">{item.description}</td>
                  <td className="py-3 px-2 text-center font-mono">{item.quantity}</td>
                  <td className="py-3 px-2 text-right font-mono">
                    {formatCurrency(item.unitPriceCents, invoiceData.currency)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(item.totalCents, invoiceData.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start pt-4 border-t border-slate-200 gap-6">
          {/* Payment Instructions */}
          <div className="text-xs text-slate-600 max-w-sm">
            <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
              Payment Information
            </p>
            <p>Bank: {invoiceData.supplierBankName || "Bank of Valletta"}</p>
            <p className="font-mono text-[11px] mt-0.5">
              IBAN: {invoiceData.supplierIban || "MT84BOVS0000000001234567890"}
            </p>
            <p className="font-mono text-[11px]">
              BIC/SWIFT: {invoiceData.supplierBic || "BOVSMTM3"}
            </p>
            {invoiceData.notes && (
              <p className="mt-3 text-slate-500 italic border-l-2 border-slate-300 pl-2">
                Note: {invoiceData.notes}
              </p>
            )}
          </div>

          {/* Amount Breakdown */}
          <div className="w-full sm:w-64 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal (Net):</span>
              <span className="font-mono font-medium">
                {formatCurrency(totals.subtotalCents, invoiceData.currency)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>
                VAT ({invoiceData.isVatRegistered ? `${vatRate}%` : "0%"}):
              </span>
              <span className="font-mono font-medium">
                {formatCurrency(totals.vatAmountCents, invoiceData.currency)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-sm text-slate-900">
              <span>Total Due:</span>
              <span className="font-mono text-base">
                {formatCurrency(totals.totalCents, invoiceData.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-12 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400">
          <span>Matos VoiceDocs • Commercial Invoice Engine</span>
          {integrityHash && (
            <span className="font-mono text-[9px]">
              Integrity SHA-256: {integrityHash.slice(0, 16)}...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
