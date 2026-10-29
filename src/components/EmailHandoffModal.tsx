"use client";

import React, { useState } from "react";
import { Mail, Copy, Check, ExternalLink, X, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { deriveDueDate } from "@/lib/issuanceValidation";
import { InvoiceFormData } from "./InvoiceEditor";

interface EmailHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: InvoiceFormData;
  totalCents: number;
  assignedInvoiceNumber?: string | null;
}

export function EmailHandoffModal({
  isOpen,
  onClose,
  invoiceData,
  totalCents,
  assignedInvoiceNumber,
}: EmailHandoffModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const invoiceNum = assignedInvoiceNumber || invoiceData.invoiceNumber || "Draft";
  const formattedTotal = formatCurrency(totalCents, invoiceData.currency);
  const subject = `Invoice ${invoiceNum} from ${invoiceData.supplierName}`;

  // Deterministically derive due date if valid terms exist, otherwise preserve explicit or unknown state
  const issueDateStr = invoiceData.serviceDate || new Date().toISOString().split("T")[0];
  const derivedDate = deriveDueDate(issueDateStr, invoiceData.paymentTerms);
  const resolvedDueDate = invoiceData.dueDate && invoiceData.dueDate.trim() !== ""
    ? invoiceData.dueDate.trim()
    : derivedDate;

  const body = `Dear ${invoiceData.clientName || "Customer"},

Please find attached invoice ${invoiceNum} for ${formattedTotal} regarding completed services.

Summary of Work:
${invoiceData.descriptionOfWork || "Completed services as agreed."}

Payment Terms: ${invoiceData.paymentTerms || "Not specified"}
Due Date: ${resolvedDueDate || "Not specified"}

Bank Payment Details:
Bank: ${invoiceData.supplierBankName || "Bank of Valletta"}
IBAN: ${invoiceData.supplierIban || "MT84BOVS0000000001234567890"}
BIC/SWIFT: ${invoiceData.supplierBic || "BOVSMTM3"}

Thank you for your business.

Warm regards,
${invoiceData.supplierName}
${invoiceData.supplierEmail || ""}
${invoiceData.supplierPhone || ""}`;

  const mailtoUrl = `mailto:${encodeURIComponent(
    invoiceData.clientEmail || ""
  )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const handleCopyBody = () => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLaunchEmail = () => {
    window.location.href = mailtoUrl;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-left">
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-10 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Prepare Customer Email</h3>
            <p className="text-xs text-slate-400">Pre-fill email with invoice breakdown</p>
          </div>
        </div>

        {/* Browser limitation advisory note (Test requirement) */}
        <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
          <div>
            <strong className="text-amber-200">Attachment Notice:</strong> Web browsers cannot automatically attach files to <code>mailto:</code> links. Please ensure you have downloaded the PDF invoice and manually attach it to the email before sending.
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Recipient Email:
            </label>
            <input
              type="text"
              readOnly
              value={invoiceData.clientEmail || "(No client email provided)"}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Subject Line:
            </label>
            <input
              type="text"
              readOnly
              value={subject}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Email Body:
            </label>
            <textarea
              readOnly
              rows={6}
              value={body}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 font-mono leading-relaxed"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleCopyBody}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Email Text</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleLaunchEmail}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open in Mail Client</span>
          </button>
        </div>
      </div>
    </div>
  );
}
