"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { AudioRecorder } from "@/components/AudioRecorder";
import { InvoiceEditor, InvoiceFormData } from "@/components/InvoiceEditor";
import { InvoicePreview } from "@/components/InvoicePreview";
import { IssueConfirmationModal } from "@/components/IssueConfirmationModal";
import { EmailHandoffModal } from "@/components/EmailHandoffModal";
import { InvoiceHistoryModal } from "@/components/InvoiceHistoryModal";
import { Sparkles, RefreshCw, AlertCircle, Shield, CheckCircle2 } from "lucide-react";
import { ExtractedInvoice } from "@/lib/extractionSchema";
import { calculateInvoiceTotals } from "@/lib/calculations";
import {
  validateInvoiceForIssuance,
  deriveDueDate,
} from "@/lib/issuanceValidation";

const DEFAULT_INVOICE_DATA: InvoiceFormData = {
  status: "draft",
  clientName: "",
  clientAddress: "",
  clientEmail: "",
  clientPhone: "",
  supplierName: "[DEMO] Matos Technical Solutions Ltd (Sample Business)",
  supplierAddress: "Sample Business Address, Tower Business Centre, Swatar, Malta [DEMO]",
  supplierEmail: "demo-invoicing@matos-solutions.sample",
  supplierPhone: "+356 0000 0000 [DEMO]",
  supplierVatNumber: "MT 0000-0000 [DEMO]",
  supplierBankName: "Sample Bank of Valletta [DEMO]",
  supplierIban: "MT00DEMO0000000000000000000",
  supplierBic: "DEMOMTM3",
  serviceDate: "",
  dueDate: "",
  paymentTerms: "14 days",
  currency: "EUR",
  isVatRegistered: true,
  vatRatePercent: 18,
  isVatInclusive: false,
  vatExemptReason: "",
  descriptionOfWork: "",
  notes: "",
  spokenTotalCents: null,
  rawTranscript: "",
  missingFields: [],
  items: [
    {
      description: "Service & labor",
      quantity: 1,
      unitPriceMajor: "100.00",
    },
  ],
};

export default function VoiceDocsPage() {
  const [currentStep, setCurrentStep] = useState<"record" | "edit" | "preview">("record");
  const [invoiceData, setInvoiceData] = useState<InvoiceFormData>(DEFAULT_INVOICE_DATA);
  const [hasExtractedData, setHasExtractedData] = useState(false);

  // Loading & network state
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [extractionNotice, setExtractionNotice] = useState<string | null>(null);

  // Modals state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // Issuance state
  const [assignedInvoiceNumber, setAssignedInvoiceNumber] = useState<string | null>(null);
  const [integrityHash, setIntegrityHash] = useState<string | null>(null);
  const [todayStr, setTodayStr] = useState("2026-10-28");

  // Fetch count of invoices and initialize client date on mount
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setTodayStr(today);
    setInvoiceData((prev) => ({
      ...prev,
      serviceDate: prev.serviceDate || today,
    }));

    fetch("/api/invoices")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.invoices)) {
          setSavedCount(data.invoices.length);
        }
      })
      .catch(() => {});
  }, []);

  // Handle incoming transcript from AudioRecorder
  const handleTranscriptReady = async (transcript: string) => {
    try {
      setIsExtracting(true);
      setGeneralError(null);
      setExtractionNotice(null);

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to extract invoice data.");
      }

      const ext: ExtractedInvoice = data.extracted;

      // Map extracted data into our interactive state
      const mappedItems =
        ext.lineItems && ext.lineItems.length > 0
          ? ext.lineItems.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPriceMajor: (item.unitPriceCents / 100).toFixed(2),
            }))
          : [
              {
                description: "Service & labor",
                quantity: 1,
                unitPriceMajor: "0.00",
              },
            ];

      setInvoiceData((prev) => ({
        ...prev,
        clientName: ext.clientName || "",
        clientAddress: ext.clientAddress || "",
        clientEmail: ext.clientEmail || "",
        clientPhone: ext.clientPhone || "",
        serviceDate: ext.serviceDate || prev.serviceDate,
        dueDate: ext.dueDate || "",
        paymentTerms: ext.paymentTerms || prev.paymentTerms,
        currency: ext.currency,
        isVatRegistered: ext.isVatRegistered,
        vatRatePercent: ext.vatRatePercent,
        isVatInclusive: ext.isVatInclusive,
        descriptionOfWork: ext.descriptionOfWork || "",
        notes: ext.notes || "",
        spokenTotalCents: ext.spokenTotalCents,
        rawTranscript: transcript,
        missingFields: ext.missingFields || [],
        items: mappedItems,
        status: "draft",
      }));

      setHasExtractedData(true);
      setAssignedInvoiceNumber(null);
      setIntegrityHash(null);

      if (data.notice) {
        setExtractionNotice(data.notice);
      }

      // Automatically transition to Review & Edit step
      setCurrentStep("edit");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGeneralError(`Extraction failed: ${msg}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Save Draft to PostgreSQL
  const handleSaveDraft = async (updatedData: InvoiceFormData) => {
    try {
      setIsSaving(true);
      setGeneralError(null);

      const payload = {
        invoiceNumber: updatedData.invoiceNumber,
        clientName: updatedData.clientName || "Untitled Client",
        clientAddress: updatedData.clientAddress,
        clientEmail: updatedData.clientEmail,
        clientPhone: updatedData.clientPhone,
        serviceDate: updatedData.serviceDate,
        dueDate: updatedData.dueDate,
        paymentTerms: updatedData.paymentTerms,
        currency: updatedData.currency,
        isVatRegistered: updatedData.isVatRegistered,
        vatRatePercent: updatedData.vatRatePercent,
        isVatInclusive: updatedData.isVatInclusive,
        vatExemptReason: updatedData.vatExemptReason,
        supplierName: updatedData.supplierName,
        supplierAddress: updatedData.supplierAddress,
        supplierEmail: updatedData.supplierEmail,
        supplierPhone: updatedData.supplierPhone,
        supplierVatNumber: updatedData.supplierVatNumber,
        supplierBankName: updatedData.supplierBankName,
        supplierIban: updatedData.supplierIban,
        supplierBic: updatedData.supplierBic,
        descriptionOfWork: updatedData.descriptionOfWork,
        spokenTotalCents: updatedData.spokenTotalCents,
        notes: updatedData.notes,
        rawTranscript: updatedData.rawTranscript,
        missingFields: updatedData.missingFields,
        items: updatedData.items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPriceCents: Math.round((parseFloat(it.unitPriceMajor) || 0) * 100),
        })),
      };

      const url = updatedData.id ? `/api/invoices/${updatedData.id}` : "/api/invoices";
      const method = updatedData.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (!resData.success) {
        throw new Error(resData.error || "Failed to save invoice.");
      }

      const mergedData: InvoiceFormData = {
        ...updatedData,
        id: resData.invoice.id,
        invoiceNumber: resData.invoice.invoiceNumber,
        status: resData.invoice.status,
      };

      setInvoiceData(mergedData);

      // Update count
      setSavedCount((prev) => (updatedData.id ? prev : prev + 1));
      return mergedData;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGeneralError(`Failed to save draft: ${msg}`);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Proceed to Preview Step
  const handleProceedToPreview = async (updatedData: InvoiceFormData) => {
    // Persist draft and guarantee page state preserves full user edits
    try {
      await handleSaveDraft(updatedData);
    } catch {
      // Allow proceeding even if db temporarily offline, keeping updated data
      setInvoiceData(updatedData);
    }
    setCurrentStep("preview");
  };

  // Issue Official Invoice
  const handleConfirmIssue = async (confirmDemoSupplier: boolean = false) => {
    let targetInvoiceId = invoiceData.id;
    if (!targetInvoiceId) {
      // Must save first to acquire DB record id
      try {
        const saved = await handleSaveDraft(invoiceData);
        targetInvoiceId = saved?.id || invoiceData.id;
      } catch {
        setGeneralError("Please save the draft invoice to database before issuing.");
        return;
      }
    }

    if (!targetInvoiceId) {
      setGeneralError("Invoice ID missing before issuing.");
      return;
    }

    try {
      setIsIssuing(true);
      setGeneralError(null);

      const res = await fetch(`/api/invoices/${targetInvoiceId}/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmedByUserId: "matos_operator",
          confirmDemoSupplier,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to issue invoice.");
      }

      setAssignedInvoiceNumber(data.invoice.invoiceNumber);
      setIntegrityHash(data.integrityHash);
      setInvoiceData((prev) => ({
        ...prev,
        status: "issued",
        invoiceNumber: data.invoice.invoiceNumber,
      }));

      setIsIssueModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGeneralError(`Issuance failed: ${msg}`);
    } finally {
      setIsIssuing(false);
    }
  };

  // Select invoice from history
  const handleSelectFromHistory = (loadedData: InvoiceFormData) => {
    setInvoiceData(loadedData);
    setHasExtractedData(true);
    setAssignedInvoiceNumber(loadedData.invoiceNumber || null);
    if (loadedData.status === "issued") {
      setCurrentStep("preview");
    } else {
      setCurrentStep("edit");
    }
  };

  // Calculate totals for modals
  const totalsForModals = calculateInvoiceTotals(
    invoiceData.items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPriceCents: Math.round((parseFloat(it.unitPriceMajor) || 0) * 100),
    })),
    {
      isVatRegistered: invoiceData.isVatRegistered,
      vatRatePercent: parseFloat(String(invoiceData.vatRatePercent)) || 0,
      isVatInclusive: invoiceData.isVatInclusive,
    }
  );

  const derivedDueDate = deriveDueDate(todayStr, invoiceData.paymentTerms);
  const issuanceValidation = validateInvoiceForIssuance({
    clientName: invoiceData.clientName,
    clientAddress: invoiceData.clientAddress,
    clientEmail: invoiceData.clientEmail,
    clientPhone: invoiceData.clientPhone,
    supplierName: invoiceData.supplierName,
    supplierAddress: invoiceData.supplierAddress,
    supplierEmail: invoiceData.supplierEmail,
    supplierPhone: invoiceData.supplierPhone,
    supplierVatNumber: invoiceData.supplierVatNumber,
    supplierBankName: invoiceData.supplierBankName,
    supplierIban: invoiceData.supplierIban,
    supplierBic: invoiceData.supplierBic,
    issueDate: todayStr,
    serviceDate: invoiceData.serviceDate,
    dueDate: invoiceData.dueDate,
    paymentTerms: invoiceData.paymentTerms,
    currency: invoiceData.currency,
    isVatRegistered: invoiceData.isVatRegistered,
    vatRatePercent: invoiceData.vatRatePercent,
    isVatInclusive: invoiceData.isVatInclusive,
    spokenTotalCents: invoiceData.spokenTotalCents,
    items: invoiceData.items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPriceCents: Math.round((parseFloat(it.unitPriceMajor) || 0) * 100),
    })),
    confirmDemoSupplier: true,
  });

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Header */}
      <Header
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        savedInvoicesCount={savedCount}
        onOpenHistory={() => setIsHistoryOpen(true)}
        hasExtractedData={hasExtractedData}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* General Error Banner */}
        {generalError && (
          <div className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Operation Notice</p>
              <p>{generalError}</p>
            </div>
          </div>
        )}

        {/* Extraction notice (e.g. key fallback notice) */}
        {extractionNotice && (
          <div className="mb-8 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-3 text-cyan-300 text-xs animate-in fade-in">
            <Shield className="w-4 h-4 flex-shrink-0 text-cyan-400 mt-0.5" />
            <div>
              <span className="font-semibold text-cyan-200">Extraction Engine: </span>
              <span>{extractionNotice}</span>
            </div>
          </div>
        )}

        {/* Extraction Loading Overlay */}
        {isExtracting && (
          <div className="my-12 p-12 rounded-3xl bg-slate-900/90 border border-slate-800 text-center flex flex-col items-center justify-center space-y-4 shadow-2xl backdrop-blur-md">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-pulse">
                <Sparkles className="w-8 h-8 text-slate-950" />
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-emerald-500/20 blur-sm animate-ping" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Extracting Invoice Details</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Parsing speech transcript into structured line items, amounts, VAT treatment, and payment terms...
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Structured extraction active</span>
            </div>
          </div>
        )}

        {/* STEP 1: Audio Recording / Speech Input */}
        {!isExtracting && currentStep === "record" && (
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2 mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                Step 1: Voice Recording & AI Transcription
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Draft Invoices by Speaking
              </h1>
              <p className="text-sm sm:text-base text-slate-400">
                Record your job summary on site, upload a voice memo, or test with our verified benchmark scenarios.
              </p>
            </div>

            <AudioRecorder
              onTranscriptReady={handleTranscriptReady}
              isProcessing={isExtracting}
            />
          </div>
        )}

        {/* STEP 2: Review & Financial Editor */}
        {!isExtracting && currentStep === "edit" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Step 2: AI Review & Deterministic Calculation
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Review & Adjust Invoice
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  Verify extracted line items and VAT treatment. Financial totals are calculated deterministically.
                </p>
              </div>

              {invoiceData.rawTranscript && (
                <div className="max-w-md bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  <span className="font-semibold text-slate-400 block mb-1">Original Voice Transcript:</span>
                  <p className="text-slate-300 line-clamp-2 italic font-sans">
                    &quot;{invoiceData.rawTranscript}&quot;
                  </p>
                </div>
              )}
            </div>

            <InvoiceEditor
              initialData={invoiceData}
              onSaveDraft={handleSaveDraft}
              onProceedToPreview={handleProceedToPreview}
              isSaving={isSaving}
            />
          </div>
        )}

        {/* STEP 3: Branded PDF & Issuance */}
        {!isExtracting && currentStep === "preview" && (
          <div className="space-y-8">
            <div className="text-center max-w-xl mx-auto space-y-2 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Shield className="w-3.5 h-3.5" />
                Step 3: Branded PDF & Document Snapshot
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Invoice Preview & Delivery
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Download publication-ready PDF, prepare customer email, or lock the record with an immutable SHA-256 audit digest.
              </p>
            </div>

            <InvoicePreview
              invoiceData={invoiceData}
              onBackToEdit={() => setCurrentStep("edit")}
              onOpenIssueModal={() => setIsIssueModalOpen(true)}
              onOpenEmailModal={() => setIsEmailModalOpen(true)}
              isIssued={invoiceData.status === "issued"}
              assignedInvoiceNumber={assignedInvoiceNumber}
              integrityHash={integrityHash}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">Matos VoiceDocs</span>
            <span>•</span>
            <span>Commercial Prototype for Matos Systems</span>
          </div>
          <div className="text-[11px] text-slate-600">
            Configurable VAT Engine • Internal SHA-256 Snapshot Integrity Audit • Prototype Only
          </div>
        </div>
      </footer>

      {/* Modals */}
      <IssueConfirmationModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onConfirm={handleConfirmIssue}
        isIssuing={isIssuing}
        clientName={invoiceData.clientName || "Customer"}
        totalCents={totalsForModals.totalCents}
        currency={invoiceData.currency}
        paymentTerms={invoiceData.paymentTerms}
        derivedDueDate={invoiceData.dueDate || derivedDueDate}
        validation={issuanceValidation}
        onReturnToEdit={() => setCurrentStep("edit")}
      />

      <EmailHandoffModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        invoiceData={invoiceData}
        totalCents={totalsForModals.totalCents}
        assignedInvoiceNumber={assignedInvoiceNumber}
      />

      <InvoiceHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectInvoice={handleSelectFromHistory}
        onRefreshCount={(c) => setSavedCount(c)}
      />
    </div>
  );
}
