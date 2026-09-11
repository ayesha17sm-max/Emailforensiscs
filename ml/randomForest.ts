import { ThreatClass, DecisionNode } from './types.js';

export interface TreeTrainOptions {
  maxDepth?: number;
  minSamplesSplit?: number;
  maxFeatures?: number;
}

export class DecisionTreeClassifier {
  public root: DecisionNode | null = null;
  public classes: ThreatClass[];
  public featureNames: string[];

  constructor(classes: ThreatClass[], featureNames: string[]) {
    this.classes = classes;
    this.featureNames = featureNames;
  }

  public fit(X: number[][], y: number[], options: TreeTrainOptions = {}): void {
    const maxDepth = options.maxDepth ?? 5;
    const minSamplesSplit = options.minSamplesSplit ?? 2;
    const maxFeatures = options.maxFeatures ?? Math.floor(Math.sqrt(X[0].length)) + 2;

    this.root = this.buildTree(X, y, 0, maxDepth, minSamplesSplit, maxFeatures);
  }

  private calculateGini(y: number[]): number {
    if (y.length === 0) return 0;
    const counts = new Map<number, number>();
    for (const val of y) counts.set(val, (counts.get(val) || 0) + 1);

    let sumProbSquared = 0;
    for (const count of counts.values()) {
      const p = count / y.length;
      sumProbSquared += p * p;
    }
    return 1 - sumProbSquared;
  }

  private buildTree(
    X: number[][],
    y: number[],
    depth: number,
    maxDepth: number,
    minSamplesSplit: number,
    maxFeatures: number
  ): DecisionNode {
    const numSamples = X.length;
    const uniqueClasses = new Set(y);

    // Compute distribution
    const counts = new Map<number, number>();
    for (const val of y) counts.set(val, (counts.get(val) || 0) + 1);

    let majorityClassIndex = 0;
    let maxCount = -1;
    for (const [clsIdx, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        majorityClassIndex = clsIdx;
      }
    }

    const probabilities: Partial<Record<ThreatClass, number>> = {};
    this.classes.forEach((cls, i) => {
      probabilities[cls] = Number(((counts.get(i) || 0) / (numSamples || 1)).toFixed(3));
    });

    // Termination conditions
    if (depth >= maxDepth || uniqueClasses.size <= 1 || numSamples < minSamplesSplit) {
      return {
        isLeaf: true,
        predictedClass: this.classes[majorityClassIndex],
        probabilities: probabilities as Record<ThreatClass, number>
      };
    }

    // Feature subsampling
    const numTotalFeatures = X[0].length;
    const allFeatureIndices = Array.from({ length: numTotalFeatures }, (_, i) => i);
    // Shuffle indices deterministically based on depth & sample count
    for (let i = allFeatureIndices.length - 1; i > 0; i--) {
      const j = (i * 19 + depth * 7 + numSamples) % (i + 1);
      [allFeatureIndices[i], allFeatureIndices[j]] = [allFeatureIndices[j], allFeatureIndices[i]];
    }
    const candidateFeatures = allFeatureIndices.slice(0, Math.min(maxFeatures, numTotalFeatures));

    let bestGiniGain = -1;
    let bestFeature = -1;
    let bestThreshold = 0.5;
    const currentGini = this.calculateGini(y);

    for (const featIdx of candidateFeatures) {
      // Threshold 0.5 for binary / continuous features
      const leftIdxs: number[] = [];
      const rightIdxs: number[] = [];

      for (let i = 0; i < numSamples; i++) {
        if (X[i][featIdx] <= 0.5) {
          leftIdxs.push(i);
        } else {
          rightIdxs.push(i);
        }
      }

      if (leftIdxs.length === 0 || rightIdxs.length === 0) continue;

      const leftY = leftIdxs.map(i => y[i]);
      const rightY = rightIdxs.map(i => y[i]);

      const weightedGini =
        (leftY.length / numSamples) * this.calculateGini(leftY) +
        (rightY.length / numSamples) * this.calculateGini(rightY);

      const gain = currentGini - weightedGini;
      if (gain > bestGiniGain) {
        bestGiniGain = gain;
        bestFeature = featIdx;
      }
    }

    if (bestGiniGain <= 0.001 || bestFeature === -1) {
      return {
        isLeaf: true,
        predictedClass: this.classes[majorityClassIndex],
        probabilities: probabilities as Record<ThreatClass, number>
      };
    }

    const leftX: number[][] = [];
    const leftY: number[] = [];
    const rightX: number[][] = [];
    const rightY: number[] = [];

    for (let i = 0; i < numSamples; i++) {
      if (X[i][bestFeature] <= 0.5) {
        leftX.push(X[i]);
        leftY.push(y[i]);
      } else {
        rightX.push(X[i]);
        rightY.push(y[i]);
      }
    }

    return {
      isLeaf: false,
      featureIndex: bestFeature,
      featureName: this.featureNames[bestFeature],
      threshold: 0.5,
      left: this.buildTree(leftX, leftY, depth + 1, maxDepth, minSamplesSplit, maxFeatures),
      right: this.buildTree(rightX, rightY, depth + 1, maxDepth, minSamplesSplit, maxFeatures)
    };
  }

  public predictProbabilities(x: number[], node: DecisionNode = this.root!): Record<ThreatClass, number> {
    if (!node || node.isLeaf || node.probabilities) {
      if (node?.probabilities) return node.probabilities;
      const defaultProb: Partial<Record<ThreatClass, number>> = {};
      this.classes.forEach(c => (defaultProb[c] = c === (node?.predictedClass || this.classes[0]) ? 1.0 : 0.0));
      return defaultProb as Record<ThreatClass, number>;
    }

    const featVal = x[node.featureIndex!];
    if (featVal <= (node.threshold ?? 0.5)) {
      return this.predictProbabilities(x, node.left!);
    } else {
      return this.predictProbabilities(x, node.right!);
    }
  }
}

export class RandomForestClassifier {
  public trees: DecisionNode[] = [];
  public classes: ThreatClass[];
  public featureNames: string[];
  public featureImportances: Record<string, number> = {};

  constructor(classes: ThreatClass[], featureNames: string[], trees?: DecisionNode[]) {
    this.classes = classes;
    this.featureNames = featureNames;
    if (trees) this.trees = trees;
  }

  public fit(X: number[][], y: number[], numTrees: number = 8): void {
    this.trees = [];
    const numSamples = X.length;
    const importanceCounts: Record<string, number> = {};
    this.featureNames.forEach(f => (importanceCounts[f] = 0));

    for (let t = 0; t < numTrees; t++) {
      // Bootstrap sampling (sampling with replacement)
      const sampleIndices: number[] = [];
      for (let i = 0; i < numSamples; i++) {
        // Deterministic pseudo-random bootstrap
        const randIdx = (i * 29 + t * 47 + 11) % numSamples;
        sampleIndices.push(randIdx);
      }

      const sampleX = sampleIndices.map(i => X[i]);
      const sampleY = sampleIndices.map(i => y[i]);

      const tree = new DecisionTreeClassifier(this.classes, this.featureNames);
      tree.fit(sampleX, sampleY, {
        maxDepth: 4,
        minSamplesSplit: 2,
        maxFeatures: Math.ceil(Math.sqrt(this.featureNames.length)) + 2
      });

      if (tree.root) {
        this.trees.push(tree.root);
        this.accumulateFeatureUsage(tree.root, importanceCounts);
      }
    }

    // Normalize feature importances
    const totalUsage = Object.values(importanceCounts).reduce((a, b) => a + b, 0) || 1;
    this.featureImportances = {};
    for (const [feat, count] of Object.entries(importanceCounts)) {
      this.featureImportances[feat] = Number((count / totalUsage).toFixed(4));
    }
  }

  private accumulateFeatureUsage(node: DecisionNode, counts: Record<string, number>): void {
    if (!node || node.isLeaf) return;
    if (node.featureName && counts[node.featureName] !== undefined) {
      counts[node.featureName] += 1;
    }
    if (node.left) this.accumulateFeatureUsage(node.left, counts);
    if (node.right) this.accumulateFeatureUsage(node.right, counts);
  }

  public predictProbabilities(x: number[]): Record<ThreatClass, number> {
    if (this.trees.length === 0) {
      const fallback: Partial<Record<ThreatClass, number>> = {};
      this.classes.forEach(c => (fallback[c] = 1 / this.classes.length));
      return fallback as Record<ThreatClass, number>;
    }

    const summedProb: Record<ThreatClass, number> = {} as Record<ThreatClass, number>;
    this.classes.forEach(c => (summedProb[c] = 0));

    const treeRunner = new DecisionTreeClassifier(this.classes, this.featureNames);

    for (const tree of this.trees) {
      const treeProb = treeRunner.predictProbabilities(x, tree);
      for (const c of this.classes) {
        summedProb[c] += treeProb[c] || 0;
      }
    }

    const result: Partial<Record<ThreatClass, number>> = {};
    for (const c of this.classes) {
      result[c] = Number((summedProb[c] / this.trees.length).toFixed(4));
    }

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
