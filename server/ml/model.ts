import { TRAINING_DATASET, LabeledEmailSample } from './dataset.js';
import { ModelMetrics, MlPrediction, ContributingFeature } from '../types.js';

const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'could', 'did',
  'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in',
  'into', 'is', 'it', 'its', 'itself', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of',
  'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
  'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
  'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

export class EmailThreatClassifier {
  private vocabulary: string[] = [];
  private vocabIndex: Map<string, number> = new Map();
  private idf: number[] = [];
  private classes: Array<'Legitimate' | 'Spam' | 'Phishing' | 'BEC/Fraud' | 'Suspicious'> = [
    'Legitimate',
    'Phishing',
    'BEC/Fraud',
    'Spam',
    'Suspicious'
  ];
  private weights: number[][] = []; // [num_classes][num_features]
  private bias: number[] = []; // [num_classes]
  private metrics: ModelMetrics | null = null;
  private dataset: LabeledEmailSample[] = [...TRAINING_DATASET];

  constructor() {
    this.trainAndEvaluate();
  }

  private tokenize(text: string): string[] {
    const clean = text.toLowerCase().replace(/[^a-z0-9_\-\s]/g, ' ');
    const tokens = clean.split(/\s+/).filter(t => t.length > 2 && !STOPWORDS.has(t));
    
    // Generate bigrams as well
    const bigrams: string[] = [];
    for (let i = 0; i < tokens.length - 1; i++) {
      bigrams.push(`${tokens[i]}_${tokens[i + 1]}`);
    }
    return [...tokens, ...bigrams];
  }

  private extractTechnicalFeatures(sample: {
    subject: string;
    body: string;
    hasAuthFailure?: boolean;
    hasAttachment?: boolean;
    hasMismatchedLink?: boolean;
  }): number[] {
    const text = `${sample.subject} ${sample.body}`.toLowerCase();
    
    // Urgency indicators
    const urgencyWords = ['urgent', 'immediately', 'today', 'action required', 'deadline', 'final warning', 'suspend', 'expire', 'hours', 'risk'];
    const urgencyCount = urgencyWords.filter(w => text.includes(w)).length;

    // Financial indicators
    const financialWords = ['invoice', 'wire', 'transfer', 'bank', 'payment', 'ach', 'remit', 'funds', 'overdue', 'dollar', '$', 'balance'];
    const financialCount = financialWords.filter(w => text.includes(w)).length;

    // Credential indicators
    const credWords = ['password', 'sign in', 'login', 'verify', 'account', 'reset', 'credentials', 'mfa', 'authenticator', 'portal', 'session'];
    const credCount = credWords.filter(w => text.includes(w)).length;

    // Impersonation indicators
    const execWords = ['ceo', 'cfo', 'director', 'president', 'board', 'confidential', 'desk right now', 'gift card', 'executive'];
    const execCount = execWords.filter(w => text.includes(w)).length;

    // Threat / pressure indicators
    const threatWords = ['suspended', 'blocked', 'restricted', 'legal action', 'unauthorized', 'penalty', 'termination'];
    const threatCount = threatWords.filter(w => text.includes(w)).length;

    const upperRatio = sample.subject.length > 0 
      ? (sample.subject.replace(/[^A-Z]/g, '').length / sample.subject.length)
      : 0;

    return [
      urgencyCount > 0 ? 1.0 : 0.0,
      urgencyCount > 2 ? 1.0 : 0.0,
      financialCount > 0 ? 1.0 : 0.0,
      financialCount > 2 ? 1.0 : 0.0,
      credCount > 0 ? 1.0 : 0.0,
      credCount > 2 ? 1.0 : 0.0,
      execCount > 0 ? 1.0 : 0.0,
      threatCount > 0 ? 1.0 : 0.0,
      sample.hasAuthFailure ? 1.0 : 0.0,
      sample.hasMismatchedLink ? 1.0 : 0.0,
      sample.hasAttachment ? 1.0 : 0.0,
      upperRatio > 0.3 ? 1.0 : 0.0,
      text.includes('click here') || text.includes('review document') ? 1.0 : 0.0,
      text.includes('confirm identity') || text.includes('verify your') ? 1.0 : 0.0
    ];
  }

  private buildVocabulary(samples: LabeledEmailSample[]): void {
    const docFrequencies: Map<string, number> = new Map();
    const allTokensPerDoc: Set<string>[] = [];

    for (const sample of samples) {
      const tokens = this.tokenize(`${sample.subject} ${sample.body}`);
      const uniqueInDoc = new Set(tokens);
      allTokensPerDoc.push(uniqueInDoc);

      for (const t of uniqueInDoc) {
        docFrequencies.set(t, (docFrequencies.get(t) || 0) + 1);
      }
    }

    // Keep tokens that appear in at least 2 documents and not in > 85% of documents
    const filteredTokens: string[] = [];
    for (const [token, count] of docFrequencies.entries()) {
      if (count >= 2 && count < samples.length * 0.85) {
        filteredTokens.push(token);
      }
    }

    filteredTokens.sort();
    this.vocabulary = filteredTokens;
    this.vocabIndex.clear();
    this.vocabulary.forEach((t, i) => this.vocabIndex.set(t, i));

    // Compute IDF
    const N = samples.length;
    this.idf = this.vocabulary.map(token => {
      const df = docFrequencies.get(token) || 1;
      return Math.log((N + 1) / (df + 1)) + 1.0;
    });
  }

  private vectorize(sample: {
    subject: string;
    body: string;
    hasAuthFailure?: boolean;
    hasAttachment?: boolean;
    hasMismatchedLink?: boolean;
  }): number[] {
    const tokens = this.tokenize(`${sample.subject} ${sample.body}`);
    const tfMap: Map<number, number> = new Map();

    for (const t of tokens) {
      const idx = this.vocabIndex.get(t);
      if (idx !== undefined) {
        tfMap.set(idx, (tfMap.get(idx) || 0) + 1);
      }
    }

    // TF-IDF portion
    const numWords = tokens.length || 1;
    const tfidfVector = new Array(this.vocabulary.length).fill(0);
    let sumSq = 0;

    for (const [idx, count] of tfMap.entries()) {
      const tf = count / numWords;
      const val = tf * this.idf[idx];
      tfidfVector[idx] = val;
      sumSq += val * val;
    }

    // L2 norm
    const norm = Math.sqrt(sumSq) || 1;
    for (let i = 0; i < tfidfVector.length; i++) {
      tfidfVector[i] = tfidfVector[i] / norm;
    }

    // Technical features
    const techFeatures = this.extractTechnicalFeatures(sample);

    return [...tfidfVector, ...techFeatures];
  }

  public trainAndEvaluate(): ModelMetrics {
    // 1. Train / Test split (stratified or deterministic 75/25 split)
    const trainSet: LabeledEmailSample[] = [];
    const testSet: LabeledEmailSample[] = [];

    // Group by label to ensure all classes are present in both train & test
    const byClass: Record<string, LabeledEmailSample[]> = {};
    for (const c of this.classes) byClass[c] = [];
    for (const s of this.dataset) {
      if (byClass[s.label]) byClass[s.label].push(s);
    }

    for (const c of this.classes) {
      const items = byClass[c];
      const splitIdx = Math.max(1, Math.floor(items.length * 0.75));
      trainSet.push(...items.slice(0, splitIdx));
      testSet.push(...items.slice(splitIdx));
    }

    // 2. Build vocabulary on trainSet
    this.buildVocabulary(trainSet);

    // 3. Prepare training matrices
    const X_train = trainSet.map(s => this.vectorize(s));
    const y_train = trainSet.map(s => this.classes.indexOf(s.label));

    const numFeatures = X_train[0]?.length || 1;
    const numClasses = this.classes.length;

    // Initialize weights and bias
    this.weights = Array.from({ length: numClasses }, () => new Array(numFeatures).fill(0));
    this.bias = new Array(numClasses).fill(0);

    // 4. Multi-class Logistic Regression with SGD
    const learningRate = 0.15;
    const epochs = 120;
    const l2Reg = 0.005;

    for (let ep = 0; ep < epochs; ep++) {
      // Shuffle indices
      const indices = Array.from({ length: trainSet.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      for (const idx of indices) {
        const x = X_train[idx];
        const y = y_train[idx];

        // Softmax
        const logits = this.weights.map((w, c) => {
          let dot = 0;
          for (let f = 0; f < numFeatures; f++) dot += w[f] * x[f];
          return dot + this.bias[c];
        });

        const maxLogit = Math.max(...logits);
        const exp = logits.map(l => Math.exp(l - maxLogit));
        const sumExp = exp.reduce((a, b) => a + b, 0);
        const probs = exp.map(e => e / sumExp);

        // Gradient update
        for (let c = 0; c < numClasses; c++) {
          const error = probs[c] - (c === y ? 1 : 0);
          for (let f = 0; f < numFeatures; f++) {
            this.weights[c][f] -= learningRate * (error * x[f] + l2Reg * this.weights[c][f]);
          }
          this.bias[c] -= learningRate * error;
        }
      }
    }

    // 5. Evaluate on held-out testSet
    const matrix: number[][] = Array.from({ length: numClasses }, () => new Array(numClasses).fill(0));
    let correct = 0;

    for (const testSample of testSet) {
      const x = this.vectorize(testSample);
      const pred = this.predictRaw(x);
      const trueIdx = this.classes.indexOf(testSample.label);
      const predIdx = this.classes.indexOf(pred.predictedClass);

      if (trueIdx >= 0 && predIdx >= 0) {
        matrix[trueIdx][predIdx]++;
        if (trueIdx === predIdx) correct++;
      }
    }

    const totalTest = testSet.length || 1;
    const accuracy = Number((correct / totalTest).toFixed(4));

    // Calculate macro Precision, Recall, F1
    let precisionSum = 0;
    let recallSum = 0;
    let validClassesCount = 0;

    for (let c = 0; c < numClasses; c++) {
      let tp = matrix[c][c];
      let fn = 0;
      let fp = 0;
      for (let j = 0; j < numClasses; j++) {
        if (j !== c) {
          fn += matrix[c][j];
          fp += matrix[j][c];
        }
      }

      const p = (tp + fp) > 0 ? tp / (tp + fp) : 0;
      const r = (tp + fn) > 0 ? tp / (tp + fn) : 0;

      if (tp + fn > 0) {
        precisionSum += p;
        recallSum += r;
        validClassesCount++;
      }
    }

    const precision = validClassesCount > 0 ? Number((precisionSum / validClassesCount).toFixed(4)) : 0;
    const recall = validClassesCount > 0 ? Number((recallSum / validClassesCount).toFixed(4)) : 0;
    const f1Score = (precision + recall) > 0 ? Number(((2 * precision * recall) / (precision + recall)).toFixed(4)) : 0;

    // Extract top features
    const phishIdx = this.classes.indexOf('Phishing');
    const legitIdx = this.classes.indexOf('Legitimate');

    const topFeaturesPositive: { feature: string; weight: number }[] = [];
    const topFeaturesNegative: { feature: string; weight: number }[] = [];

    this.vocabulary.forEach((word, i) => {
      const phishWeight = this.weights[phishIdx]?.[i] || 0;
      const legitWeight = this.weights[legitIdx]?.[i] || 0;
      topFeaturesPositive.push({ feature: word, weight: Number(phishWeight.toFixed(3)) });
      topFeaturesNegative.push({ feature: word, weight: Number(legitWeight.toFixed(3)) });
    });

    topFeaturesPositive.sort((a, b) => b.weight - a.weight);
    topFeaturesNegative.sort((a, b) => b.weight - a.weight);

    const dist: Record<string, number> = {};
    for (const s of this.dataset) {
      dist[s.label] = (dist[s.label] || 0) + 1;
    }

    this.metrics = {
      modelName: 'TF-IDF + Softmax Logistic Regression (Dual NLP & Technical Feature Vector)',
      algorithm: 'Stochastic Gradient Descent Multi-Class Logistic Regression with L2 Regularization',
      trainingSamplesCount: trainSet.length,
      testSamplesCount: testSet.length,
      classes: this.classes,
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix: {
        labels: this.classes,
        matrix
      },
      topFeaturesPositive: topFeaturesPositive.slice(0, 10),
      topFeaturesNegative: topFeaturesNegative.slice(0, 10),
      lastTrainedAt: new Date().toISOString(),
      datasetDistribution: dist
    };

    return this.metrics;
  }

  private predictRaw(x: number[]): {
    predictedClass: 'Legitimate' | 'Spam' | 'Phishing' | 'BEC/Fraud' | 'Suspicious';
    confidence: number;
    probabilities: Record<string, number>;
  } {
    const logits = this.weights.map((w, c) => {
      let dot = 0;
      for (let f = 0; f < x.length; f++) dot += w[f] * x[f];
      return dot + this.bias[c];
    });

    const maxLogit = Math.max(...logits);
    const exp = logits.map(l => Math.exp(l - maxLogit));
    const sumExp = exp.reduce((a, b) => a + b, 0);
    const probs = exp.map(e => e / sumExp);

    let maxIdx = 0;
    let maxProb = probs[0];
    for (let c = 1; c < probs.length; c++) {
      if (probs[c] > maxProb) {
        maxProb = probs[c];
        maxIdx = c;
      }
    }

    const probMap: Record<string, number> = {};
    this.classes.forEach((c, i) => {
      probMap[c] = Number(probs[i].toFixed(4));
    });

    return {
      predictedClass: this.classes[maxIdx],
      confidence: Number(maxProb.toFixed(4)),
      probabilities: probMap
    };
  }

  public predict(sample: {
    subject: string;
    body: string;
    hasAuthFailure?: boolean;
    hasAttachment?: boolean;
    hasMismatchedLink?: boolean;
  }): MlPrediction {
    const x = this.vectorize(sample);
    const raw = this.predictRaw(x);

    // Compute top contributing features for this specific prediction
    const predIdx = this.classes.indexOf(raw.predictedClass);
    const contributing: ContributingFeature[] = [];

    this.vocabulary.forEach((word, i) => {
      const val = x[i];
      if (val > 0) {
        const w = this.weights[predIdx]?.[i] || 0;
        contributing.push({
          feature: word,
          weight: Number(w.toFixed(3)),
          value: Number(val.toFixed(3)),
          impact: w >= 0 ? 'increases_risk' : 'decreases_risk'
        });
      }
    });

    // Add technical features that were active
    const techNames = [
      'has_urgency_words',
      'extreme_urgency_frequency',
      'has_financial_words',
      'frequent_financial_terms',
      'has_credential_harvest_words',
      'frequent_credential_terms',
      'executive_hierarchy_terms',
      'threat_or_penalty_terms',
      'auth_security_failure',
      'anchor_text_url_mismatch',
      'attachment_payload_present',
      'high_uppercase_subject_ratio',
      'call_to_action_phrase',
      'verify_identity_phrase'
    ];

    const techOffset = this.vocabulary.length;
    techNames.forEach((name, i) => {
      const val = x[techOffset + i];
      if (val > 0) {
        const w = this.weights[predIdx]?.[techOffset + i] || 0;
        contributing.push({
          feature: `[tech] ${name}`,
          weight: Number(w.toFixed(3)),
          value: Number(val.toFixed(3)),
          impact: w >= 0 ? 'increases_risk' : 'decreases_risk'
        });
      }
    });

    contributing.sort((a, b) => Math.abs(b.weight * b.value) - Math.abs(a.weight * a.value));

    // Binary malicious assessment
    const maliciousProbability = Number(
      ((raw.probabilities['Phishing'] || 0) +
      (raw.probabilities['BEC/Fraud'] || 0) +
      (raw.probabilities['Suspicious'] || 0) * 0.75 +
      (raw.probabilities['Spam'] || 0) * 0.5).toFixed(4)
    );

    return {
      predictedClass: raw.predictedClass,
      confidence: raw.confidence,
      modelName: 'TF-IDF + Softmax Logistic Regression (Dual Feature Vector)',
      probabilities: raw.probabilities,
      topContributingFeatures: contributing.slice(0, 8),
      binaryPrediction: {
        isMalicious: raw.predictedClass !== 'Legitimate',
        maliciousProbability: Math.min(1.0, maliciousProbability)
      }
    };
  }

  public addAnalystFeedback(sample: LabeledEmailSample): ModelMetrics {
    this.dataset.push(sample);
    return this.trainAndEvaluate();
  }

  public getMetrics(): ModelMetrics {
    if (!this.metrics) {
      return this.trainAndEvaluate();
    }
    return this.metrics;
  }
}

export const threatClassifier = new EmailThreatClassifier();
