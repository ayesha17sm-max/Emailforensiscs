import React, { useEffect, useState, useRef } from 'react';
import { EmailCase, CaseStatus } from './types.js';
import { Navbar } from './components/Navbar.js';
import { StatsOverview } from './components/StatsOverview.js';
import { CaseListTable } from './components/CaseListTable.js';
import { CaseWorkspace } from './components/CaseWorkspace.js';
import { UploadModal } from './components/UploadModal.js';
import { ModelMetricsModal } from './components/ModelMetricsModal.js';
import { Shield, Info, AlertTriangle } from 'lucide-react';

export default function App() {
  const [cases, setCases] = useState<EmailCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<EmailCase | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    phishingCount: 0,
    becCount: 0,
    suspiciousCount: 0,
    legitimateCount: 0,
    spamCount: 0,
    openCases: 0
  });
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isModelMetricsOpen, setIsModelMetricsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const fetchCasesAndStats = async () => {
    try {
      const [casesRes, statsRes] = await Promise.all([
        fetch('/api/cases'),
        fetch('/api/stats')
      ]);

      if (casesRes.ok) {
        const casesData = await casesRes.json();
        setCases(casesData);
        // If nothing is selected yet and we have cases, pre-select the first high-severity case for immediate inspection
        if (!selectedCase && casesData.length > 0) {
          const firstHigh = casesData.find((c: EmailCase) => c.risk.category === 'Critical' || c.risk.category === 'High') || casesData[0];
          setSelectedCase(firstHigh);
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to fetch cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCasesAndStats();
  }, []);

  const handleSelectCase = async (caseItem: EmailCase) => {
    try {
      const res = await fetch(`/api/cases/${caseItem.id}`);
      if (res.ok) {
        const detailedCase = await res.json();
        setSelectedCase(detailedCase);
      } else {
        setSelectedCase(caseItem);
      }
      setTimeout(() => {
        workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } catch (e) {
      setSelectedCase(caseItem);
    }
  };

  const handleDeleteCase = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this forensic case from local investigation storage?')) {
      return;
    }
    try {
      const res = await fetch(`/api/cases/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedCase?.id === id) {
          setSelectedCase(null);
        }
        await fetchCasesAndStats();
      }
    } catch (err) {
      console.error('Failed to delete case:', err);
    }
  };

  const handleUpdateCase = async (updates: {
    status?: CaseStatus;
    analystVerdict?: EmailCase['analystVerdict'];
    analystNotes?: string;
    analystName?: string;
  }) => {
    if (!selectedCase) return;

    try {
      const res = await fetch(`/api/cases/${selectedCase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedCase(updated);
        setCases(prev => prev.map(c => (c.id === updated.id ? updated : c)));
        // Refresh stats
        fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to update case:', err);
    }
  };

  const handleCaseAnalyzed = (newCase: EmailCase) => {
    setCases(prev => [newCase, ...prev.filter(c => c.id !== newCase.id)]);
    setSelectedCase(newCase);
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {});
    setTimeout(() => {
      workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Navigation Header */}
      <Navbar
        activeCasesCount={stats.openCases}
        criticalCount={stats.critical}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenModelMetrics={() => setIsModelMetricsOpen(true)}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Real-time incident telemetry bar */}
        <StatsOverview stats={stats} />

        {/* Selected Case Deep-Dive Workspace */}
        <div ref={workspaceRef}>
          {selectedCase && (
            <CaseWorkspace
              emailCase={selectedCase}
              onUpdateCase={handleUpdateCase}
              onClose={() => setSelectedCase(null)}
            />
          )}
        </div>

        {/* Forensic Triage Queue Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>SOC Incident Triage Queue &bull; Forensic Evidence Registry</span>
            </h2>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="text-xs font-mono text-emerald-400 hover:text-emerald-300 underline"
            >
              + Ingest New Email
            </button>
          </div>
          <CaseListTable
            cases={cases}
            selectedCaseId={selectedCase?.id || null}
            onSelectCase={handleSelectCase}
            onDeleteCase={handleDeleteCase}
            onOpenUpload={() => setIsUploadOpen(true)}
          />
        </div>
      </main>

      {/* Forensic Compliance Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 lg:px-8 text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>AI-Powered Email Forensic Intelligence Platform &bull; v2.4-PROD</span>
          </div>
          <p className="text-[11px] text-slate-500 text-center sm:text-right">
            STIX 2.1 &bull; RFC 2822 &bull; MITRE ATT&amp;CK &bull; Cryptographic Header Verification
          </p>
        </div>
      </footer>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onCaseAnalyzed={handleCaseAnalyzed}
      />

      <ModelMetricsModal
        isOpen={isModelMetricsOpen}
        onClose={() => setIsModelMetricsOpen(false)}
      />
    </div>
  );
}
