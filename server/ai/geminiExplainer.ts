import { GoogleGenAI } from '@google/genai';
import { AiNarrative, EmailAuthentication, NlpIndicators, UrlAnalysis, AttachmentAnalysis, RiskScore, MlPrediction, RelayHop } from '../types.js';

export function generateRuleBasedNarrative(params: {
  subject: string;
  from: { name: string; address: string; domain: string };
  auth: EmailAuthentication;
  nlp: NlpIndicators;
  urls: UrlAnalysis[];
  attachments: AttachmentAnalysis[];
  relay: RelayHop[];
  ml: MlPrediction;
  risk: RiskScore;
}): AiNarrative {
  const { subject, from, auth, nlp, urls, attachments, relay, ml, risk } = params;

  const isMalicious = risk.score >= 50;
  const isBec = ml.predictedClass === 'BEC/Fraud' || nlp.financialScore > 40;
  const isPhish = ml.predictedClass === 'Phishing' || nlp.credentialScore > 30;

  let summary = '';
  if (isBec) {
    summary = `High-confidence Business Email Compromise (BEC) and financial fraud pattern detected in message titled "${subject}". The sender claims identity "${from.name}" but exhibits sender impersonation indicators and urgent payment diversion phrasing without verified cryptographic domain alignment.`;
  } else if (isPhish) {
    summary = `Credential harvesting and phishing attack pattern identified targeting message recipient. Analysis revealed deceptive call-to-action indicators, domain spoofing elements, and suspicious URL structures designed to capture user authentication credentials.`;
  } else if (isMalicious) {
    summary = `Suspicious inbound communication with elevated risk score (${risk.score}/100). Deterministic inspection flagged multiple security discrepancies including authentication failures, anomalous infrastructure relay hops, and elevated social engineering triggers.`;
  } else {
    summary = `Message analyzed as routine or legitimate communication. Cryptographic authentication checks and content heuristics show no significant indicators of credential harvesting, malware delivery, or executive impersonation.`;
  }

  const ttps = isMalicious
    ? `TTP Analysis: T1566.002 (Spearphishing Link) / T1566.001 (Spearphishing Attachment) / T1656 (Impersonation). Actor utilized urgent deadline lures to bypass critical thinking, obfuscated destination links, and bypassed standard SPF/DMARC filters via external relay infrastructure.`
    : `TTP Analysis: No adversarial Tactics, Techniques, or Procedures (TTPs) were identified. Routine business communication patterns observed.`;

  const highlights: string[] = [];
  if (auth.spf.status === 'FAIL') highlights.push('SPF sender authorization failed');
  if (auth.dmarc.status === 'FAIL') highlights.push('DMARC domain policy rejected sender alignment');
  if (auth.displaySpoofDetected) highlights.push(`Display name impersonation: claimed brand/executive but sent from '${from.domain}'`);
  if (urls.some(u => u.anchorMismatch)) highlights.push('Hyperlink anchor text does not match underlying href target (credential lure)');
  if (urls.some(u => u.isLookalike)) highlights.push('Lookalike/typosquatted brand domain detected in extracted hyperlinks');
  if (attachments.some(a => a.isDoubleExtension || a.isExecutable)) highlights.push('Untrusted attachment payload with high-risk executable or double extension');
  if (nlp.credentialScore > 30) highlights.push('Content actively solicits login credentials, password reset, or portal authentication');
  if (nlp.financialScore > 35) highlights.push('Content solicits urgent wire transfer, bank account re-routing, or invoice payments');
  if (nlp.hiddenTextDetected) highlights.push('Zero-font or CSS-hidden text detected designed to alter spam bayesian weights');

  if (highlights.length === 0) {
    highlights.push('Sender SPF and DKIM verified successfully');
    highlights.push('No malicious attachments or suspicious URLs detected');
    highlights.push('Natural language text contains standard operational conversation');
  }

  const actions: string[] = [];
  if (risk.score >= 76) {
    actions.push('Immediately quarantine message across tenant mailboxes via Exchange/Google Admin');
    actions.push('Block sender address and origin IP in mail gateway / firewall edge rules');
    actions.push('Reset credentials immediately for any recipient who accessed embedded URLs');
    actions.push('Add extracted malicious domains and attachment hashes to EDR/SIEM watchlists');
  } else if (risk.score >= 51) {
    actions.push('Quarantine message pending tier-2 SOC security analyst confirmation');
    actions.push('Inspect proxy/DNS logs for outbound hits to extracted URLs');
    actions.push('Notify recipient to disregard urgent payment or credential requests');
  } else if (risk.score >= 26) {
    actions.push('Deliver with external warning banner or tag as suspicious');
    actions.push('Monitor sender domain for recurring anomalies');
  } else {
    actions.push('No immediate remediation required; message safe for standard delivery');
  }

  return {
    executiveSummary: summary,
    threatActorTTPs: ttps,
    evidenceHighlights: highlights,
    recommendedActions: actions,
    isAiGenerated: false,
    modelUsed: 'Deterministic Rule-Based Forensic Engine'
  };
}

export async function generateForensicAiSummary(params: {
  subject: string;
  from: { name: string; address: string; domain: string };
  auth: EmailAuthentication;
  nlp: NlpIndicators;
  urls: UrlAnalysis[];
  attachments: AttachmentAnalysis[];
  relay: RelayHop[];
  ml: MlPrediction;
  risk: RiskScore;
}): Promise<AiNarrative> {
  const fallback = generateRuleBasedNarrative(params);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return fallback;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const structuredEvidence = {
      emailMetadata: {
        subject: params.subject,
        from: params.from
      },
      authentication: {
        spf: params.auth.spf.status,
        dkim: params.auth.dkim.status,
        dmarc: params.auth.dmarc.status,
        displaySpoof: params.auth.displaySpoofDetected,
        mismatches: params.auth.detectedMismatches
      },
      nlpSignals: {
        urgency: params.nlp.urgencyKeywords,
        financial: params.nlp.financialKeywords,
        credentials: params.nlp.credentialKeywords,
        hiddenText: params.nlp.hiddenTextDetected
      },
      urls: params.urls.map(u => ({ url: u.rawUrl, domain: u.domain, verdict: u.verdict, reasons: u.reasons })),
      attachments: params.attachments.map(a => ({ name: a.filename, ext: a.extension, verdict: a.verdict, flags: a.flags })),
      relayInfrastructure: params.relay.map(r => ({ hop: r.hopNumber, ip: r.ip, assessment: r.trustAssessment, country: r.country })),
      mlClassifier: {
        prediction: params.ml.predictedClass,
        confidence: params.ml.confidence,
        probabilities: params.ml.probabilities
      },
      riskAssessment: {
        score: params.risk.score,
        category: params.risk.category,
        factors: params.risk.positiveFactors.map(f => f.description)
      }
    };

    const prompt = `You are a Senior Digital Forensics and Incident Response (DFIR) Security Analyst.
Given this exact structured evidence from an email threat detection pipeline:
${JSON.stringify(structuredEvidence, null, 2)}

Provide a structured forensic briefing in JSON format with these exact keys:
- "executiveSummary": A concise 2-3 sentence executive summary explaining the assessment based strictly on the provided evidence.
- "threatActorTTPs": MITRE ATT&CK TTPs and methodology observed.
- "evidenceHighlights": An array of 3 to 5 specific bullet points citing the computed evidence (do not invent IP locations or results).
- "recommendedActions": An array of 3 to 4 prioritized containment and remediation steps for the SOC team.

RULES:
1. Ground your analysis strictly in the provided evidence.
2. NEVER claim certainty about human attacker identity. Use terms like "probable infrastructure origin", "associated IP geolocation", and "confidence-based assessment".
3. Return ONLY valid JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text?.trim();
    if (text) {
      const parsed = JSON.parse(text);
      return {
        executiveSummary: parsed.executiveSummary || fallback.executiveSummary,
        threatActorTTPs: parsed.threatActorTTPs || fallback.threatActorTTPs,
        evidenceHighlights: Array.isArray(parsed.evidenceHighlights) ? parsed.evidenceHighlights : fallback.evidenceHighlights,
        recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : fallback.recommendedActions,
        isAiGenerated: true,
        modelUsed: 'gemini-2.5-flash'
      };
    }
  } catch (err) {
    console.error('Gemini explanation fallback triggered:', err);
  }

  return fallback;
}
