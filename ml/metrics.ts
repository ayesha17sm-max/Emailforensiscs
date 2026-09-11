import { ThreatClass, EvaluationMetrics } from './types.js';

export function calculateMetrics(
  trueLabels: ThreatClass[],
  predLabels: ThreatClass[],
  classes: ThreatClass[],
  trainingCount: number
): EvaluationMetrics {
  const n = trueLabels.length;
  let correct = 0;

  // Initialize confusion matrix
  const labelIndex = new Map<ThreatClass, number>();
  classes.forEach((c, i) => labelIndex.set(c, i));

  const matrix: number[][] = Array.from({ length: classes.length }, () =>
    new Array(classes.length).fill(0)
  );

  for (let i = 0; i < n; i++) {
    const t = trueLabels[i];
    const p = predLabels[i];
    if (t === p) correct++;
    const tIdx = labelIndex.get(t)!;
    const pIdx = labelIndex.get(p)!;
    if (tIdx !== undefined && pIdx !== undefined) {
      matrix[tIdx][pIdx] += 1;
    }
  }

  const accuracy = n > 0 ? Number((correct / n).toFixed(4)) : 0;

  // Class-wise Precision, Recall, F1
  const classMetrics: Partial<Record<ThreatClass, { precision: number; recall: number; f1: number; support: number }>> = {};
  let macroPrecisionSum = 0;
  let macroRecallSum = 0;
  let validClasses = 0;

  classes.forEach((c, idx) => {
    const tp = matrix[idx][idx];
    let fp = 0;
    let fn = 0;
    let support = 0;

    for (let i = 0; i < classes.length; i++) {
      if (i !== idx) fp += matrix[i][idx]; // false positive: other row, this col
      if (i !== idx) fn += matrix[idx][i]; // false negative: this row, other col
      support += matrix[idx][i];
    }

    const prec = tp + fp > 0 ? tp / (tp + fp) : 0;
    const rec = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;

    classMetrics[c] = {
      precision: Number(prec.toFixed(4)),
      recall: Number(rec.toFixed(4)),
      f1: Number(f1.toFixed(4)),
      support
    };

    if (support > 0) {
      macroPrecisionSum += prec;
      macroRecallSum += rec;
      validClasses++;
    }
  });

  const precision = validClasses > 0 ? Number((macroPrecisionSum / validClasses).toFixed(4)) : 0;
  const recall = validClasses > 0 ? Number((macroRecallSum / validClasses).toFixed(4)) : 0;
  const f1Score = precision + recall > 0 ? Number(((2 * precision * recall) / (precision + recall)).toFixed(4)) : 0;

  return {
    accuracy,
    precision,
    recall,
    f1Score,
    testSamplesCount: n,
    trainingSamplesCount: trainingCount,
    confusionMatrix: {
      labels: classes,
      matrix
    },
    classMetrics: classMetrics as Record<ThreatClass, { precision: number; recall: number; f1: number; support: number }>
  };
}
