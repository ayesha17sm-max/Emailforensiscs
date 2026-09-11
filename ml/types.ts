export type ThreatClass = 'Legitimate' | 'Phishing' | 'BEC/Fraud' | 'Spam' | 'Suspicious';

export interface DatasetItem {
  id: string;
  label: ThreatClass;
  subject: string;
  body: string;
  senderDomain: string;
  spfStatus: 'PASS' | 'FAIL' | 'NOT_AVAILABLE' | 'NOT_VERIFIED';
  dkimStatus: 'PASS' | 'FAIL' | 'NOT_AVAILABLE' | 'NOT_VERIFIED';
  dmarcStatus: 'PASS' | 'FAIL' | 'NOT_AVAILABLE' | 'NOT_VERIFIED';
  hasDomainMismatch: boolean;
  hasReplyToMismatch: boolean;
  hasSuspiciousUrl: boolean;
  hasUrlShortener: boolean;
  hasCredentialRequest: boolean;
  hasFinancialRequest: boolean;
  hasUrgency: boolean;
  hasSuspiciousAttachment: boolean;
  ipReputation: 'CLEAN' | 'SUSPICIOUS' | 'KNOWN MALICIOUS' | 'NOT FOUND';
  domainReputation: 'CLEAN' | 'SUSPICIOUS' | 'KNOWN MALICIOUS' | 'NOT FOUND';
}

export interface EvaluationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  testSamplesCount: number;
  trainingSamplesCount: number;
  confusionMatrix: {
    labels: ThreatClass[];
    matrix: number[][]; // [true][pred]
  };
  classMetrics: Record<ThreatClass, { precision: number; recall: number; f1: number; support: number }>;
}

export interface SerializedNlpModel {
  modelType: 'TF-IDF + Softmax Logistic Regression';
  classes: ThreatClass[];
  vocabulary: string[];
  idf: number[];
  weights: number[][]; // [class_idx][feature_idx]
  bias: number[]; // [class_idx]
  trainedAt: string;
  metrics: EvaluationMetrics;
}

export interface DecisionNode {
  isLeaf: boolean;
  featureIndex?: number;
  featureName?: string;
  threshold?: number;
  predictedClass?: ThreatClass;
  probabilities?: Record<ThreatClass, number>;
  left?: DecisionNode;
  right?: DecisionNode;
}

export interface SerializedTechnicalRfModel {
  modelType: 'Random Forest Classifier (Technical Security Signals)';
  classes: ThreatClass[];
  featureNames: string[];
  trees: DecisionNode[];
  trainedAt: string;
  metrics: EvaluationMetrics;
  featureImportances: Record<string, number>;
}
