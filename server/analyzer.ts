import { parseEmailContent, extractDomain } from './parser/emailParser.js';
import { analyzeEmailAuthentication } from './auth/emailAuth.js';
import { reconstructRelayPath } from './network/relayTracer.js';
import { lookupIpIntelligence } from './network/ipIntelligence.js';
import { extractUrls, analyzeSingleUrl, analyzeDomain } from './analysis/urlDomainAnalyzer.js';
import { threatClassifier } from './ml/model.js';
import { predictNlp, predictTechnical } from '../ml/predict.js';
import { calculateRiskScore } from './scoring/riskEngine.js';
import { generateForensicAiSummary, generateRuleBasedNarrative } from './ai/geminiExplainer.js';
import { EmailCase, CaseStatus, IpIntelligence, DomainAnalysis, MlPrediction, ContributingFeature } from './types.js';
import crypto from 'crypto';

export async function processEmailForInvestigation(params: {
  rawEml: string | Buffer;
  originalFilename?: string;
  analyst?: string;
  skipAiNetworkCall?: boolean;
}): Promise<EmailCase> {
  const rawString = typeof params.rawEml === 'string' ? params.rawEml : params.rawEml.toString('utf-8');
  const filename = params.originalFilename || 'uploaded_email.eml';
  const analystName = params.analyst || 'SOC Analyst';

  // 1. Ingest and parse email
  const parsed = await parseEmailContent(rawString);

  // 2. Authentication analysis (SPF, DKIM, DMARC, ARC, display spoofing, mismatches)
  const auth = analyzeEmailAuthentication({
    rawHeaders: parsed.rawHeaders,
    from: parsed.from,
    replyTo: parsed.replyTo,
    returnPath: parsed.returnPath,
    messageId: parsed.messageId
  });

  // 3. Reconstruct SMTP Relay Path from Received headers
  const relayPath = await reconstructRelayPath(parsed.receivedHeaders);

  // 4. Extract IP addresses & enrich with Geolocation / ASN intelligence
  const ipSet = new Set<string>();
  relayPath.forEach(hop => {
    if (hop.ip && hop.ip !== 'Unknown') ipSet.add(hop.ip);
  });

  const ipIntelligence: IpIntelligence[] = [];
  for (const ip of ipSet) {
    try {
      const intel = await lookupIpIntelligence(ip);
      ipIntelligence.push(intel);
    } catch (e) {}
  }

  // 5. Extract URLs & analyze for typosquatting, shorteners, anchor mismatches
  const rawExtractedUrls = extractUrls(parsed.htmlBody || '', parsed.plainTextBody);
  const urls = rawExtractedUrls.map(u => analyzeSingleUrl(u));

  // 6. Domain Analysis
  const domainMap = new Map<string, DomainAnalysis>();
  if (parsed.from.domain) {
    const dom = await analyzeDomain(parsed.from.domain, 'from');
    domainMap.set(parsed.from.domain, dom);
  }
  if (parsed.replyTo) {
    const replyDom = extractDomain(parsed.replyTo);
    if (replyDom && !domainMap.has(replyDom)) {
      const dom = await analyzeDomain(replyDom, 'reply-to');
      domainMap.set(replyDom, dom);
    }
  }
  for (const u of urls) {
    if (u.domain && !domainMap.has(u.domain)) {
      const dom = await analyzeDomain(u.domain, 'url');
      domainMap.set(u.domain, dom);
    }
  }
  const domains = Array.from(domainMap.values());

  // 7. Actual ML / NLP classification using trained models
  const hasSuspiciousUrl = urls.some(u => u.verdict === 'SUSPICIOUS' || u.verdict === 'MALICIOUS' || u.isLookalike);
  const hasUrlShortener = urls.some(u => u.isShortened);
  const hasSuspiciousAttachment = parsed.attachments.some(a => a.verdict === 'SUSPICIOUS' || a.verdict === 'MALICIOUS');

  // Model 1: Real NLP TF-IDF + Logistic Regression
  const nlpPred = predictNlp(parsed.subject, parsed.normalizedText);

  // Model 2: Real Technical Feature Random Forest
  const techPred = predictTechnical({
    spfStatus: auth.spf.status,
    dkimStatus: auth.dkim.status,
    dmarcStatus: auth.dmarc.status,
    hasDomainMismatch: auth.displaySpoofDetected || auth.fromReturnMismatch,
    hasReplyToMismatch: auth.fromReplyMismatch,
    hasSuspiciousUrl,
    hasUrlShortener,
    hasCredentialRequest: parsed.nlpIndicators.credentialScore >= 35,
    hasFinancialRequest: parsed.nlpIndicators.financialScore >= 35,
    hasUrgency: parsed.nlpIndicators.urgencyScore >= 35,
    hasSuspiciousAttachment,
    ipReputation: ipIntelligence.some(i => i.reputationStatus === 'KNOWN MALICIOUS')
      ? 'KNOWN MALICIOUS'
      : ipIntelligence.some(i => i.reputationStatus === 'SUSPICIOUS')
      ? 'SUSPICIOUS'
      : 'CLEAN',
    domainReputation: domains.some(d => d.flags.length > 0) ? 'SUSPICIOUS' : 'CLEAN'
  });

  // Calculate ensemble blended probabilities: 50% NLP text + 50% Technical signals
  const classes: Array<'Legitimate' | 'Phishing' | 'BEC/Fraud' | 'Spam' | 'Suspicious'> = [
    'Legitimate', 'Phishing', 'BEC/Fraud', 'Spam', 'Suspicious'
  ];
  const blendedProbabilities: Record<string, number> = {};
  let bestClass: 'Legitimate' | 'Phishing' | 'BEC/Fraud' | 'Spam' | 'Suspicious' = 'Legitimate';
  let bestProb = -1;

  for (const c of classes) {
    const pNlp = nlpPred.probabilities[c] || 0;
    const pTech = techPred.probabilities[c] || 0;
    const blended = Number((0.5 * pNlp + 0.5 * pTech).toFixed(4));
    blendedProbabilities[c] = blended;

    if (blended > bestProb) {
      bestProb = blended;
      bestClass = c;
    }
  }

  // Security heuristic: if technical model strongly flags Phishing/BEC (e.g., failed auth + credential/financial lure),
  // do not let a generic vocabulary mask high-confidence technical indicators
  if (techPred.predictedClass !== 'Legitimate' && techPred.confidence >= 0.60 && bestClass === 'Legitimate') {
    bestClass = techPred.predictedClass;
    bestProb = techPred.confidence;
  } else if (nlpPred.predictedClass !== 'Legitimate' && nlpPred.confidence >= 0.75 && bestClass === 'Legitimate') {
    bestClass = nlpPred.predictedClass;
    bestProb = nlpPred.confidence;
  }

  const topFeatures: ContributingFeature[] = [
    ...nlpPred.contributingFeatures.map(f => ({
      feature: `[NLP n-gram] "${f.feature}"`,
      weight: Number((f.contribution * 10).toFixed(2)),
      value: 1,
      impact: 'increases_risk' as const
    })),
    ...techPred.activeSignals.map(sig => ({
      feature: `[Technical RF] ${sig}`,
      weight: 1.5,
      value: 1,
      impact: sig.includes('pass') ? 'decreases_risk' as const : 'increases_risk' as const
    }))
  ];

  const ml: MlPrediction = {
    predictedClass: bestClass,
    confidence: Number(bestProb.toFixed(3)),
    modelName: 'Dual ML Ensemble (TF-IDF LogReg + Technical Random Forest)',
    probabilities: blendedProbabilities,
    topContributingFeatures: topFeatures.slice(0, 10),
    binaryPrediction: {
      isMalicious: bestClass !== 'Legitimate',
      maliciousProbability: Number((1.0 - (blendedProbabilities['Legitimate'] || 0)).toFixed(3))
    },
    nlpModel: {
      predictedClass: nlpPred.predictedClass,
      confidence: nlpPred.confidence,
      probabilities: nlpPred.probabilities,
      contributingFeatures: nlpPred.contributingFeatures
    },
    technicalModel: {
      predictedClass: techPred.predictedClass,
      confidence: techPred.confidence,
      probabilities: techPred.probabilities,
      activeSignals: techPred.activeSignals,
      modelName: 'Random Forest (10 Decision Trees)'
    }
  };

  // 8. Transparent Risk Scoring
  const hasLookalikeDomain = domains.some(d => d.isLookalike);
  const risk = calculateRiskScore({
    auth,
    nlp: parsed.nlpIndicators,
    urls,
    attachments: parsed.attachments,
    relay: relayPath,
    ml,
    hasLookalikeDomain
  });

  // 9. AI Narrative / DFIR Summary (Gemini or rule-based fallback)
  const summaryParams = {
    subject: parsed.subject,
    from: parsed.from,
    auth,
    nlp: parsed.nlpIndicators,
    urls,
    attachments: parsed.attachments,
    relay: relayPath,
    ml,
    risk
  };
  const aiNarrative = params.skipAiNetworkCall
    ? generateRuleBasedNarrative(summaryParams)
    : await generateForensicAiSummary(summaryParams);

  // Generate Case ID & Evidence ID
  const caseNumber = Math.floor(1000 + Math.random() * 9000);
  const caseId = `CASE-2026-${caseNumber}`;
  const evidenceId = `EVID-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const now = new Date().toISOString();

  // Tags: Clearly separate DEMO scenarios from real uploaded emails
  const isDemo = filename.toLowerCase().includes('demo') || (params.analyst && params.analyst.toLowerCase().includes('demo'));
  const tags: string[] = [risk.category.toUpperCase(), isDemo ? 'DEMO_DATA' : 'LIVE_EVIDENCE'];
  if (ml.predictedClass !== 'Legitimate') tags.push(ml.predictedClass.toUpperCase());
  if (auth.displaySpoofDetected) tags.push('DISPLAY_SPOOF');
  if (urls.some(u => u.anchorMismatch)) tags.push('ANCHOR_MISMATCH');
  if (parsed.attachments.some(a => a.isExecutable)) tags.push('MALICIOUS_ATTACHMENT');

  const newCase: EmailCase = {
    id: crypto.randomUUID(),
    caseId,
    evidenceId,
    createdAt: now,
    updatedAt: now,
    status: 'NEW' as CaseStatus,
    analystNotes: '',
    tags,
    rawEmlContent: rawString,
    originalFilename: filename,
    fileSizeBytes: Buffer.byteLength(rawString, 'utf-8'),
    sha256: parsed.sha256,
    subject: parsed.subject,
    from: parsed.from,
    to: parsed.to,
    cc: parsed.cc,
    replyTo: parsed.replyTo,
    returnPath: parsed.returnPath,
    messageId: parsed.messageId,
    date: parsed.date,
    plainTextBody: parsed.plainTextBody,
    htmlBody: parsed.htmlBody,
    normalizedText: parsed.normalizedText,
    authentication: auth,
    relayPath,
    ipIntelligence,
    urls,
    domains,
    attachments: parsed.attachments,
    nlp: parsed.nlpIndicators,
    ml,
    risk,
    aiNarrative,
    auditLog: [
      {
        timestamp: now,
        action: 'EMAIL_INGESTED',
        analyst: analystName,
        details: `Ingested ${filename} (SHA-256: ${parsed.sha256.slice(0, 16)}...). Initial risk score: ${risk.score}/100 (${risk.category}).`
      }
    ]
  };

  return newCase;
}
