import { ThreatClass } from './types.js';

export interface LogisticRegressionOptions {
  learningRate?: number;
  epochs?: number;
  l2Reg?: number;
}

export class SoftmaxLogisticRegression {
  public classes: ThreatClass[];
  public weights: number[][] = []; // [class_index][feature_index]
  public bias: number[] = []; // [class_index]

  constructor(classes: ThreatClass[], weights?: number[][], bias?: number[]) {
    this.classes = classes;
    if (weights && bias) {
      this.weights = weights;
      this.bias = bias;
    }
  }

  public fit(X: number[][], y: number[], options: LogisticRegressionOptions = {}): void {
    const lr = options.learningRate ?? 0.18;
    const epochs = options.epochs ?? 150;
    const l2 = options.l2Reg ?? 0.005;

    const numSamples = X.length;
    const numFeatures = X[0]?.length || 0;
    const numClasses = this.classes.length;

    this.weights = Array.from({ length: numClasses }, () => new Array(numFeatures).fill(0));
    this.bias = new Array(numClasses).fill(0);

    const indices = Array.from({ length: numSamples }, (_, i) => i);

    for (let epoch = 0; epoch < epochs; epoch++) {
      // Deterministic pseudo-shuffle per epoch
      for (let i = indices.length - 1; i > 0; i--) {
        const j = (i * 37 + epoch * 13) % (i + 1);
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      for (const idx of indices) {
        const x = X[idx];
        const targetClass = y[idx];

        // Compute logits
        const logits: number[] = new Array(numClasses);
        for (let c = 0; c < numClasses; c++) {
          let dot = 0;
          const w = this.weights[c];
          for (let f = 0; f < numFeatures; f++) {
            dot += w[f] * x[f];
          }
          logits[c] = dot + this.bias[c];
        }

        // Softmax with numerical stability
        const maxLogit = Math.max(...logits);
        let sumExp = 0;
        const exps = logits.map(l => {
          const val = Math.exp(l - maxLogit);
          sumExp += val;
          return val;
        });

        const probs = exps.map(e => e / (sumExp || 1));

        // Gradient update with L2 regularization
        for (let c = 0; c < numClasses; c++) {
          const target = c === targetClass ? 1.0 : 0.0;
          const error = probs[c] - target;

          const w = this.weights[c];
          for (let f = 0; f < numFeatures; f++) {
            w[f] -= lr * (error * x[f] + l2 * w[f]);
          }
          this.bias[c] -= lr * error;
        }
      }
    }
  }

  public predictProbabilities(x: number[]): Record<ThreatClass, number> {
    const numClasses = this.classes.length;
    const numFeatures = x.length;

    const logits: number[] = new Array(numClasses);
    for (let c = 0; c < numClasses; c++) {
      let dot = 0;
      const w = this.weights[c];
      for (let f = 0; f < numFeatures; f++) {
        dot += (w[f] || 0) * (x[f] || 0);
      }
      logits[c] = dot + (this.bias[c] || 0);
    }

    const maxLogit = Math.max(...logits);
    let sumExp = 0;
    const exps = logits.map(l => {
      const val = Math.exp(l - maxLogit);
      sumExp += val;
      return val;
    });

    const result: Partial<Record<ThreatClass, number>> = {};
    this.classes.forEach((cls, idx) => {
      result[cls] = Number((exps[idx] / (sumExp || 1)).toFixed(4));
    });

    return result as Record<ThreatClass, number>;
  }

  public predict(x: number[]): {
    predictedClass: ThreatClass;
    confidence: number;
    probabilities: Record<ThreatClass, number>;
  } {
    const probs = this.predictProbabilities(x);
    let bestClass: ThreatClass = this.classes[0];
    let maxProb = -1;

    for (const cls of this.classes) {
      if (probs[cls] > maxProb) {
        maxProb = probs[cls];
        bestClass = cls;
      }
    }

    return {
      predictedClass: bestClass,
      confidence: maxProb,
      probabilities: probs
    };
  }
}
