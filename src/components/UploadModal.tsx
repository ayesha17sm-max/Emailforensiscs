import React, { useState, useEffect } from 'react';
import { X, UploadCloud, FileText, Sparkles, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { EmailCase } from '../types.js';

interface DemoItem {
  id: string;
  category: string;
  title: string;
  filename: string;
  description: string;
  rawEml: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaseAnalyzed: (newCase: EmailCase) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onCaseAnalyzed }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'demo'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedContent, setPastedContent] = useState('');
  const [analystName, setAnalystName] = useState('SOC Analyst');
  const [demos, setDemos] = useState<DemoItem[]>([]);
  const [selectedDemoId, setSelectedDemoId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/demo-emails')
        .then(res => res.json())
        .then(data => {
          setDemos(data);
          if (data.length > 0) setSelectedDemoId(data[0].id);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const executeAnalysis = async (rawEml: string, filename: string) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      setProcessStep('Parsing MIME structures and RFC 2822 headers...');
      await new Promise(r => setTimeout(r, 250));

      setProcessStep('Evaluating cryptographic SPF, DKIM, and DMARC alignment...');
      await new Promise(r => setTimeout(r, 250));

      setProcessStep('Tracing SMTP relay hops, IP geolocation, and BGP routing...');
      await new Promise(r => setTimeout(r, 250));

      setProcessStep('Inspecting extracted hyperlinks for typosquatting and anchor mismatch...');
      await new Promise(r => setTimeout(r, 200));

      setProcessStep('Executing TF-IDF + Logistic Regression ML inference...');
      const response = await fetch('/api/analyze-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawEml,
          originalFilename: filename,
          analyst: analystName
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Analysis failed on server');
      }

      const result = await response.json();
      setProcessStep('Investigation evidence compiled successfully!');
      await new Promise(r => setTimeout(r, 200));

      onCaseAnalyzed(result.case);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing email forensic pipeline');
    } finally {
      setIsProcessing(false);
      setProcessStep('');
    }
  };

  const handleSubmit = async () => {
    if (activeTab === 'upload') {
      if (!selectedFile) {
        setErrorMessage('Please choose or drop an .eml email file first');
        return;
      }
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        await executeAnalysis(text, selectedFile.name);
      };
      reader.readAsText(selectedFile);
    } else if (activeTab === 'paste') {
      if (!pastedContent.trim()) {
        setErrorMessage('Please paste valid raw email headers and body');
        return;
      }
      await executeAnalysis(pastedContent, 'pasted_inspection.eml');
    } else if (activeTab === 'demo') {
      const demo = demos.find(d => d.id === selectedDemoId);
      if (!demo) {
        setErrorMessage('Please select a valid demo scenario');
        return;
      }
      await executeAnalysis(demo.rawEml, demo.filename);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-emerald-400" />
              <span>Ingest &amp; Analyze Email File</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Processes RFC 822 raw messages through deterministic checks, ML classifier, and threat intelligence.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/50">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition ${
              activeTab === 'upload'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Upload .EML File
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition ${
              activeTab === 'paste'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Paste RFC 822 Text
          </button>
          <button
            onClick={() => setActiveTab('demo')}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'demo'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Pre-Configured Scenarios (7)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Tab 1: Upload */}
          {activeTab === 'upload' && (
            <div>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-950/20'
                    : 'border-slate-700 bg-slate-950/50 hover:border-slate-600'
                }`}
                onClick={() => document.getElementById('file-upload-input')?.click()}
              >
                <input
                  id="file-upload-input"
                  type="file"
                  accept=".eml,.msg,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-200">
                  {selectedFile ? selectedFile.name : 'Click to select or drag & drop .eml file'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports standard RFC 2822 email files exported from Outlook, Gmail, Thunderbird, or mail gateways.
                </p>
                {selectedFile && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-emerald-400 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{(selectedFile.size / 1024).toFixed(1)} KB loaded</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Paste Raw RFC 822 Text */}
          {activeTab === 'paste' && (
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5">
                Paste RFC 2822 / 822 raw message (including Received, From, To, Subject headers):
              </label>
              <textarea
                id="textarea-raw-eml"
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                placeholder="Received: from mail.example.com...&#10;From: sender@domain.com&#10;To: recipient@corp.com&#10;Subject: Urgent Update&#10;&#10;Email body content here..."
                rows={9}
                className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Tab 3: Pre-Configured Demo Scenarios */}
          {activeTab === 'demo' && (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-300">
                Select a cyber threat scenario to inspect live in the forensic workbench:
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                {demos.map(demo => (
                  <div
                    key={demo.id}
                    onClick={() => setSelectedDemoId(demo.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      selectedDemoId === demo.id
                        ? 'bg-slate-800 border-emerald-500 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 text-xs">{demo.title}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        demo.category === 'Legitimate'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : demo.category === 'Phishing'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : demo.category === 'BEC/Fraud'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {demo.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">{demo.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analyst Name Field */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
            <div>
              <label className="block text-[11px] font-mono text-slate-400">Analyst Sign-Off Name</label>
              <input
                type="text"
                value={analystName}
                onChange={(e) => setAnalystName(e.target.value)}
                className="mt-1 px-3 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 w-48"
              />
            </div>
            <span className="text-[11px] text-slate-500 font-mono self-end">
              Preserved in Forensic Chain of Custody
            </span>
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/80 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-mono text-emerald-300">{processStep}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-400 hover:text-slate-200 transition"
          >
            Cancel
          </button>
          <button
            id="btn-run-forensic-analysis"
            onClick={handleSubmit}
            disabled={isProcessing}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>Run Forensic Pipeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
