import React, { useState } from 'react';
import { EmailCase, ThreatLevel } from '../types.js';
import { Search, Filter, AlertTriangle, ShieldCheck, ChevronRight, Trash2, Globe, FileCode, CheckCircle2, Lock } from 'lucide-react';

interface CaseListTableProps {
  cases: EmailCase[];
  selectedCaseId: string | null;
  onSelectCase: (caseItem: EmailCase) => void;
  onDeleteCase: (id: string, e: React.MouseEvent) => void;
  onOpenUpload: () => void;
}

export const CaseListTable: React.FC<CaseListTableProps> = ({
  cases,
  selectedCaseId,
  onSelectCase,
  onDeleteCase,
  onOpenUpload
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [verdictFilter, setVerdictFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredCases = cases.filter(c => {
    // Search match
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchSubject = c.subject.toLowerCase().includes(term);
      const matchFrom = c.from.address.toLowerCase().includes(term) || c.from.name.toLowerCase().includes(term);
      const matchDomain = c.from.domain.toLowerCase().includes(term);
      const matchCaseId = c.caseId.toLowerCase().includes(term);
      const matchIp = c.relayPath.some(r => r.ip.includes(term));
      if (!matchSubject && !matchFrom && !matchDomain && !matchCaseId && !matchIp) {
        return false;
      }
    }

    // Risk filter
    if (riskFilter !== 'ALL' && c.risk.category !== riskFilter) {
      return false;
    }

    // Verdict filter
    if (verdictFilter !== 'ALL' && c.ml.predictedClass !== verdictFilter) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'ALL' && c.status !== statusFilter) {
      return false;
    }

    return true;
  });

  const getRiskBadge = (category: ThreatLevel, score: number) => {
    switch (category) {
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-950/70 border border-rose-800 text-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            CRITICAL ({score})
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-950/70 border border-amber-800 text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            HIGH ({score})
          </span>
        );
      case 'Moderate':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-950/70 border border-blue-800 text-blue-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            MODERATE ({score})
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-950/70 border border-emerald-800 text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            LOW ({score})
          </span>
        );
    }
  };

  const getVerdictBadge = (label: string) => {
    switch (label) {
      case 'Phishing':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono px-1.5 py-0.5 rounded">PHISHING</span>;
      case 'BEC/Fraud':
        return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-mono px-1.5 py-0.5 rounded">BEC / FRAUD</span>;
      case 'Suspicious':
        return <span className="bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-mono px-1.5 py-0.5 rounded">SUSPICIOUS</span>;
      case 'Spam':
        return <span className="bg-slate-500/20 text-slate-300 border border-slate-500/40 text-[10px] font-mono px-1.5 py-0.5 rounded">SPAM</span>;
      case 'Legitimate':
      default:
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono px-1.5 py-0.5 rounded">LEGITIMATE</span>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg mb-8">
      {/* Table controls & filters */}
      <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-case-search"
            type="text"
            placeholder="Search cases by subject, sender, domain, IP, or Case ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Risk category filter */}
          <select
            id="select-risk-filter"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Risk Tiers</option>
            <option value="Critical">Critical (76 - 100)</option>
            <option value="High">High (51 - 75)</option>
            <option value="Moderate">Moderate (26 - 50)</option>
            <option value="Low">Low (0 - 25)</option>
          </select>

          {/* Verdict filter */}
          <select
            id="select-verdict-filter"
            value={verdictFilter}
            onChange={(e) => setVerdictFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All ML Verdicts</option>
            <option value="Phishing">Phishing</option>
            <option value="BEC/Fraud">BEC / Fraud</option>
            <option value="Suspicious">Suspicious</option>
            <option value="Legitimate">Legitimate</option>
            <option value="Spam">Spam</option>
          </select>

          {/* Status filter */}
          <select
            id="select-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="UNDER_INVESTIGATION">Under Investigation</option>
            <option value="RESOLVED">Resolved</option>
            <option value="FALSE_POSITIVE">False Positive</option>
          </select>

          <span className="text-xs text-slate-400 font-mono pl-2">
            Showing {filteredCases.length} of {cases.length}
          </span>
        </div>
      </div>

      {/* Table view */}
      {filteredCases.length === 0 ? (
        <div className="py-12 text-center">
          <AlertTriangle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-slate-300 font-medium text-sm">No forensic cases match current filters</p>
          <p className="text-slate-500 text-xs mt-1">Try resetting the search filters or ingest an email file.</p>
          <button
            onClick={onOpenUpload}
            className="mt-4 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            Ingest Email File (.eml)
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">Subject &amp; Sender</th>
                <th className="py-3 px-4">ML Verdict</th>
                <th className="py-3 px-4">Forensic Risk Score</th>
                <th className="py-3 px-4">Key Signals Flagged</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredCases.map(c => {
                const isSelected = selectedCaseId === c.id;
                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCase(c)}
                    className={`cursor-pointer transition hover:bg-slate-800/50 ${
                      isSelected ? 'bg-slate-800/80 border-l-2 border-emerald-500' : ''
                    }`}
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-semibold text-slate-200">{c.caseId}</div>
                      <div className="font-mono text-[10px] text-slate-500">{c.evidenceId}</div>
                    </td>

                    <td className="py-3 px-4 max-w-xs md:max-w-md">
                      <div className="font-medium text-slate-100 truncate hover:text-emerald-400">
                        {c.subject}
                      </div>
                      <div className="text-slate-400 text-[11px] truncate flex items-center gap-1.5 mt-0.5">
                        <span className="font-medium text-slate-300">{c.from.name || c.from.address}</span>
                        <span className="text-slate-500 font-mono">&lt;{c.from.address}&gt;</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div>{getVerdictBadge(c.ml.predictedClass)}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-1">
                        Confidence: {Math.round(c.ml.confidence * 100)}%
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div>{getRiskBadge(c.risk.category, c.risk.score)}</div>
                      <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div
                          className={`h-full rounded-full ${
                            c.risk.category === 'Critical'
                              ? 'bg-rose-500'
                              : c.risk.category === 'High'
                              ? 'bg-amber-500'
                              : c.risk.category === 'Moderate'
                              ? 'bg-blue-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${c.risk.score}%` }}
                        ></div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {c.authentication.displaySpoofDetected && (
                          <span className="bg-rose-950/70 border border-rose-800/80 text-rose-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
                            Display Spoof
                          </span>
                        )}
                        {c.urls.some(u => u.anchorMismatch) && (
                          <span className="bg-rose-950/70 border border-rose-800/80 text-rose-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
                            URL Mismatch
                          </span>
                        )}
                        {c.attachments.some(a => a.isExecutable || a.isDoubleExtension) && (
                          <span className="bg-rose-950/70 border border-rose-800/80 text-rose-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
                            Malicious Payload
                          </span>
                        )}
                        {c.authentication.spf.status === 'FAIL' && (
                          <span className="bg-amber-950/70 border border-amber-800/80 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
                            SPF Fail
                          </span>
                        )}
                        {c.authentication.dmarc.status === 'FAIL' && (
                          <span className="bg-amber-950/70 border border-amber-800/80 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
                            DMARC Fail
                          </span>
                        )}
                        {c.nlp.hiddenTextDetected && (
                          <span className="bg-purple-950/70 border border-purple-800/80 text-purple-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
                            Hidden Text
                          </span>
                        )}
                        {c.risk.positiveFactors.length === 0 && (
                          <span className="bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
                            Clean Verification
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[11px] font-mono text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        {c.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCase(c);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-xs font-medium transition flex items-center gap-1"
                        >
                          <span>Analyze</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => onDeleteCase(c.id, e)}
                          title="Delete Case"
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
