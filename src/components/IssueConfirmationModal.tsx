"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Lock,
  ShieldCheck,
  X,
  Calendar,
  AlertCircle,
  Building,
  ArrowLeft,
} from "lucide-react";
import { formatCurrency, CurrencyCode } from "@/lib/calculations";
import { IssuanceValidationResult } from "@/lib/issuanceValidation";

interface IssueConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (confirmDemoSupplier: boolean) => void;
  isIssuing: boolean;
  clientName: string;
  totalCents: number;
  currency: CurrencyCode;
  paymentTerms: string;
  derivedDueDate: string | null;
  validation: IssuanceValidationResult;
  onReturnToEdit: () => void;
}

export function IssueConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isIssuing,
  clientName,
  totalCents,
  currency,
  paymentTerms,
  derivedDueDate,
  validation,
  onReturnToEdit,
}: IssueConfirmationModalProps) {
  const [confirmDemoCheckbox, setConfirmDemoCheckbox] = useState(false);

  if (!isOpen) return null;

  const canConfirm =
    validation.isValid &&
    (!validation.isDemoSupplier || confirmDemoCheckbox);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-left max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-10 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-3 rounded-xl border ${
              validation.isValid
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}
          >
            {validation.isValid ? <Lock className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {validation.isValid ? "Issue Official Invoice" : "Issuance Blocked — Incomplete Details"}
            </h3>
            <p className="text-xs text-slate-400">
              {validation.isValid
                ? "Formal document approval & immutable locking"
                : "Mandatory fields required before official certification"}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-1 text-xs text-slate-300">
          {/* Validation Failure Warnings */}
          {!validation.isValid && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-300 text-sm">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>The following fields must be completed before issuance:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-rose-200/90 pl-1">
                {validation.errors.map((err, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <strong>{err.field}:</strong> {err.message}
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onReturnToEdit();
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Editor to Fix Missing Fields</span>
                </button>
              </div>
            </div>
          )}

          {/* Valid Invoice Details Summary */}
          {validation.isValid && (
            <div className="space-y-3">
              <p className="text-sm">
                You are about to certify and issue an official invoice to{" "}
                <strong className="text-white">{clientName}</strong> for{" "}
                <strong className="text-emerald-400 font-mono">
                  {formatCurrency(totalCents, currency)}
                </strong>
                .
              </p>

              {/* Payment Terms & Derived Due Date Card (Requirement 2) */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                <Calendar className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-200">
                    Payment Terms: <span className="text-cyan-400">{paymentTerms || "14 days"}</span>
                  </p>
                  <p className="text-slate-400">
                    Calculated Due Date:{" "}
                    <strong className="text-slate-200 font-mono">
                      {derivedDueDate || "Upon Receipt"}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Synthetic Demo Supplier Identity Confirmation (Requirement 3) */}
              {validation.isDemoSupplier && (
                <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-orange-300">
                    <Building className="w-4 h-4 text-orange-400" />
                    <span>Demonstration Supplier Identity</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-orange-200/90">
                    This document currently contains synthetic demo supplier, VAT, and banking details.
                    Official production records must use your verified business identity.
                  </p>
                  <label className="flex items-start gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmDemoCheckbox}
                      onChange={(e) => setConfirmDemoCheckbox(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-orange-500 focus:ring-orange-500 mt-0.5"
                    />
                    <span className="text-[11px] font-semibold text-orange-300">
                      I confirm usage of synthetic demonstration supplier data for prototype evaluation.
                    </span>
                  </label>
                </div>
              )}

              {/* Immutable Locking Notice */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs text-slate-400">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Sequential Stamping:</strong> Assigns official invoice number and date.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Immutable Snapshot:</strong> Calculates and saves a SHA-256 audit digest. Issued documents cannot be silently modified.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isIssuing}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          {validation.isValid ? (
            <button
              type="button"
              onClick={() => onConfirm(confirmDemoCheckbox)}
              disabled={isIssuing || !canConfirm}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isIssuing ? "Issuing & Locking..." : "Confirm & Issue Official Invoice"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onReturnToEdit();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Back to Editor
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
