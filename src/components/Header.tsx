"use client";

import React from "react";
import { Mic, FileText, CheckCircle2, History, Shield, Sparkles } from "lucide-react";

interface HeaderProps {
  currentStep: "record" | "edit" | "preview";
  onStepChange: (step: "record" | "edit" | "preview") => void;
  savedInvoicesCount: number;
  onOpenHistory: () => void;
  hasExtractedData: boolean;
}

export function Header({
  currentStep,
  onStepChange,
  savedInvoicesCount,
  onOpenHistory,
  hasExtractedData,
}: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-[#0b1222]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Company Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-[2px] shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Mic className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base sm:text-lg tracking-tight">
                  Matos VoiceDocs
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Shield className="w-3 h-3" />
                  Portfolio Prototype
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Voice-to-Invoice Drafting Engine for Trades & Small Business
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Steps indicator */}
            <nav className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => onStepChange("record")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentStep === "record"
                    ? "bg-emerald-500/15 text-emerald-400 shadow-sm border border-emerald-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span className="hidden md:inline">1.</span> Voice Input
              </button>

              <button
                onClick={() => hasExtractedData && onStepChange("edit")}
                disabled={!hasExtractedData}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentStep === "edit"
                    ? "bg-emerald-500/15 text-emerald-400 shadow-sm border border-emerald-500/30"
                    : hasExtractedData
                    ? "text-slate-400 hover:text-slate-200 cursor-pointer"
                    : "text-slate-600 cursor-not-allowed opacity-50"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden md:inline">2.</span> Review & Edit
              </button>

              <button
                onClick={() => hasExtractedData && onStepChange("preview")}
                disabled={!hasExtractedData}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentStep === "preview"
                    ? "bg-emerald-500/15 text-emerald-400 shadow-sm border border-emerald-500/30"
                    : hasExtractedData
                    ? "text-slate-400 hover:text-slate-200 cursor-pointer"
                    : "text-slate-600 cursor-not-allowed opacity-50"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">3.</span> PDF & Issue
              </button>
            </nav>

            {/* History Drawer Trigger */}
            <button
              onClick={onOpenHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition-colors shadow-sm"
              title="View saved drafts and issued invoices"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Records</span>
              {savedInvoicesCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] flex items-center justify-center font-bold">
                  {savedInvoicesCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
