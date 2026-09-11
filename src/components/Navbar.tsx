import React from 'react';
import { Shield, Radio, Terminal, Cpu, PlusCircle, Sparkles } from 'lucide-react';

interface NavbarProps {
  activeCasesCount: number;
  criticalCount: number;
  onOpenUpload: () => void;
  onOpenModelMetrics: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeCasesCount,
  criticalCount,
  onOpenUpload,
  onOpenModelMetrics
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 px-4 lg:px-8 py-3.5 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-slate-100 text-base lg:text-lg tracking-tight">
                AI-Powered Email Threat Forensics
              </h1>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full">
                SOC TIER-3 DFIR
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Deterministic Security &bull; ML/NLP Classifier &bull; BGP Geolocation &bull; Campaign Correlation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Engine health badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>PIPELINE ONLINE</span>
          </div>

          {/* Critical alerts badge */}
          {criticalCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950/70 border border-rose-800/60 text-rose-300 text-xs font-mono">
              <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>{criticalCount} CRITICAL</span>
            </div>
          )}

          {/* Model telemetry button */}
          <button
            id="btn-model-telemetry"
            onClick={onOpenModelMetrics}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>ML Classifier Telemetry</span>
          </button>

          {/* Ingest / Analyze email button */}
          <button
            id="btn-ingest-email"
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ingest &amp; Analyze Email</span>
          </button>
        </div>
      </div>
    </header>
  );
};
