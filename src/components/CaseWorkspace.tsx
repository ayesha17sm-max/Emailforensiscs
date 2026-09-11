import React, { useState } from 'react';
import {
  EmailCase,
  CaseStatus,
  ThreatLevel
} from '../types.js';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Lock,
  Globe,
  Link,
  Paperclip,
  Cpu,
  Network,
  Download,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  UserCheck,
  AlertOctagon,
  ArrowRight,
  Terminal,
  Send,
  X,
  Layers,
  Activity
} from 'lucide-react';
import { GraphView } from './GraphView.js';

interface CaseWorkspaceProps {
  emailCase: EmailCase;
  onUpdateCase: (updates: {
    status?: CaseStatus;
    analystVerdict?: EmailCase['analystVerdict'];
    analystNotes?: string;
    analystName?: string;
  }) => void;
  onClose: () => void;
}

export const CaseWorkspace: React.FC<CaseWorkspaceProps> = ({ emailCase, onUpdateCase, onClose }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'auth' | 'relay' | 'urls' | 'attachments' | 'content' | 'graph' | 'stix'
  >('overview');

  const [copiedHash, setCopiedHash] = useState(false);
  const [notes, setNotes] = useState(emailCase.analystNotes || '');
  const [feedbackLabel, setFeedbackLabel] = useState<string>(emailCase.ml.predictedClass);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [stixBundle, setStixBundle] = useState<any>(null);
  const [showStixModal, setShowStixModal] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');

  const copySha256 = () => {
    navigator.clipboard.writeText(emailCase.sha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as CaseStatus;
    onUpdateCase({ status: newStatus });
  };

  const handleSaveNotes = () => {
    onUpdateCase({ analystNotes: notes });
  };

  const handleSendFeedback = async () => {
    try {
      const res = await fetch(`/api/cases/${emailCase.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackLabel,
          comment: feedbackComment,
          analystName: 'SOC Analyst'
        })
      });
      if (res.ok) {
        setFeedbackSubmitted(true);
        setTimeout(() => setFeedbackSubmitted(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadStix = async () => {
    try {
      const res = await fetch(`/api/cases/${emailCase.id}/report`);
      const data = await res.json();
      setStixBundle(data.stixBundle);
      setShowStixModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const getRiskColor = (cat: ThreatLevel) => {
    switch (cat) {
      case 'Critical': return 'text-rose-400 bg-rose-950/70 border-rose-800';
      case 'High': return 'text-amber-400 bg-amber-950/70 border-amber-800';
      case 'Moderate': return 'text-blue-400 bg-blue-950/70 border-blue-800';
      case 'Low': return 'text-emerald-400 bg-emerald-950/70 border-emerald-800';
    }
  };

  const getAuthBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">PASS</span>;
      case 'FAIL':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">FAIL</span>;
      case 'NOT_VERIFIED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">NOT VERIFIED</span>;
      case 'NOT_AVAILABLE':
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">NOT AVAILABLE</span>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl mb-8">
      {/* Workspace Header Banner */}
      <div className="p-5 border-b border-slate-800 bg-slate-950/70">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                {emailCase.caseId}
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Evidence: {emailCase.evidenceId}
              </span>
              {emailCase.originalFilename?.toLowerCase().includes('demo') || emailCase.caseId?.toLowerCase().includes('demo') || emailCase.tags?.includes('DEMO') ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/70 text-amber-300 border border-amber-700">
                  DEMO DATA (PRE-CONFIGURED SCENARIO)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-700">
                  ACTUAL LIVE EVIDENCE ANALYSIS
                </span>
              )}
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getRiskColor(emailCase.risk.category)}`}>
                {emailCase.risk.category.toUpperCase()} RISK ({emailCase.risk.score}/100)
              </span>
              <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-mono px-2 py-0.5 rounded">
                {emailCase.ml.predictedClass.toUpperCase()}
              </span>
            </div>

            <h2 className="text-lg font-bold text-slate-100 tracking-tight leading-snug">
              {emailCase.subject}
            </h2>

            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-400 font-mono">
              <div>
                <span className="text-slate-500">From: </span>
                <span className="text-slate-200 font-medium">{emailCase.from.name}</span>{' '}
                <span className="text-slate-400">&lt;{emailCase.from.address}&gt;</span>
              </div>
              <div>
                <span className="text-slate-500">Origin Domain: </span>
                <span className="text-emerald-400">{emailCase.from.domain}</span>
              </div>
              <div>
                <span className="text-slate-500">Date: </span>
                <span className="text-slate-300">{emailCase.date ? new Date(emailCase.date).toLocaleString() : 'N/A'}</span>
              </div>
            </div>

            {/* SHA256 integrity hash */}
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 pt-1">
              <span className="text-slate-500">SHA-256:</span>
              <span className="text-slate-300 select-all">{emailCase.sha256}</span>
              <button
                onClick={copySha256}
                title="Copy SHA-256 Hash"
                className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
              >
                {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Quick Actions & Status */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <label className="text-xs font-mono text-slate-400">Status:</label>
              <select
                id="select-case-status"
                value={emailCase.status}
                onChange={handleStatusChange}
                className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="NEW">NEW</option>
                <option value="UNDER_INVESTIGATION">UNDER INVESTIGATION</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="FALSE_POSITIVE">FALSE POSITIVE</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/api/cases/${emailCase.id}/download-eml`}
                download={emailCase.originalFilename}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Download .EML</span>
              </a>
              <button
                onClick={loadStix}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 flex items-center gap-1.5 transition"
              >
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                <span>STIX 2.1 Bundle</span>
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 px-4 bg-slate-950/60 overflow-x-auto text-xs font-medium">
        <button
          id="tab-btn-overview"
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-3.5 border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Threat &amp; Risk Scoring</span>
        </button>

        <button
          id="tab-btn-auth"
          onClick={() => setActiveTab('auth')}
          className={`py-3 px-3.5 border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
            activeTab === 'auth'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Email Authentication &amp; Headers</span>
        </button>

        <button
          id="tab-btn-relay"
          onClick={() => setActiveTab('relay')}
          className={`py-3 px-3.5 border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
            activeTab === 'relay'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Relay Route &amp; Geolocation ({emailCase.relayPath.length} hops)</span>
        </button>

        <button
          id="tab-btn-urls"
          onClick={() => setActiveTab('urls')}
          className={`py-3 px-3.5 border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
            activeTab === 'urls'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Link className="w-4 h-4" />
          <span>URLs &amp; Domains ({emailCase.urls.length})</span>
        </button>

        <button
          id="tab-btn-attachments"
          onClick={() => setActiveTab('attachments')}
          className={`py-3 px-3.5 border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
            activeTab === 'attachments'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Paperclip className="w-4 h-4" />
          <span>Attachments ({emailCase.attachments.length})</span>
        </button>

        <button
          id="tab-btn-content"
          onClick={() => setActiveTab('content')}
          className={`py-3 px-3.5 border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
            activeTab === 'content'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Content &amp; NLP Signals</span>
        </button>

        <button
          id="tab-btn-graph"
          onClick={() => setActiveTab('graph')}
          className={`py-3 px-3.5 border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
            activeTab === 'graph'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Campaign Correlation Graph</span>
        </button>

        <button
          id="tab-btn-stix"
          onClick={() => setActiveTab('stix')}
          className={`py-3 px-3.5 border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
            activeTab === 'stix'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Custody &amp; Retraining Feedback</span>
        </button>
      </div>

      {/* Tab 1: Overview & Risk Scoring */}
      {activeTab === 'overview' && (
        <div className="p-6 space-y-6">
          {/* AI / DFIR Narrative Briefing */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Forensic Incident Briefing &amp; TTPs
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                Engine: {emailCase.aiNarrative.modelUsed}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {emailCase.aiNarrative.executiveSummary}
            </p>

            <div className="mt-3 p-3 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Adversary Tactics, Techniques &amp; Procedures (MITRE ATT&amp;CK)
              </span>
              <p className="text-xs font-mono text-amber-300/90">
                {emailCase.aiNarrative.threatActorTTPs}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                  Key Evidence Grounding
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300 font-sans">
                  {emailCase.aiNarrative.evidenceHighlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                  Recommended SOC Response
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300 font-sans">
                  {emailCase.aiNarrative.recommendedActions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Explainable Risk Scoring Math Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Risk Gauge & Summary */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Calculated Risk Score
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-bold font-mono text-slate-100">
                    {emailCase.risk.score}
                  </span>
                  <span className="text-sm font-mono text-slate-500">/ 100</span>
                  <span className={`ml-auto px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${getRiskColor(emailCase.risk.category)}`}>
                    {emailCase.risk.category}
                  </span>
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full rounded-full ${
                      emailCase.risk.category === 'Critical' ? 'bg-rose-500' :
                      emailCase.risk.category === 'High' ? 'bg-amber-500' :
                      emailCase.risk.category === 'Moderate' ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${emailCase.risk.score}%` }}
                  ></div>
                </div>

                <p className="text-xs text-slate-400 mt-3 leading-snug">
                  Aggregated from {emailCase.risk.positiveFactors.length} positive risk drivers and{' '}
                  {emailCase.risk.negativeFactors.length} cryptographic mitigating signals.
                </p>
              </div>

              {/* Signals that could not be evaluated */}
              {emailCase.risk.unavailableSignals.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                    Transparent Signal Disclaimers
                  </span>
                  <ul className="text-[11px] font-mono text-slate-400 space-y-1">
                    {emailCase.risk.unavailableSignals.map((u, i) => (
                      <li key={i} className="text-slate-400">&bull; {u}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Positive Factors (Risk Adders) */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 flex items-center gap-1.5 mb-3 font-semibold">
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Positive Risk Contributors (+Points)</span>
              </span>

              {emailCase.risk.positiveFactors.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No adverse threat factors identified.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {emailCase.risk.positiveFactors.map((f, i) => (
                    <div key={i} className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-rose-300 block">{f.rule}</span>
                        <span className="text-xs text-slate-300">{f.description}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/50 shrink-0">
                        +{f.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Negative Factors (Risk Mitigators) & ML Probabilities */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-2 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Mitigating Factors (-Points)</span>
                </span>
                {emailCase.risk.negativeFactors.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No cryptographic mitigations passed.</p>
                ) : (
                  <div className="space-y-1.5">
                    {emailCase.risk.negativeFactors.map((f, i) => (
                      <div key={i} className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-emerald-300 block">{f.rule}</span>
                          <span className="text-xs text-slate-300">{f.description}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50 shrink-0">
                          {f.points}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ML Multi-Class Probabilities */}
              <div className="pt-3 border-t border-slate-800">
                <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 mb-2 font-semibold">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>ML Probability Distribution</span>
                </span>
                <div className="space-y-1.5">
                  {Object.entries(emailCase.ml.probabilities).map(([cls, probVal]) => {
                    const prob = Number(probVal) || 0;
                    return (
                      <div key={cls} className="text-xs font-mono">
                        <div className="flex justify-between text-slate-300 text-[11px]">
                          <span>{cls}</span>
                          <span>{Math.round(prob * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-0.5">
                          <div
                            className={`h-full ${
                              cls === 'Phishing' ? 'bg-amber-400' :
                              cls === 'BEC/Fraud' ? 'bg-purple-400' :
                              cls === 'Legitimate' ? 'bg-emerald-400' : 'bg-slate-400'
                            }`}
                            style={{ width: `${prob * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Evidence Sources & Detection Methods Architecture Section */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
                  Evidence Sources &amp; Detection Methods Breakdown
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>6 Independent Analytical Engines</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Source 1: Deterministic Auth */}
              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Deterministic Auth</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      RFC 7208/6376
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Cryptographic signature and DNS policy enforcement. Evaluates SPF, DKIM, and DMARC alignment deterministically.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                  <span className={`px-1.5 py-0.5 rounded border ${
                    emailCase.authentication.spf.status === 'PASS' ? 'text-emerald-300 bg-emerald-950/60 border-emerald-800' :
                    emailCase.authentication.spf.status === 'FAIL' ? 'text-rose-300 bg-rose-950/60 border-rose-800' :
                    'text-slate-400 bg-slate-800 border-slate-700'
                  }`}>
                    SPF: {emailCase.authentication.spf.status}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded border ${
                    emailCase.authentication.dkim.status === 'PASS' ? 'text-emerald-300 bg-emerald-950/60 border-emerald-800' :
                    emailCase.authentication.dkim.status === 'FAIL' ? 'text-rose-300 bg-rose-950/60 border-rose-800' :
                    'text-slate-400 bg-slate-800 border-slate-700'
                  }`}>
                    DKIM: {emailCase.authentication.dkim.status}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded border ${
                    emailCase.authentication.dmarc.status === 'PASS' ? 'text-emerald-300 bg-emerald-950/60 border-emerald-800' :
                    emailCase.authentication.dmarc.status === 'FAIL' ? 'text-rose-300 bg-rose-950/60 border-rose-800' :
                    'text-slate-400 bg-slate-800 border-slate-700'
                  }`}>
                    DMARC: {emailCase.authentication.dmarc.status}
                  </span>
                </div>
              </div>

              {/* Source 2: Content NLP Machine Learning */}
              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Content NLP Model</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800">
                      TF-IDF + LogReg
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Statistical TF-IDF unigram/bigram vectorizer with Softmax Logistic Regression trained on phishing, BEC, and legitimate corpuses.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Class:</span>
                  <span className="font-semibold text-indigo-300">
                    {emailCase.ml.nlpModel?.predictedClass || emailCase.ml.predictedClass} ({Math.round((emailCase.ml.nlpModel?.confidence || emailCase.ml.confidence) * 100)}%)
                  </span>
                </div>
              </div>

              {/* Source 3: Technical Security Signals ML */}
              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Technical Signals ML</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                      Random Forest
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    10-Tree Random Forest trained on 16 protocol indicators (SPF/DKIM, domain mismatch, URL shorteners, payload vectors).
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Verdict:</span>
                  <span className="font-semibold text-emerald-300">
                    {emailCase.ml.technicalModel?.predictedClass || emailCase.ml.predictedClass} ({Math.round((emailCase.ml.technicalModel?.confidence || 0.85) * 100)}%)
                  </span>
                </div>
              </div>

              {/* Source 4: Network & MTA Relay Hop Tracing */}
              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      <span>MTA Relay Tracing</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      RFC 822 Received
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Trace of all intermediate mail servers with ASN, reverse DNS, and hop trust assessment. Geolocation reflects server routing, not physical attacker identity.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Observed Hops:</span>
                  <span className="font-semibold text-cyan-300">{emailCase.relayPath.length} MTA nodes</span>
                </div>
              </div>

              {/* Source 5: URL & Domain Intelligence */}
              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                      <Link className="w-3.5 h-3.5 text-amber-400" />
                      <span>URL &amp; Domain Analysis</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Heuristics + Intel
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Levenshtein lookalike detection, Shannon entropy, anchor-text mismatch, and multi-feed threat intelligence queries.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Links / Domains:</span>
                  <span className="font-semibold text-amber-300">{emailCase.urls.length} URLs, {emailCase.domains.length} Domains</span>
                </div>
              </div>

              {/* Source 6: Attachment & MIME Dissection */}
              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-rose-400" />
                      <span>MIME &amp; Payload Inspection</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      SHA-256 + Magic Bytes
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Dissection of attached files: double extension detection, executable &amp; macro screening, and cryptographic hashing.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Payload Count:</span>
                  <span className="font-semibold text-rose-300">{emailCase.attachments.length} Attachment(s)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Authentication & Headers */}
      {activeTab === 'auth' && (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* SPF Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-slate-300">SPF Record</span>
                {getAuthBadge(emailCase.authentication.spf.status)}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-snug">
                {emailCase.authentication.spf.details}
              </p>
            </div>

            {/* DKIM Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-slate-300">DKIM Signature</span>
                {getAuthBadge(emailCase.authentication.dkim.status)}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-snug">
                {emailCase.authentication.dkim.details}
              </p>
            </div>

            {/* DMARC Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-slate-300">DMARC Alignment</span>
                {getAuthBadge(emailCase.authentication.dmarc.status)}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-snug">
                {emailCase.authentication.dmarc.details}
              </p>
            </div>

            {/* ARC Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-slate-300">ARC Forwarding</span>
                {getAuthBadge(emailCase.authentication.arc.status)}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-snug">
                {emailCase.authentication.arc.details}
              </p>
            </div>
          </div>

          {/* Identity Mismatches & Display Spoofing */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono mb-3">
              Identity Alignment &amp; Header Discrepancies
            </h3>
            {emailCase.authentication.detectedMismatches.length === 0 ? (
              <div className="p-3 rounded bg-emerald-950/30 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>No identity mismatches, display name impersonations, or envelope spoofing detected.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {emailCase.authentication.detectedMismatches.map((m, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs font-mono flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Raw RFC 822 Headers Viewer */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
                Message Header Inspection
              </h3>
              <input
                type="text"
                placeholder="Filter header keys..."
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500 w-52"
              />
            </div>
            <div className="bg-slate-900 rounded-lg p-3 max-h-72 overflow-y-auto font-mono text-xs text-slate-300 space-y-2">
              {Object.entries(emailCase.rawHeaders)
                .filter(([key]) => !headerSearch.trim() || key.toLowerCase().includes(headerSearch.toLowerCase()))
                .map(([key, value]) => (
                  <div key={key} className="border-b border-slate-800/60 pb-1.5">
                    <span className="text-emerald-400 font-bold">{key}: </span>
                    <span className="text-slate-300 break-all">
                      {Array.isArray(value) ? value.join('\n') : String(value)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: SMTP Relay Path & Geolocation */}
      {activeTab === 'relay' && (
        <div className="p-6 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>Reconstructed SMTP Relay Route &amp; Associated Infrastructure</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hops ordered chronologically from origin transit MTA to the recipient enterprise MX gateway.
                </p>
              </div>
            </div>

            {/* Forensic Disclaimer */}
            <div className="mb-4 p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-400 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-300">Forensic Integrity Notice: </strong>
                <span>
                  Received headers prior to the first verified internal MX gateway can theoretically be forged by an adversary. IP geolocation identifies the announced autonomous system and ISP routing location of the mail transfer agent; it does <em>not</em> prove the physical identity or home address of the human threat actor.
                </span>
              </div>
            </div>

            {/* Relay Hops Timeline */}
            <div className="space-y-3">
              {emailCase.relayPath.map((hop, idx) => {
                const isEarliest = idx === 0;
                const isUntrusted = hop.trustAssessment === 'untrusted/possibly forged hop';
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isUntrusted
                        ? 'bg-rose-950/20 border-rose-800/80'
                        : isEarliest
                        ? 'bg-amber-950/20 border-amber-800/80'
                        : 'bg-slate-900/70 border-slate-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          Hop #{hop.hopNumber}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          hop.trustAssessment === 'trusted hop'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : hop.trustAssessment === 'earliest observed IP'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-rose-950 text-rose-300 border-rose-800'
                        }`}>
                          {hop.trustAssessment.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-xs font-mono text-slate-200 flex items-center gap-2 flex-wrap mt-1">
                        <span className="font-bold text-emerald-400">{hop.ip}</span>
                        <span className="text-slate-500">from</span>
                        <span className="text-slate-300">{hop.hostname}</span>
                        {hop.byHost && (
                          <>
                            <span className="text-slate-500">by</span>
                            <span className="text-slate-400">{hop.byHost}</span>
                          </>
                        )}
                      </div>

                      <div className="text-[11px] font-mono text-slate-400">
                        <span>Associated Infrastructure: </span>
                        <span className="text-slate-200">{hop.city}, {hop.country}</span> &bull;{' '}
                        <span>{hop.org} ({hop.asn})</span>
                      </div>
                    </div>

                    <div className="text-right text-[11px] font-mono text-slate-500 shrink-0">
                      {hop.timestamp || 'No RFC date parsed'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: URLs & Domains */}
      {activeTab === 'urls' && (
        <div className="p-6 space-y-6">
          {/* URLs Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono mb-3">
              Extracted Hyperlinks &amp; Redirect Analysis ({emailCase.urls.length})
            </h3>
            {emailCase.urls.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No hyperlinks were extracted from message body.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Verdict</th>
                      <th className="py-2 px-3">Destination Domain</th>
                      <th className="py-2 px-3">Displayed Anchor Text</th>
                      <th className="py-2 px-3">Full Landing URL</th>
                      <th className="py-2 px-3">Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {emailCase.urls.map(u => (
                      <tr key={u.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.verdict === 'MALICIOUS' ? 'bg-rose-950 text-rose-300 border-rose-800' :
                            u.verdict === 'SUSPICIOUS' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                            'bg-emerald-950 text-emerald-300 border-emerald-800'
                          }`}>
                            {u.verdict}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-200">
                          {u.domain}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate text-slate-300">
                          {u.anchorText || <span className="text-slate-500 italic">None</span>}
                          {u.anchorMismatch && (
                            <span className="ml-1 text-[10px] text-rose-400 font-bold block">
                              [ANCHOR MISMATCH]
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 max-w-sm truncate text-slate-400 select-all">
                          {u.rawUrl}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {u.isLookalike && (
                              <span className="bg-rose-950 text-rose-300 border border-rose-800 text-[9px] px-1.5 py-0.5 rounded">
                                Typosquat ({u.lookalikeTarget})
                              </span>
                            )}
                            {u.isShortened && (
                              <span className="bg-amber-950 text-amber-300 border border-amber-800 text-[9px] px-1.5 py-0.5 rounded">
                                Shortener
                              </span>
                            )}
                            {u.isSuspiciousTld && (
                              <span className="bg-amber-950 text-amber-300 border border-amber-800 text-[9px] px-1.5 py-0.5 rounded">
                                Abuse TLD
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Extracted Domains */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono mb-3">
              Domain DNS &amp; Lexical Entropy Intelligence
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {emailCase.domains.map(d => (
                <div key={d.domain} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">{d.domain}</span>
                    <span className="text-[10px] text-slate-400 uppercase bg-slate-800 px-1.5 py-0.5 rounded">
                      Source: {d.source}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Shannon Entropy: <span className="text-slate-200">{d.entropy}</span> &bull;{' '}
                    MX Records: <span className={d.hasMx ? 'text-emerald-400' : 'text-rose-400'}>{d.hasMx ? 'Configured' : 'Missing'}</span>
                  </div>
                  {d.flags.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1">
                      {d.flags.map((f, i) => (
                        <span key={i} className="text-[10px] bg-rose-950/70 border border-rose-800 text-rose-300 px-1.5 py-0.5 rounded">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Attachments */}
      {activeTab === 'attachments' && (
        <div className="p-6 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono mb-3">
              Attached Payloads &amp; Document Analysis ({emailCase.attachments.length})
            </h3>
            {emailCase.attachments.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No attachments detected in MIME boundaries.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Verdict</th>
                      <th className="py-2 px-3">Filename</th>
                      <th className="py-2 px-3">Declared MIME</th>
                      <th className="py-2 px-3">Size</th>
                      <th className="py-2 px-3">Payload SHA-256</th>
                      <th className="py-2 px-3">Threat Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {emailCase.attachments.map(a => (
                      <tr key={a.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            a.verdict === 'MALICIOUS' ? 'bg-rose-950 text-rose-300 border-rose-800' :
                            a.verdict === 'SUSPICIOUS' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                            'bg-emerald-950 text-emerald-300 border-emerald-800'
                          }`}>
                            {a.verdict}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-200">
                          {a.filename}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {a.mimeType}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {(a.sizeBytes / 1024).toFixed(1)} KB
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 select-all truncate max-w-xs">
                          {a.sha256}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {a.flags.map((fl, i) => (
                              <span key={i} className="bg-rose-950 text-rose-300 border border-rose-800 text-[9px] px-1.5 py-0.5 rounded">
                                {fl}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Content & NLP Signals */}
      {activeTab === 'content' && (
        <div className="p-6 space-y-6">
          {/* Signal meters */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] font-mono uppercase text-slate-400">Urgency</span>
              <p className="text-xl font-bold font-mono text-amber-400 mt-0.5">{emailCase.nlp.urgencyScore}%</p>
              <div className="text-[10px] text-slate-500 truncate mt-1">
                {emailCase.nlp.urgencyKeywords.join(', ') || 'None'}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] font-mono uppercase text-slate-400">Financial Wire</span>
              <p className="text-xl font-bold font-mono text-purple-400 mt-0.5">{emailCase.nlp.financialScore}%</p>
              <div className="text-[10px] text-slate-500 truncate mt-1">
                {emailCase.nlp.financialKeywords.join(', ') || 'None'}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] font-mono uppercase text-slate-400">Credential Solicitation</span>
              <p className="text-xl font-bold font-mono text-rose-400 mt-0.5">{emailCase.nlp.credentialScore}%</p>
              <div className="text-[10px] text-slate-500 truncate mt-1">
                {emailCase.nlp.credentialKeywords.join(', ') || 'None'}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] font-mono uppercase text-slate-400">Impersonation</span>
              <p className="text-xl font-bold font-mono text-sky-400 mt-0.5">{emailCase.nlp.impersonationScore}%</p>
              <div className="text-[10px] text-slate-500 truncate mt-1">
                {emailCase.nlp.impersonationKeywords.join(', ') || 'None'}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 col-span-2 md:col-span-1">
              <span className="text-[10px] font-mono uppercase text-slate-400">Hidden Text</span>
              <p className={`text-xl font-bold font-mono mt-0.5 ${emailCase.nlp.hiddenTextDetected ? 'text-rose-400' : 'text-emerald-400'}`}>
                {emailCase.nlp.hiddenTextDetected ? 'DETECTED' : 'CLEAN'}
              </p>
              <div className="text-[10px] text-slate-500 truncate mt-1">
                {emailCase.nlp.hiddenTextSnippet || 'No zero-font/CSS hides'}
              </div>
            </div>
          </div>

          {/* Email Body Preview */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono mb-3">
              Normalized Message Body Content
            </h3>
            <pre className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
              {emailCase.normalizedText || emailCase.plainTextBody}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 7: Graph-Based Correlation */}
      {activeTab === 'graph' && (
        <div className="p-6">
          <GraphView caseId={emailCase.id} />
        </div>
      )}

      {/* Tab 8: Chain of Custody & Analyst Retraining */}
      {activeTab === 'stix' && (
        <div className="p-6 space-y-6">
          {/* Audit Log / Chain of Custody */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono mb-3">
              Digital Evidence Chain of Custody &amp; Audit Log
            </h3>
            <div className="space-y-2">
              {emailCase.auditLog.map((entry, idx) => (
                <div key={idx} className="p-2.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono flex items-start justify-between gap-4">
                  <div>
                    <span className="text-emerald-400 font-bold">{entry.action}</span> &bull;{' '}
                    <span className="text-slate-300">{entry.details}</span>
                  </div>
                  <div className="text-right text-[11px] text-slate-500 shrink-0">
                    <span>{entry.analyst}</span> &bull; <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Analyst Sign-Off & Model Feedback */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono mb-2">
              Analyst Feedback Loop (Active Learning &amp; Model Calibration)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Override or validate the automated classification. Submitting feedback appends this email to the supervised dataset and automatically re-evaluates model weights.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Validated Ground-Truth Label:
                </label>
                <select
                  id="select-feedback-label"
                  value={feedbackLabel}
                  onChange={(e) => setFeedbackLabel(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500"
                >
                  <option value="Legitimate">Legitimate</option>
                  <option value="Phishing">Phishing</option>
                  <option value="BEC/Fraud">BEC / Fraud</option>
                  <option value="Suspicious">Suspicious</option>
                  <option value="Spam">Spam</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Analyst Rationale / Notes:
                </label>
                <input
                  type="text"
                  placeholder="e.g., Aligned vendor invoice with verified phone confirmation..."
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              {feedbackSubmitted ? (
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Feedback saved and model retrained!
                </span>
              ) : (
                <span className="text-xs text-slate-500 font-mono">
                  Updates model accuracy metrics in real-time
                </span>
              )}

              <button
                id="btn-submit-feedback"
                onClick={handleSendFeedback}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Feedback &amp; Retrain Model</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STIX 2.1 Modal */}
      {showStixModal && stixBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>STIX 2.1 Threat Intelligence Bundle</span>
              </h3>
              <button
                onClick={() => setShowStixModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <pre className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 whitespace-pre overflow-x-auto">
                {JSON.stringify(stixBundle, null, 2)}
              </pre>
            </div>
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(stixBundle, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `stix_${emailCase.caseId}.json`;
                  a.click();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download STIX 2.1 JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
