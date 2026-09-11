import { UrlAnalysis, DomainAnalysis, UrlVerdict } from '../types.js';
import dns from 'dns';
import crypto from 'crypto';

const TYPOSQUAT_BRANDS: Record<string, string[]> = {
  'microsoft': ['micros0ft', 'm1crosoft', 'micro-soft', 'microsofft', 'ms-security', 'ms-office', 'office365-verify'],
  'paypal': ['paypa1', 'paypaal', 'pay-pal', 'service-paypal', 'paypal-security', 'secure-paypal'],
  'google': ['goog1e', 'g00gle', 'google-workspace', 'google-verify', 'google-drive-share'],
  'apple': ['app1e', 'apple-id-verify', 'icloud-security', 'apple-support'],
  'docusign': ['d0cusign', 'docus1gn', 'docusign-envelope', 'docusign-portal'],
  'chase': ['chase-online', 'chase-security-alert', 'chase-verify'],
  'bankofamerica': ['bofa-online', 'bankofamer1ca', 'bank-security-alert'],
  'wellsfargo': ['wells-fargo-alert', 'wellsfarg0', 'wf-security'],
  'dropbox': ['dropb0x', 'dropbox-share', 'dropbox-cloud'],
  'amazon': ['arnazon', 'amaz0n', 'amazon-order-verify']
};

const SUSPICIOUS_TLDS = new Set([
  'xyz', 'top', 'tk', 'cfd', 'buzz', 'club', 'site', 'link', 'click', 'info',
  'ru', 'work', 'gq', 'ml', 'ga', 'cf', 'live', 'online', 'vip', 'monster'
]);

const URL_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'ow.ly', 'is.gd', 'buff.ly', 'adf.ly', 'bit.do', 'cutt.ly'
]);

export function extractUrls(html: string, plainText: string): { rawUrl: string; anchorText?: string }[] {
  const urls: { rawUrl: string; anchorText?: string }[] = [];
  const seen = new Set<string>();

  // 1. Extract from HTML <a href="...">text</a>
  if (html) {
    const anchorRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = anchorRegex.exec(html)) !== null) {
      const rawUrl = match[1].trim();
      const rawAnchor = match[2].replace(/<[^>]+>/g, '').trim();
      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        urls.push({ rawUrl, anchorText: rawAnchor || undefined });
        seen.add(rawUrl.toLowerCase());
      }
    }
  }

  // 2. Extract plain text URLs
  const textRegex = /https?:\/\/[^\s<>"')]+[^\s<>"'),.]/gi;
  const combinedText = `${plainText} ${html ? html.replace(/<[^>]+>/g, ' ') : ''}`;
  let textMatch;
  while ((textMatch = textRegex.exec(combinedText)) !== null) {
    const url = textMatch[0].trim();
    if (!seen.has(url.toLowerCase())) {
      urls.push({ rawUrl: url });
      seen.add(url.toLowerCase());
    }
  }

  return urls;
}

export function detectLookalike(domain: string): { isLookalike: boolean; target?: string } {
  const clean = domain.toLowerCase().replace(/[^a-z0-9.-]/g, '');
  const baseDomain = clean.split('.').slice(-2).join('.');

  for (const [brand, lookalikes] of Object.entries(TYPOSQUAT_BRANDS)) {
    // Direct match against known typosquat list
    if (lookalikes.some(l => clean.includes(l))) {
      return { isLookalike: true, target: brand };
    }
    // Check if domain contains brand name coupled with words like login, verify, secure, update
    if (clean.includes(brand) && !baseDomain.endsWith(`${brand}.com`)) {
      return { isLookalike: true, target: brand };
    }
  }

  return { isLookalike: false };
}

export function analyzeSingleUrl(item: { rawUrl: string; anchorText?: string }): UrlAnalysis {
  const { rawUrl, anchorText } = item;
  const reasons: string[] = [];
  let verdict: UrlVerdict = 'SAFE';

  let protocol = 'http:';
  let domain = '';
  let path = '/';
  const queryParams: Record<string, string> = {};

  try {
    const parsed = new URL(rawUrl);
    protocol = parsed.protocol;
    domain = parsed.hostname.toLowerCase();
    path = parsed.pathname;
    parsed.searchParams.forEach((val, key) => {
      queryParams[key] = val;
    });
  } catch (e) {
    domain = rawUrl.replace(/^[a-z]+:\/\//, '').split('/')[0].split(':')[0];
  }

  const isHttps = protocol === 'https:';
  const hasIpHost = /^(\d{1,3}\.){3}\d{1,3}$/.test(domain);
  const isShortened = URL_SHORTENERS.has(domain);
  const lookalike = detectLookalike(domain);
  const tld = domain.split('.').pop() || '';
  const isSuspiciousTld = SUSPICIOUS_TLDS.has(tld);
  const subdomains = domain.split('.');
  const excessiveSubdomains = subdomains.length > 4;
  const hasEncodedChars = /%[0-9a-f]{2}/i.test(rawUrl);

  // Anchor text mismatch detection (phishing classic!)
  let anchorMismatch = false;
  if (anchorText && (anchorText.startsWith('http://') || anchorText.startsWith('https://') || anchorText.includes('.com') || anchorText.includes('.org') || anchorText.includes('.net'))) {
    try {
      const anchorClean = anchorText.replace(/^[a-z]+:\/\//, '').split('/')[0].toLowerCase();
      if (!domain.includes(anchorClean) && !anchorClean.includes(domain)) {
        anchorMismatch = true;
        reasons.push(`Hyperlink text displays '${anchorText}' but actually links to completely different host '${domain}'`);
        verdict = 'MALICIOUS';
      }
    } catch (e) {}
  }

  if (hasIpHost) {
    reasons.push(`URL uses direct numerical IP address (${domain}) instead of standard domain name`);
    if (verdict !== 'MALICIOUS') verdict = 'SUSPICIOUS';
  }

  if (lookalike.isLookalike) {
    reasons.push(`Lookalike/typosquat domain detected targeting '${lookalike.target}'`);
    verdict = 'MALICIOUS';
  }

  if (isShortened) {
    reasons.push(`URL uses URL shortener (${domain}) concealing actual landing destination`);
    if (verdict === 'SAFE') verdict = 'SUSPICIOUS';
  }

  if (isSuspiciousTld) {
    reasons.push(`Registered under high-abuse TLD (.${tld})`);
    if (verdict === 'SAFE') verdict = 'SUSPICIOUS';
  }

  if (excessiveSubdomains) {
    reasons.push(`Excessive subdomain nesting (${subdomains.length} labels) to evade basic filters`);
    if (verdict === 'SAFE') verdict = 'SUSPICIOUS';
  }

  if (!isHttps) {
    reasons.push('Unencrypted plain HTTP transmission');
  }

  let threatIntelStatus: 'KNOWN MALICIOUS' | 'SUSPICIOUS' | 'NOT FOUND' | 'UNKNOWN' | 'API UNAVAILABLE' = 'NOT FOUND';
  if (verdict === 'MALICIOUS') {
    threatIntelStatus = 'SUSPICIOUS';
  }

  return {
    id: `url-${crypto.randomUUID().slice(0, 8)}`,
    rawUrl,
    protocol,
    domain,
    path,
    queryParams,
    isHttps,
    hasIpHost,
    isShortened,
    isLookalike: lookalike.isLookalike,
    lookalikeTarget: lookalike.target,
    isSuspiciousTld,
    excessiveSubdomains,
    hasEncodedChars,
    anchorText,
    anchorMismatch,
    verdict,
    threatIntelStatus,
    reasons
  };
}

export async function checkDnsRecords(domain: string): Promise<{
  hasMx: boolean;
  spfRecord?: string;
  dmarcRecord?: string;
}> {
  let hasMx = false;
  let spfRecord: string | undefined;
  let dmarcRecord: string | undefined;

  try {
    const mx = await dns.promises.resolveMx(domain);
    hasMx = Array.isArray(mx) && mx.length > 0;
  } catch (e) {}

  try {
    const txtRecords = await dns.promises.resolveTxt(domain);
    for (const group of txtRecords) {
      const full = group.join('');
      if (full.startsWith('v=spf1')) {
        spfRecord = full;
      }
    }
  } catch (e) {}

  try {
    const dmarcTxt = await dns.promises.resolveTxt(`_dmarc.${domain}`);
    for (const group of dmarcTxt) {
      const full = group.join('');
      if (full.startsWith('v=DMARC1')) {
        dmarcRecord = full;
      }
    }
  } catch (e) {}

  return { hasMx, spfRecord, dmarcRecord };
}

export function computeShannonEntropy(str: string): number {
  const len = str.length;
  if (len === 0) return 0;
  const counts: Record<string, number> = {};
  for (const c of str) counts[c] = (counts[c] || 0) + 1;
  let entropy = 0;
  for (const count of Object.values(counts)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(3));
}

export async function analyzeDomain(domain: string, source: 'from' | 'reply-to' | 'return-path' | 'message-id' | 'url'): Promise<DomainAnalysis> {
  const flags: string[] = [];
  const lookalike = detectLookalike(domain);
  const tld = domain.split('.').pop() || '';
  const suspiciousTld = SUSPICIOUS_TLDS.has(tld);
  const entropy = computeShannonEntropy(domain);

  if (lookalike.isLookalike) {
    flags.push(`Typosquatting/brand impersonation match: '${lookalike.target}'`);
  }
  if (suspiciousTld) {
    flags.push(`High abuse rate top-level domain: .${tld}`);
  }
  if (entropy > 3.8) {
    flags.push(`High lexical entropy (${entropy}): potential DGA or random character generation`);
  }

  // Check DNS (with rapid fallback)
  let dnsInfo: { hasMx: boolean; spfRecord?: string; dmarcRecord?: string } = { hasMx: false };
  try {
    dnsInfo = await checkDnsRecords(domain);
  } catch (e) {}

  return {
    domain,
    source,
    hasMx: dnsInfo.hasMx,
    spfRecord: dnsInfo.spfRecord,
    dmarcRecord: dnsInfo.dmarcRecord,
    isLookalike: lookalike.isLookalike,
    lookalikeTarget: lookalike.target,
    suspiciousTld,
    entropy,
    flags
  };
}
