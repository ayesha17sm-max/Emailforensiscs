import { EmailAuthentication, AuthCheckResult, AuthStatus } from '../types.js';
import { extractDomain } from '../parser/emailParser.js';

const KNOWN_EXEC_OR_BRAND_NAMES = [
  'ceo', 'cfo', 'coo', 'cio', 'cto', 'president', 'director', 'chairman',
  'microsoft', 'office 365', 'microsoft 365', 'paypal', 'apple', 'google',
  'amazon', 'docusign', 'bank of america', 'wells fargo', 'chase', 'citibank',
  'dropbox', 'it support', 'helpdesk', 'hr department', 'payroll'
];

export function analyzeEmailAuthentication(params: {
  rawHeaders: Record<string, string | string[]>;
  from: { name: string; address: string; domain: string };
  replyTo?: string;
  returnPath?: string;
  messageId?: string;
}): EmailAuthentication {
  const { rawHeaders, from, replyTo, returnPath, messageId } = params;

  // 1. SPF Extraction & Check
  let spfResult: AuthCheckResult = {
    status: 'NOT_AVAILABLE',
    details: 'No Received-SPF or Authentication-Results header found in message',
    headerFound: false
  };

  const receivedSpf = rawHeaders['received-spf'];
  const authResults = rawHeaders['authentication-results'];

  let authString = '';
  if (authResults) {
    authString = Array.isArray(authResults) ? authResults.join(' ') : String(authResults);
  }

  if (receivedSpf) {
    spfResult.headerFound = true;
    const spfText = (Array.isArray(receivedSpf) ? receivedSpf.join(' ') : String(receivedSpf)).toLowerCase();
    if (spfText.includes('pass')) {
      spfResult.status = 'PASS';
      spfResult.details = 'SPF record verified: sender IP authorized by domain policy';
    } else if (spfText.includes('fail') || spfText.includes('softfail')) {
      spfResult.status = 'FAIL';
      spfResult.details = spfText.includes('softfail')
        ? 'SPF SoftFail: sender IP not explicitly authorized by domain SPF record (~all)'
        : 'SPF HardFail: sender IP rejected by domain SPF policy (-all)';
    } else if (spfText.includes('neutral') || spfText.includes('none')) {
      spfResult.status = 'NOT_VERIFIED';
      spfResult.details = 'SPF Neutral/None: domain has no restrictive SPF policy (?all or none)';
    }
  } else if (authString) {
    const spfMatch = authString.match(/spf=([a-z]+)/i);
    if (spfMatch) {
      spfResult.headerFound = true;
      const res = spfMatch[1].toLowerCase();
      if (res === 'pass') {
        spfResult.status = 'PASS';
        spfResult.details = 'SPF verified as Pass via Authentication-Results';
      } else if (res === 'fail' || res === 'softfail') {
        spfResult.status = 'FAIL';
        spfResult.details = `SPF recorded as ${res.toUpperCase()} via Authentication-Results`;
      } else {
        spfResult.status = 'NOT_VERIFIED';
        spfResult.details = `SPF returned non-definitive status (${res})`;
      }
    }
  }

  // 2. DKIM Extraction & Check
  let dkimResult: AuthCheckResult = {
    status: 'NOT_AVAILABLE',
    details: 'No DKIM-Signature header present in email',
    headerFound: false
  };

  const dkimSig = rawHeaders['dkim-signature'];
  if (dkimSig) {
    dkimResult.headerFound = true;
    // Check if authString has dkim result
    const dkimMatch = authString.match(/dkim=([a-z]+)/i);
    if (dkimMatch) {
      const res = dkimMatch[1].toLowerCase();
      if (res === 'pass') {
        dkimResult.status = 'PASS';
        dkimResult.details = 'Cryptographic DKIM signature matches sender domain keys';
      } else if (res === 'fail') {
        dkimResult.status = 'FAIL';
        dkimResult.details = 'DKIM cryptographic signature verification failed (body or headers altered)';
      } else {
        dkimResult.status = 'NOT_VERIFIED';
        dkimResult.details = `DKIM returned verification state: ${res}`;
      }
    } else {
      dkimResult.status = 'NOT_VERIFIED';
      dkimResult.details = 'DKIM signature present in header but DNS verification result was not recorded in MTA logs';
    }
  } else if (authString) {
    const dkimMatch = authString.match(/dkim=([a-z]+)/i);
    if (dkimMatch) {
      dkimResult.headerFound = true;
      const res = dkimMatch[1].toLowerCase();
      dkimResult.status = res === 'pass' ? 'PASS' : (res === 'fail' ? 'FAIL' : 'NOT_VERIFIED');
      dkimResult.details = `DKIM status: ${res.toUpperCase()} from Authentication-Results`;
    }
  }

  // 3. DMARC Extraction & Check
  let dmarcResult: AuthCheckResult = {
    status: 'NOT_AVAILABLE',
    details: 'No DMARC policy evaluation found in message headers',
    headerFound: false
  };

  const dmarcMatch = authString.match(/dmarc=([a-z]+)/i);
  if (dmarcMatch) {
    dmarcResult.headerFound = true;
    const res = dmarcMatch[1].toLowerCase();
    if (res === 'pass') {
      dmarcResult.status = 'PASS';
      dmarcResult.details = 'DMARC alignment passed (SPF/DKIM align with From domain)';
    } else if (res === 'fail') {
      dmarcResult.status = 'FAIL';
      dmarcResult.details = 'DMARC policy failed: alignment between From domain and SPF/DKIM was rejected';
    } else {
      dmarcResult.status = 'NOT_VERIFIED';
      dmarcResult.details = `DMARC evaluation returned status: ${res}`;
    }
  }

  // 4. ARC Check
  let arcResult: AuthCheckResult = {
    status: 'NOT_AVAILABLE',
    details: 'No Authenticated Received Chain (ARC) headers present',
    headerFound: false
  };
  const arcResults = rawHeaders['arc-authentication-results'];
  if (arcResults) {
    arcResult.headerFound = true;
    arcResult.status = 'NOT_VERIFIED';
    arcResult.details = 'ARC headers present (preserved forwarding authentication chain)';
  }

  // 5. Mismatches & Display Name Spoofing
  const detectedMismatches: string[] = [];
  let displaySpoofDetected = false;
  let fromReplyMismatch = false;
  let fromReturnMismatch = false;
  let messageIdSuspicious = false;

  const fromDomain = from.domain.toLowerCase();
  const fromName = from.name.toLowerCase();

  // Display Name Spoofing Check
  for (const keyword of KNOWN_EXEC_OR_BRAND_NAMES) {
    if (fromName.includes(keyword)) {
      // If display name mentions Microsoft, PayPal, CEO, etc., but domain is not genuine
      if (!fromDomain.includes(keyword.replace(/\s+/g, '')) && !fromDomain.includes('company') && !fromDomain.includes('corp')) {
        displaySpoofDetected = true;
        detectedMismatches.push(`Display name claims '${from.name}' (${keyword}) but sent from unrelated domain '${from.domain}'`);
        break;
      }
    }
  }

  // Reply-To mismatch
  if (replyTo) {
    const replyDomain = extractDomain(replyTo).toLowerCase();
    if (replyDomain && replyDomain !== fromDomain) {
      fromReplyMismatch = true;
      detectedMismatches.push(`Reply-To address ('${replyTo}') directs replies to a different domain than From header ('${from.address}')`);
    }
  }

  // Return-Path mismatch
  if (returnPath) {
    const returnDomain = extractDomain(returnPath).toLowerCase();
    if (returnDomain && returnDomain !== fromDomain) {
      fromReturnMismatch = true;
      detectedMismatches.push(`Return-Path envelope domain ('${returnDomain}') does not match From header domain ('${fromDomain}')`);
    }
  }

  // Message-ID check
  if (messageId) {
    const idDomain = extractDomain(messageId).toLowerCase();
    if (idDomain && fromDomain && !idDomain.includes(fromDomain) && !fromDomain.includes(idDomain)) {
      // Check if it's a known bulk/relay service like google.com, amazonses.com, sendgrid.net
      const legitimateRelayProviders = ['google.com', 'amazonses.com', 'sendgrid.net', 'mailgun.org', 'outlook.com'];
      if (!legitimateRelayProviders.some(p => idDomain.includes(p))) {
        messageIdSuspicious = true;
        detectedMismatches.push(`Message-ID domain ('${idDomain}') deviates from From domain ('${fromDomain}')`);
      }
    }
  }

  return {
    spf: spfResult,
    dkim: dkimResult,
    dmarc: dmarcResult,
    arc: arcResult,
    displaySpoofDetected,
    fromReplyMismatch,
    fromReturnMismatch,
    messageIdSuspicious,
    detectedMismatches
  };
}
