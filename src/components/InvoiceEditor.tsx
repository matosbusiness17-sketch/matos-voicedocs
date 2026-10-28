"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Building,
  User,
  CreditCard,
  FileText,
  Save,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  calculateInvoiceTotals,
  checkSpokenDiscrepancy,
  formatCurrency,
  CurrencyCode,
} from "@/lib/calculations";

export interface LineItemForm {
  id?: string;
  description: string;
  quantity: number | string;
  unitPriceMajor: string; // display string e.g. "750.00"
}

export interface InvoiceFormData {
  id?: string;
  invoiceNumber?: string | null;
  status: "draft" | "issued";
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  clientPhone: string;

  supplierName: string;
  supplierAddress: string;
  supplierEmail: string;
  supplierPhone: string;
  supplierVatNumber: string;
  supplierBankName: string;
  supplierIban: string;
  supplierBic: string;

  serviceDate: string;
  dueDate: string;
  paymentTerms: string;
  currency: CurrencyCode;

  isVatRegistered: boolean;
  vatRatePercent: number;
  isVatInclusive: boolean;
  vatExemptReason: string;

  descriptionOfWork: string;
  notes: string;
  spokenTotalCents: number | null;
  rawTranscript: string;
  missingFields: string[];

  items: LineItemForm[];
}

interface InvoiceEditorProps {
  initialData: InvoiceFormData;
  onSaveDraft: (data: InvoiceFormData) => Promise<void>;
  onProceedToPreview: (data: InvoiceFormData) => void;
  isSaving: boolean;
}

export function InvoiceEditor({
  initialData,
  onSaveDraft,
  onProceedToPreview,
  isSaving,
}: InvoiceEditorProps) {
  const [formData, setFormData] = useState<InvoiceFormData>(initialData);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Sync when initialData changes
  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  // Deterministically compute totals on every change
  const itemsForCalc = formData.items.map((item) => {
    const priceNum = parseFloat(item.unitPriceMajor) || 0;
    const priceCents = Math.round(priceNum * 100);
    return {
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: priceCents,
    };
  });

  const totals = calculateInvoiceTotals(itemsForCalc, {
    isVatRegistered: formData.isVatRegistered,
    vatRatePercent: formData.vatRatePercent,
    isVatInclusive: formData.isVatInclusive,
  });

  const discrepancy = checkSpokenDiscrepancy(
    totals.totalCents,
    formData.spokenTotalCents,
    formData.currency
  );

  // Line item handlers
  const handleItemChange = (
    index: number,
    field: keyof LineItemForm,
    value: string | number
  ) => {
    const updated = [...formData.items];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, items: updated });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          description: "",
          quantity: 1,
          unitPriceMajor: "0.00",
        },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length <= 1) return;
    const updated = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updated });
  };

  // Quick discrepancy resolution: accept calculated total
  const handleAcceptCalculatedTotal = () => {
    setFormData({
      ...formData,
      spokenTotalCents: null,
    });
  };

  const handleSave = async () => {
    await onSaveDraft(formData);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* 1. Spoken Discrepancy Alert Banner (Test B) */}
      {discrepancy.hasDiscrepancy && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-200 shadow-xl shadow-amber-950/20">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 flex-shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-amber-300">
                Spoken Total Discrepancy Detected
              </h3>
              <p className="text-sm text-amber-200/90 mt-1">
                {discrepancy.message}
              </p>
              <p className="text-xs text-amber-300/70 mt-1">
                Matos Systems Financial Safety Rule: Official issuance is disabled until this difference is resolved.
              </p>

              <div className="mt-3 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={handleAcceptCalculatedTotal}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-sm"
                >
                  Accept Calculated Total ({formatCurrency(totals.totalCents, formData.currency)})
                </button>
                <span className="text-xs text-amber-300/80 self-center">
                  or adjust line item rates below to match {formatCurrency(formData.spokenTotalCents, formData.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Missing Fields Checklist (Test D) */}
      {formData.missingFields && formData.missingFields.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-slate-200">
              Fields missing from voice input:
            </span>{" "}
            <span className="text-slate-400">
              {formData.missingFields.join(", ")}. Please review or provide missing customer details below before issuing.
            </span>
          </div>
        </div>
      )}

      {/* 3. Client & Supplier Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client Details */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4 text-emerald-400 font-semibold text-sm">
            <User className="w-4 h-4" />
            <span>Client Information (Bill To)</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Client / Company Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) =>
                  setFormData({ ...formData, clientName: e.target.value })
                }
                placeholder="e.g. Wayne Enterprises"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Billing Address
              </label>
              <textarea
                rows={2}
                value={formData.clientAddress}
                onChange={(e) =>
                  setFormData({ ...formData, clientAddress: e.target.value })
                }
                placeholder="e.g. 100 Gotham Boulevard, Suite 400"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Client Email
                </label>
                <input
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, clientEmail: e.target.value })
                  }
                  placeholder="accounts@client.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Client Phone
                </label>
                <input
                  type="tel"
                  value={formData.clientPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, clientPhone: e.target.value })
                  }
                  placeholder="+356 9900 1122"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Supplier / Business Details */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4 text-emerald-400 font-semibold text-sm">
            <Building className="w-4 h-4" />
            <span>Supplier Information (Issuer)</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Your Company Name
              </label>
              <input
                type="text"
                value={formData.supplierName}
                onChange={(e) =>
                  setFormData({ ...formData, supplierName: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  VAT Number
                </label>
                <input
                  type="text"
                  value={formData.supplierVatNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      supplierVatNumber: e.target.value,
                    })
                  }
                  placeholder="MT 2458-9912"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Company Email
                </label>
                <input
                  type="email"
                  value={formData.supplierEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, supplierEmail: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                IBAN / Bank Details
              </label>
              <input
                type="text"
                value={formData.supplierIban}
                onChange={(e) =>
                  setFormData({ ...formData, supplierIban: e.target.value })
                }
                placeholder="MT84BOVS0000000001234567890"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/60 font-mono text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Terms, Currency & VAT Configuration */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span>Currency, Dates & Tax Treatment</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  currency: e.target.value as CurrencyCode,
                })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/60"
            >
              <option value="EUR">EUR (€) — Euro</option>
              <option value="GBP">GBP (£) — British Pound</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Payment Terms (Test E)
            </label>
            <input
              type="text"
              value={formData.paymentTerms}
              onChange={(e) =>
                setFormData({ ...formData, paymentTerms: e.target.value })
              }
              placeholder="e.g. 14 days"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Service Date
            </label>
            <input
              type="date"
              value={formData.serviceDate}
              onChange={(e) =>
                setFormData({ ...formData, serviceDate: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Payment Due Date
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/60"
            />
          </div>
        </div>

        {/* VAT Options */}
        <div className="mt-5 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isVatRegistered}
              onChange={(e) =>
                setFormData({ ...formData, isVatRegistered: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-slate-200">
              VAT Registered Business
            </span>
          </label>

          {formData.isVatRegistered && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  VAT Rate (%)
                </label>
                <select
                  value={formData.vatRatePercent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      vatRatePercent: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/60"
                >
                  <option value={18}>18% (Malta Standard)</option>
                  <option value={20}>20% (UK Standard)</option>
                  <option value={5}>5% (Reduced)</option>
                  <option value={0}>0% (Zero-rated)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Pricing Mode (Test C)
                </label>
                <select
                  value={formData.isVatInclusive ? "inclusive" : "exclusive"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isVatInclusive: e.target.value === "inclusive",
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="exclusive">VAT Exclusive (Add VAT to net items)</option>
                  <option value="inclusive">VAT Inclusive (Gross amounts include 18%)</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 5. Line Items Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Line Items & Services</span>
          </h4>
          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Line Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-medium text-slate-400">
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 w-24">Qty</th>
                <th className="py-2.5 px-3 w-36">Unit Price</th>
                <th className="py-2.5 px-3 w-32 text-right">Line Total</th>
                <th className="py-2.5 px-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {formData.items.map((item, index) => {
                const qty = typeof item.quantity === "number" ? item.quantity : parseFloat(item.quantity) || 0;
                const unitPrice = parseFloat(item.unitPriceMajor) || 0;
                const itemTotalCents = Math.round(qty * (unitPrice * 100));

                return (
                  <tr key={index} className="hover:bg-slate-950/40">
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(index, "description", e.target.value)
                        }
                        placeholder="e.g. Labor or materials"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/60"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, "quantity", e.target.value)
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/60 text-center font-mono"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-slate-500 text-xs font-mono">
                          {formData.currency === "GBP" ? "£" : "€"}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPriceMajor}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "unitPriceMajor",
                              e.target.value
                            )
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-6 pr-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/60 text-right font-mono"
                        />
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-200">
                      {formatCurrency(itemTotalCents, formData.currency)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={formData.items.length <= 1}
                        className="text-slate-500 hover:text-rose-400 disabled:opacity-30 disabled:hover:text-slate-500 p-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calculated Totals Summary Box */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 space-y-1">
            <p>• Integer minor unit calculation eliminates floating-point rounding errors.</p>
            <p>• Compliant with Maltese VAT Act and UK HMRC standard invoice specifications.</p>
          </div>

          <div className="w-full sm:w-72 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal (Net):</span>
              <span className="font-mono">{formatCurrency(totals.subtotalCents, formData.currency)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>VAT ({formData.isVatRegistered ? `${formData.vatRatePercent}%` : "0%"}):</span>
              <span className="font-mono">{formatCurrency(totals.vatAmountCents, formData.currency)}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-base text-white">
              <span>Total Due:</span>
              <span className="font-mono text-emerald-400">
                {formatCurrency(totals.totalCents, formData.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Action Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Draft"}
        </button>

        {saveSuccessNotice && (
          <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Draft saved to database!
          </span>
        )}

        <button
          type="button"
          onClick={() => onProceedToPreview(formData)}
          disabled={discrepancy.hasDiscrepancy || !formData.clientName}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Preview PDF & Issue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
