export type ThreatLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export type CaseStatus = 'NEW' | 'UNDER_INVESTIGATION' | 'CONFIRMED_THREAT' | 'FALSE_POSITIVE' | 'CLOSED';

export type AuthStatus = 'PASS' | 'FAIL' | 'NOT_AVAILABLE' | 'NOT_VERIFIED';

export type UrlVerdict = 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS' | 'UNKNOWN';

export type RelayTrust = 'earliest observed IP' | 'probable infrastructure origin' | 'trusted hop' | 'untrusted/possibly forged hop';

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  analyst: string;
  details: string;
}

export interface AuthCheckResult {
  status: AuthStatus;
  details: string;
  domain?: string;
  headerFound: boolean;
}

export interface EmailAuthentication {
  spf: AuthCheckResult;
  dkim: AuthCheckResult;
  dmarc: AuthCheckResult;
  arc: AuthCheckResult;
  displaySpoofDetected: boolean;
  fromReplyMismatch: boolean;
  fromReturnMismatch: boolean;
  messageIdSuspicious: boolean;
  detectedMismatches: string[];
}

export interface RelayHop {
  hopNumber: number;
  ip: string;
  hostname: string;
  byHost?: string;
  protocol?: string;
  timestamp?: string;
  rawHeader: string;
  trustAssessment: RelayTrust;
  country?: string;
  city?: string;
  asn?: string;
  org?: string;
  isPrivateIp: boolean;
}

export interface IpIntelligence {
  ip: string;
  version: 'IPv4' | 'IPv6';
  isPrivate: boolean;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  lat?: number;
  lon?: number;
  isp: string;
  asn: string;
  org: string;
  isVpnOrProxy: boolean;
  reputationStatus: 'KNOWN MALICIOUS' | 'SUSPICIOUS' | 'NOT FOUND' | 'UNKNOWN' | 'API UNAVAILABLE';
  disclaimer: string;
}

export interface UrlAnalysis {
  id: string;
  rawUrl: string;
  protocol: string;
  domain: string;
  path: string;
  queryParams: Record<string, string>;
  isHttps: boolean;
  hasIpHost: boolean;
  isShortened: boolean;
  isLookalike: boolean;
  lookalikeTarget?: string;
  isSuspiciousTld: boolean;
  excessiveSubdomains: boolean;
  hasEncodedChars: boolean;
  anchorText?: string;
  anchorMismatch: boolean;
  verdict: UrlVerdict;
  threatIntelStatus: 'KNOWN MALICIOUS' | 'SUSPICIOUS' | 'NOT FOUND' | 'UNKNOWN' | 'API UNAVAILABLE';
  reasons: string[];
}

export interface DomainAnalysis {
  domain: string;
  source: 'from' | 'reply-to' | 'return-path' | 'message-id' | 'url';
  hasMx: boolean;
  spfRecord?: string;
  dmarcRecord?: string;
  isLookalike: boolean;
  lookalikeTarget?: string;
  suspiciousTld: boolean;
  entropy: number;
  flags: string[];
}

export interface AttachmentAnalysis {
  id: string;
  filename: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  isExecutable: boolean;
  isMacroEnabled: boolean;
  isDoubleExtension: boolean;
  isSuspiciousArchive: boolean;
  isMimeMismatch: boolean;
  verdict: 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS';
  flags: string[];
}

export interface NlpIndicators {
  urgencyScore: number;
  urgencyKeywords: string[];
  financialScore: number;
  financialKeywords: string[];
  credentialScore: number;
  credentialKeywords: string[];
  impersonationScore: number;
  impersonationKeywords: string[];
  threatScore: number;
  threatKeywords: string[];
  callToActionCount: number;
  hiddenTextDetected: boolean;
  hiddenTextSnippet?: string;
  languageDetected: string;
}

export interface ContributingFeature {
  feature: string;
  weight: number;
  value: number;
  impact: 'increases_risk' | 'decreases_risk';
}

export interface MlPrediction {
  predictedClass: 'Legitimate' | 'Spam' | 'Phishing' | 'BEC/Fraud' | 'Suspicious';
  confidence: number;
  modelName: string;
  probabilities: Record<string, number>;
  topContributingFeatures: ContributingFeature[];
  binaryPrediction: {
    isMalicious: boolean;
    maliciousProbability: number;
  };
  nlpModel?: {
    predictedClass: string;
    confidence: number;
    probabilities: Record<string, number>;
    contributingFeatures: Array<{ feature: string; contribution: number }>;
  };
  technicalModel?: {
    predictedClass: string;
    confidence: number;
    probabilities: Record<string, number>;
    activeSignals: string[];
    modelName: string;
  };
}

export interface RiskFactor {
  rule: string;
  points: number;
  description: string;
  category: 'authentication' | 'sender' | 'content' | 'links' | 'attachments' | 'infrastructure' | 'ml';
}

export interface RiskScore {
  score: number;
  category: ThreatLevel;
  positiveFactors: RiskFactor[];
  negativeFactors: RiskFactor[];
  unavailableSignals: string[];
  calculationSummary: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'email' | 'domain' | 'url' | 'ip' | 'asn' | 'attachment' | 'case';
  risk?: ThreatLevel;
  details?: Record<string, any>;
}

export interface GraphLink {
  source: string;
  target: string;
  relationship: string;
  suspicious?: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface AiNarrative {
  executiveSummary: string;
  threatActorTTPs: string;
  evidenceHighlights: string[];
  recommendedActions: string[];
  isAiGenerated: boolean;
  modelUsed?: string;
}

export interface EmailCase {
  id: string;
  caseId: string;
  evidenceId: string;
  createdAt: string;
  updatedAt: string;
  status: CaseStatus;
  analystVerdict?: 'CONFIRMED_PHISHING' | 'CONFIRMED_BEC' | 'FALSE_POSITIVE' | 'LEGITIMATE' | 'SUSPICIOUS_SPAM';
  analystNotes: string;
  tags: string[];
  rawEmlContent: string;
  originalFilename: string;
  fileSizeBytes: number;
  sha256: string;
  subject: string;
  from: {
    name: string;
    address: string;
    domain: string;
  };
  to: string[];
  cc: string[];
  replyTo?: string;
  returnPath?: string;
  messageId?: string;
  date?: string;
  plainTextBody: string;
  htmlBody?: string;
  normalizedText: string;
  authentication: EmailAuthentication;
  relayPath: RelayHop[];
  ipIntelligence: IpIntelligence[];
  urls: UrlAnalysis[];
  domains: DomainAnalysis[];
  attachments: AttachmentAnalysis[];
  nlp: NlpIndicators;
  ml: MlPrediction;
  risk: RiskScore;
  aiNarrative: AiNarrative;
  auditLog: AuditLogEntry[];
}

export interface ModelMetrics {
  modelName: string;
  algorithm: string;
  trainingSamplesCount: number;
  testSamplesCount: number;
  classes: string[];
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: {
    labels: string[];
    matrix: number[][];
  };
  topFeaturesPositive: { feature: string; weight: number }[];
  topFeaturesNegative: { feature: string; weight: number }[];
  lastTrainedAt: string;
  datasetDistribution: Record<string, number>;
}
