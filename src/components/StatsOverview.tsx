import React from 'react';
import { AlertOctagon, ShieldAlert, MailCheck, DollarSign, Clock, Layers } from 'lucide-react';

interface StatsProps {
  stats: {
    total: number;
    critical: number;
    high: number;
    moderate: number;
    low: number;
    phishingCount: number;
    becCount: number;
    suspiciousCount: number;
    legitimateCount: number;
    spamCount: number;
    openCases: number;
  };
}

export const StatsOverview: React.FC<StatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total Analyzed</span>
          <p className="text-2xl font-bold text-slate-100 mt-0.5">{stats.total}</p>
          <span className="text-[10px] text-slate-500 font-mono">Forensic Cases Ingested</span>
        </div>
        <div className="w-9 h-9 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
          <Layers className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-rose-400">Critical / High</span>
          <p className="text-2xl font-bold text-rose-300 mt-0.5">{stats.critical + stats.high}</p>
          <span className="text-[10px] text-rose-500/80 font-mono">Immediate Quarantine</span>
        </div>
        <div className="w-9 h-9 rounded-md bg-rose-950/50 border border-rose-800/60 flex items-center justify-center text-rose-400">
          <AlertOctagon className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-amber-400">Phish / Harvest</span>
          <p className="text-2xl font-bold text-amber-300 mt-0.5">{stats.phishingCount}</p>
          <span className="text-[10px] text-amber-500/80 font-mono">Credential Lures Flagged</span>
        </div>
        <div className="w-9 h-9 rounded-md bg-amber-950/50 border border-amber-800/60 flex items-center justify-center text-amber-400">
          <ShieldAlert className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-purple-400">BEC / Fraud</span>
          <p className="text-2xl font-bold text-purple-300 mt-0.5">{stats.becCount}</p>
          <span className="text-[10px] text-purple-500/80 font-mono">Exec &amp; Wire Diversion</span>
        </div>
        <div className="w-9 h-9 rounded-md bg-purple-950/50 border border-purple-800/60 flex items-center justify-center text-purple-400">
          <DollarSign className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between col-span-2 md:col-span-1">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">Legitimate Verified</span>
          <p className="text-2xl font-bold text-emerald-300 mt-0.5">{stats.legitimateCount}</p>
          <span className="text-[10px] text-emerald-500/80 font-mono">Aligned Cryptographic Proof</span>
        </div>
        <div className="w-9 h-9 rounded-md bg-emerald-950/50 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
          <MailCheck className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
