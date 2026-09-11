import {
  EmailAuthentication,
  NlpIndicators,
  UrlAnalysis,
  AttachmentAnalysis,
  MlPrediction,
  RiskScore,
  RiskFactor,
  ThreatLevel,
  RelayHop
} from '../types.js';

export const RISK_WEIGHTS = {
  // Authentication
  dmarcFail: { points: 22, rule: 'AUTH_DMARC_FAIL', description: 'DMARC policy validation failed' },
  spfFail: { points: 18, rule: 'AUTH_SPF_FAIL', description: 'SPF sender validation failed' },
  dkimFail: { points: 15, rule: 'AUTH_DKIM_FAIL', description: 'DKIM cryptographic signature verification failed' },
  authAllPassAligned: { points: -25, rule: 'AUTH_FULLY_ALIGNED', description: 'SPF, DKIM, and DMARC passed with valid aligned domain' },

  // Identity
  displayNameSpoof: { points: 25, rule: 'IDENTITY_DISPLAY_SPOOF', description: 'Display name impersonates known executive or organization while sender domain is external' },
  fromReplyMismatch: { points: 18, rule: 'IDENTITY_REPLYTO_MISMATCH', description: 'Reply-To address differs significantly from From address' },
  fromReturnMismatch: { points: 12, rule: 'IDENTITY_RETURNPATH_MISMATCH', description: 'Return-Path envelope sender domain differs from From domain' },
  lookalikeDomain: { points: 28, rule: 'IDENTITY_LOOKALIKE_DOMAIN', description: 'Sender domain matches typosquatting or brand impersonation pattern' },

  // URLs
  urlAnchorMismatch: { points: 26, rule: 'URL_ANCHOR_MISMATCH', description: 'HTML hyperlink text shows trusted domain but destination href points to an external or suspicious host' },
  urlMaliciousIntel: { points: 35, rule: 'URL_KNOWN_MALICIOUS', description: 'Extracted URL flagged by threat intelligence database' },
  urlSuspiciousLookalike: { points: 20, rule: 'URL_LOOKALIKE_DOMAIN', description: 'URL domain is a lookalike/typosquat of major brand' },
  urlIpHost: { points: 20, rule: 'URL_RAW_IP_HOST', description: 'URL points directly to a raw IP address rather than a domain' },
  urlShortened: { points: 12, rule: 'URL_SHORTENED_SERVICE', description: 'URL uses shortener service obscuring ultimate landing target' },
  urlSuspiciousTld: { points: 10, rule: 'URL_SUSPICIOUS_TLD', description: 'URL registered under known high-abuse top-level domain' },

  // Content & NLP
  credentialHarvesting: { points: 22, rule: 'NLP_CREDENTIAL_HARVEST', description: 'Content requests password, account verification, or login credentials' },
  financialDiversion: { points: 24, rule: 'NLP_FINANCIAL_DIVERSION', description: 'Content requests urgent wire transfer, ACH bank update, or payment diversion' },
  executiveImpersonation: { points: 20, rule: 'NLP_EXEC_IMPERSONATION', description: 'Content references executive hierarchy (CEO/CFO/Management) demanding immediate action' },
  highUrgencyThreat: { points: 15, rule: 'NLP_URGENCY_PRESSURE', description: 'Excessive urgency pressure and threat of account suspension/penalties' },
  hiddenHtmlText: { points: 20, rule: 'CONTENT_HIDDEN_HTML', description: 'Obfuscated or hidden HTML text detected (zero-font, CSS display:none, white-on-white text)' },

  // Attachments
  attachmentExecutable: { points: 35, rule: 'ATT_EXECUTABLE_PAYLOAD', description: 'Contains executable file payload (.exe, .scr, .bat, .vbs)' },
  attachmentMacro: { points: 30, rule: 'ATT_MACRO_ENABLED', description: 'Contains macro-enabled office document (.docm, .xlsm)' },
  attachmentDoubleExt: { points: 35, rule: 'ATT_DOUBLE_EXTENSION', description: 'Double file extension masquerade detected (e.g., .pdf.exe)' },
  attachmentSuspiciousArchive: { points: 20, rule: 'ATT_SUSPICIOUS_ARCHIVE', description: 'Encrypted or nested archive file payload' },

  // Infrastructure
  untrustedRelayHop: { points: 14, rule: 'RELAY_UNTRUSTED_HOP', description: 'Relay chain contains anomalous or untrusted intermediate hops' },

  // ML Models
  mlPhishingHigh: { points: 22, rule: 'ML_HIGH_CONF_PHISHING', description: 'Machine learning model predicted Phishing with high confidence (>=75%)' },
  mlPhishingModerate: { points: 14, rule: 'ML_MOD_CONF_PHISHING', description: 'Machine learning model predicted Phishing with moderate confidence (50-74%)' },
  mlBecHigh: { points: 25, rule: 'ML_HIGH_CONF_BEC', description: 'Machine learning model predicted BEC/Fraud with high confidence (>=75%)' },
  mlBecModerate: { points: 16, rule: 'ML_MOD_CONF_BEC', description: 'Machine learning model predicted BEC/Fraud with moderate confidence (50-74%)' },
  mlSuspicious: { points: 15, rule: 'ML_SUSPICIOUS_PREDICTION', description: 'Machine learning model predicted Suspicious activity patterns' },
  mlSpam: { points: 8, rule: 'ML_SPAM_PREDICTION', description: 'Machine learning model predicted Spam patterns' },
  mlLegitimateHigh: { points: -20, rule: 'ML_HIGH_CONF_LEGITIMATE', description: 'Machine learning model predicted Legitimate with high confidence (>=80%)' },
  mlLegitimateModerate: { points: -10, rule: 'ML_MOD_CONF_LEGITIMATE', description: 'Machine learning model predicted Legitimate with moderate confidence (50-79%)' }
};

export function calculateRiskScore(params: {
  auth: EmailAuthentication;
  nlp: NlpIndicators;
  urls: UrlAnalysis[];
  attachments: AttachmentAnalysis[];
  relay: RelayHop[];
  ml: MlPrediction;
  hasLookalikeDomain: boolean;
}): RiskScore {
  const { auth, nlp, urls, attachments, relay, ml, hasLookalikeDomain } = params;

  const positiveFactors: RiskFactor[] = [];
  const negativeFactors: RiskFactor[] = [];
  const unavailableSignals: string[] = [];

  // 1. Authentication
  if (auth.dmarc.status === 'FAIL') {
    positiveFactors.push({ ...RISK_WEIGHTS.dmarcFail, category: 'authentication' });
  } else if (auth.dmarc.status === 'NOT_AVAILABLE') {
    unavailableSignals.push('DMARC DNS record not available in message headers');
  }

  if (auth.spf.status === 'FAIL') {
    positiveFactors.push({ ...RISK_WEIGHTS.spfFail, category: 'authentication' });
  } else if (auth.spf.status === 'NOT_AVAILABLE') {
    unavailableSignals.push('SPF validation not recorded or verifiable');
  }

  if (auth.dkim.status === 'FAIL') {
    positiveFactors.push({ ...RISK_WEIGHTS.dkimFail, category: 'authentication' });
  } else if (auth.dkim.status === 'NOT_AVAILABLE') {
    unavailableSignals.push('DKIM cryptographic signature not present in headers');
  }

  if (auth.spf.status === 'PASS' && auth.dkim.status === 'PASS' && auth.dmarc.status === 'PASS') {
    negativeFactors.push({ ...RISK_WEIGHTS.authAllPassAligned, category: 'authentication' });
  }

  // 2. Identity
  if (auth.displaySpoofDetected) {
    positiveFactors.push({ ...RISK_WEIGHTS.displayNameSpoof, category: 'sender' });
  }
  if (auth.fromReplyMismatch) {
    positiveFactors.push({ ...RISK_WEIGHTS.fromReplyMismatch, category: 'sender' });
  }
  if (auth.fromReturnMismatch) {
    positiveFactors.push({ ...RISK_WEIGHTS.fromReturnMismatch, category: 'sender' });
  }
  if (hasLookalikeDomain) {
    positiveFactors.push({ ...RISK_WEIGHTS.lookalikeDomain, category: 'sender' });
  }

  // 3. URLs
  let hasAnchorMismatch = false;
  let hasMaliciousUrl = false;
  let hasLookalikeUrl = false;
  let hasIpHostUrl = false;
  let hasShortenedUrl = false;
  let hasSuspiciousTldUrl = false;

  for (const url of urls) {
    if (url.anchorMismatch) hasAnchorMismatch = true;
    if (url.verdict === 'MALICIOUS') hasMaliciousUrl = true;
    if (url.isLookalike) hasLookalikeUrl = true;
    if (url.hasIpHost) hasIpHostUrl = true;
    if (url.isShortened) hasShortenedUrl = true;
    if (url.isSuspiciousTld) hasSuspiciousTldUrl = true;
  }

  if (hasMaliciousUrl) positiveFactors.push({ ...RISK_WEIGHTS.urlMaliciousIntel, category: 'links' });
  if (hasAnchorMismatch) positiveFactors.push({ ...RISK_WEIGHTS.urlAnchorMismatch, category: 'links' });
  if (hasLookalikeUrl) positiveFactors.push({ ...RISK_WEIGHTS.urlSuspiciousLookalike, category: 'links' });
  if (hasIpHostUrl) positiveFactors.push({ ...RISK_WEIGHTS.urlIpHost, category: 'links' });
  if (hasShortenedUrl) positiveFactors.push({ ...RISK_WEIGHTS.urlShortened, category: 'links' });
  if (hasSuspiciousTldUrl && !hasLookalikeUrl) positiveFactors.push({ ...RISK_WEIGHTS.urlSuspiciousTld, category: 'links' });

  // 4. Content / NLP
  if (nlp.credentialScore >= 30) {
    positiveFactors.push({ ...RISK_WEIGHTS.credentialHarvesting, category: 'content' });
  }
  if (nlp.financialScore >= 35) {
    positiveFactors.push({ ...RISK_WEIGHTS.financialDiversion, category: 'content' });
  }
  if (nlp.impersonationScore >= 30) {
    positiveFactors.push({ ...RISK_WEIGHTS.executiveImpersonation, category: 'content' });
  }
  if (nlp.urgencyScore >= 35 && nlp.threatScore >= 20) {
    positiveFactors.push({ ...RISK_WEIGHTS.highUrgencyThreat, category: 'content' });
  }
  if (nlp.hiddenTextDetected) {
    positiveFactors.push({ ...RISK_WEIGHTS.hiddenHtmlText, category: 'content' });
  }

  // 5. Attachments
  let hasExe = false;
  let hasMacro = false;
  let hasDoubleExt = false;
  let hasSuspArchive = false;

  for (const att of attachments) {
    if (att.isExecutable) hasExe = true;
    if (att.isMacroEnabled) hasMacro = true;
    if (att.isDoubleExtension) hasDoubleExt = true;
    if (att.isSuspiciousArchive) hasSuspArchive = true;
  }

  if (hasDoubleExt) positiveFactors.push({ ...RISK_WEIGHTS.attachmentDoubleExt, category: 'attachments' });
  if (hasExe) positiveFactors.push({ ...RISK_WEIGHTS.attachmentExecutable, category: 'attachments' });
  if (hasMacro) positiveFactors.push({ ...RISK_WEIGHTS.attachmentMacro, category: 'attachments' });
  if (hasSuspArchive) positiveFactors.push({ ...RISK_WEIGHTS.attachmentSuspiciousArchive, category: 'attachments' });

  // 6. Relay infrastructure
  const hasUntrustedHop = relay.some(h => h.trustAssessment === 'untrusted/possibly forged hop');
  if (hasUntrustedHop) {
    positiveFactors.push({ ...RISK_WEIGHTS.untrustedRelayHop, category: 'infrastructure' });
  }

  // 7. ML classifier
  if (ml.predictedClass === 'Phishing') {
    if (ml.confidence >= 0.75) {
      positiveFactors.push({ ...RISK_WEIGHTS.mlPhishingHigh, category: 'ml' });
    } else if (ml.confidence >= 0.50) {
      positiveFactors.push({ ...RISK_WEIGHTS.mlPhishingModerate, category: 'ml' });
    }
  } else if (ml.predictedClass === 'BEC/Fraud') {
    if (ml.confidence >= 0.75) {
      positiveFactors.push({ ...RISK_WEIGHTS.mlBecHigh, category: 'ml' });
    } else if (ml.confidence >= 0.50) {
      positiveFactors.push({ ...RISK_WEIGHTS.mlBecModerate, category: 'ml' });
    }
  } else if (ml.predictedClass === 'Suspicious') {
    positiveFactors.push({ ...RISK_WEIGHTS.mlSuspicious, category: 'ml' });
  } else if (ml.predictedClass === 'Spam') {
    positiveFactors.push({ ...RISK_WEIGHTS.mlSpam, category: 'ml' });
  } else if (ml.predictedClass === 'Legitimate') {
    if (ml.confidence >= 0.80) {
      negativeFactors.push({ ...RISK_WEIGHTS.mlLegitimateHigh, category: 'ml' });
    } else if (ml.confidence >= 0.50) {
      negativeFactors.push({ ...RISK_WEIGHTS.mlLegitimateModerate, category: 'ml' });
    }
  }

  // Calculate raw sum
  const positiveSum = positiveFactors.reduce((acc, f) => acc + f.points, 0);
  const negativeSum = negativeFactors.reduce((acc, f) => acc + f.points, 0);
  
  let rawScore = positiveSum + negativeSum;
  // Bound to 0-100
  let finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Categorize
  let category: ThreatLevel = 'Low';
  if (finalScore >= 76) category = 'Critical';
  else if (finalScore >= 51) category = 'High';
  else if (finalScore >= 26) category = 'Moderate';
  else category = 'Low';

  const summary = `Base score composed of +${positiveSum} risk points from ${positiveFactors.length} indicators, mitigated by ${negativeSum} points from verified legitimate signals. Final risk assessed at ${finalScore}/100 (${category}).`;

  return {
    score: finalScore,
    category,
    positiveFactors,
    negativeFactors,
    unavailableSignals,
    calculationSummary: summary
  };
}
