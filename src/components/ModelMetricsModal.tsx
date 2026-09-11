import React, { useEffect, useState } from 'react';
import { X, Cpu, RotateCw, BarChart2, CheckCircle2, TrendingUp } from 'lucide-react';
import { ModelMetrics } from '../types.js';

interface ModelMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelMetricsModal: React.FC<ModelMetricsModalProps> = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [retraining, setRetraining] = useState(false);

  const fetchMetrics = () => {
    setLoading(true);
    fetch('/api/model/metrics')
      .then(res => res.json())
      .then(data => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchMetrics();
    }
  }, [isOpen]);

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      const res = await fetch('/api/model/retrain', { method: 'POST' });
      const data = await res.json();
      if (data.metrics) setMetrics(data.metrics);
    } catch (e) {
      console.error(e);
    } finally {
      setRetraining(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <span>Machine Learning Threat Model Telemetry</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Dual-vector TF-IDF + Stochastic Gradient Descent Logistic Regression with L2 Regularization
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading || !metrics ? (
            <div className="py-16 text-center text-slate-400 font-mono text-xs">
              Fetching current model validation metrics...
            </div>
          ) : (
            <>
              {/* Primary performance scorecard */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Accuracy</span>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{(metrics.accuracy * 100).toFixed(1)}%</p>
                  <span className="text-[10px] text-slate-500 font-mono">Held-Out Test Set</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Precision</span>
                  <p className="text-2xl font-bold text-sky-400 mt-1">{(metrics.precision * 100).toFixed(1)}%</p>
                  <span className="text-[10px] text-slate-500 font-mono">Macro Average</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Recall</span>
                  <p className="text-2xl font-bold text-indigo-400 mt-1">{(metrics.recall * 100).toFixed(1)}%</p>
                  <span className="text-[10px] text-slate-500 font-mono">Sensitivity</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center">
                  <span className="text-[10px] font-mono uppercase text-slate-400">F1 Score</span>
                  <p className="text-2xl font-bold text-purple-400 mt-1">{(metrics.f1Score * 100).toFixed(1)}%</p>
                  <span className="text-[10px] text-slate-500 font-mono">Harmonic Mean</span>
                </div>
              </div>

              {/* Confusion Matrix */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
                    Held-Out Test Confusion Matrix
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    {metrics.testSamplesCount} test evaluations
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs font-mono">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="py-2 text-left text-[11px] font-medium">True \ Predicted</th>
                        {metrics.confusionMatrix.labels.map(l => (
                          <th key={l} className="py-2 px-2 text-[11px] font-medium">{l}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {metrics.confusionMatrix.matrix.map((row, i) => (
                        <tr key={metrics.confusionMatrix.labels[i]}>
                          <td className="py-2 text-left font-medium text-slate-300">
                            {metrics.confusionMatrix.labels[i]}
                          </td>
                          {row.map((val, j) => {
                            const isDiagonal = i === j;
                            return (
                              <td
                                key={j}
                                className={`py-2 px-2 ${
                                  isDiagonal
                                    ? 'bg-emerald-950/40 text-emerald-300 font-bold'
                                    : val > 0
                                    ? 'bg-rose-950/40 text-rose-300 font-semibold'
                                    : 'text-slate-500'
                                }`}
                              >
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Feature Weights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
                  <h4 className="text-xs font-mono font-semibold text-rose-300 uppercase tracking-wider mb-2">
                    Top Positive Phishing Indicators
                  </h4>
                  <div className="space-y-1.5">
                    {metrics.topFeaturesPositive.map(f => (
                      <div key={f.feature} className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-300 truncate max-w-[180px]">{f.feature}</span>
                        <span className="text-rose-400 font-bold">+{f.weight}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
                  <h4 className="text-xs font-mono font-semibold text-emerald-300 uppercase tracking-wider mb-2">
                    Top Legitimate Context Indicators
                  </h4>
                  <div className="space-y-1.5">
                    {metrics.topFeaturesNegative.map(f => (
                      <div key={f.feature} className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-300 truncate max-w-[180px]">{f.feature}</span>
                        <span className="text-emerald-400 font-bold">{f.weight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dataset Distribution */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between flex-wrap gap-2 text-xs font-mono text-slate-400">
                <div>
                  <span className="text-slate-300 font-semibold">Training Corpus: </span>
                  <span>{metrics.trainingSamplesCount} samples</span>
                </div>
                <div>
                  <span className="text-slate-300 font-semibold">Last Calibrated: </span>
                  <span>{new Date(metrics.lastTrainedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer with Retrain Button */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-500">
            Model retrains automatically on analyst verdict feedback
          </span>
          <button
            id="btn-trigger-retrain"
            onClick={handleRetrain}
            disabled={retraining}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${retraining ? 'animate-spin' : ''}`} />
            <span>{retraining ? 'Calibrating Model...' : 'Trigger Model Retrain'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
