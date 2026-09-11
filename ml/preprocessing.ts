import { DatasetItem } from './types.js';

export const STOPWORDS = new Set([
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

export function cleanAndTokenize(text: string): string[] {
  if (!text) return [];
  const normalized = text.toLowerCase().replace(/[^a-z0-9_\-\s]/g, ' ');
  const rawTokens = normalized.split(/\s+/).filter(t => t.length >= 3 && !STOPWORDS.has(t));

  // Generate unigrams + bigrams for richer n-gram representation
  const tokens: string[] = [...rawTokens];
  for (let i = 0; i < rawTokens.length - 1; i++) {
    tokens.push(`${rawTokens[i]}_${rawTokens[i + 1]}`);
  }
  return tokens;
}

export const TECHNICAL_FEATURE_NAMES = [
  'spf_pass',
  'spf_fail',
  'dkim_pass',
  'dkim_fail',
  'dmarc_pass',
  'dmarc_fail',
  'domain_mismatch',
  'replyto_mismatch',
  'suspicious_url',
  'url_shortener',
  'credential_request',
  'financial_request',
  'urgency_pressure',
  'suspicious_attachment',
  'ip_untrusted_or_malicious',
  'domain_untrusted_or_malicious'
];

export function extractTechnicalFeatureVector(item: {
  spfStatus: string;
  dkimStatus: string;
  dmarcStatus: string;
  hasDomainMismatch: boolean;
  hasReplyToMismatch: boolean;
  hasSuspiciousUrl: boolean;
  hasUrlShortener: boolean;
  hasCredentialRequest: boolean;
  hasFinancialRequest: boolean;
  hasUrgency: boolean;
  hasSuspiciousAttachment: boolean;
  ipReputation?: string;
  domainReputation?: string;
}): number[] {
  const spfPass = item.spfStatus === 'PASS' ? 1 : 0;
  const spfFail = item.spfStatus === 'FAIL' ? 1 : 0;
  const dkimPass = item.dkimStatus === 'PASS' ? 1 : 0;
  const dkimFail = item.dkimStatus === 'FAIL' ? 1 : 0;
  const dmarcPass = item.dmarcStatus === 'PASS' ? 1 : 0;
  const dmarcFail = item.dmarcStatus === 'FAIL' ? 1 : 0;
  const domainMismatch = item.hasDomainMismatch ? 1 : 0;
  const replyToMismatch = item.hasReplyToMismatch ? 1 : 0;
  const suspiciousUrl = item.hasSuspiciousUrl ? 1 : 0;
  const urlShortener = item.hasUrlShortener ? 1 : 0;
  const credentialReq = item.hasCredentialRequest ? 1 : 0;
  const financialReq = item.hasFinancialRequest ? 1 : 0;
  const urgency = item.hasUrgency ? 1 : 0;
  const suspiciousAtt = item.hasSuspiciousAttachment ? 1 : 0;

  const ipRep = (item.ipReputation === 'KNOWN MALICIOUS' || item.ipReputation === 'SUSPICIOUS') ? 1 : 0;
  const domainRep = (item.domainReputation === 'KNOWN MALICIOUS' || item.domainReputation === 'SUSPICIOUS') ? 1 : 0;

  return [
    spfPass,
    spfFail,
    dkimPass,
    dkimFail,
    dmarcPass,
    dmarcFail,
    domainMismatch,
    replyToMismatch,
    suspiciousUrl,
    urlShortener,
    credentialReq,
    financialReq,
    urgency,
    suspiciousAtt,
    ipRep,
    domainRep
  ];
}
