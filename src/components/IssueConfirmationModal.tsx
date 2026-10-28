"use client";

import React from "react";
import { AlertTriangle, Lock, ShieldCheck, X } from "lucide-react";
import { formatCurrency, CurrencyCode } from "@/lib/calculations";

interface IssueConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isIssuing: boolean;
  clientName: string;
  totalCents: number;
  currency: CurrencyCode;
}

export function IssueConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isIssuing,
  clientName,
  totalCents,
  currency,
}: IssueConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-left">
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-10 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Issue Official Invoice</h3>
            <p className="text-xs text-slate-400">Formal document approval & locking</p>
          </div>
        </div>

        <div className="space-y-3 mb-6 text-sm text-slate-300">
          <p>
            You are about to issue an official invoice to{" "}
            <strong className="text-white">{clientName}</strong> for{" "}
            <strong className="text-emerald-400 font-mono">
              {formatCurrency(totalCents, currency)}
            </strong>
            .
          </p>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs text-slate-400">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Document Integrity:</strong> An assigned sequential invoice number and today&apos;s issue date will be stamped.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Immutable Snapshot:</strong> A SHA-256 integrity hash will be recorded. Once issued, this document cannot be silently modified.
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isIssuing}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isIssuing}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isIssuing ? "Issuing & Hashing..." : "Confirm & Issue Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}
