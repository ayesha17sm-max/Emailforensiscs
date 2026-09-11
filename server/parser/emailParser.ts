import { simpleParser, ParsedMail, HeaderValue } from 'mailparser';
import crypto from 'crypto';
import { AttachmentAnalysis, NlpIndicators } from '../types.js';

export interface ParsedEmailResult {
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
  receivedHeaders: string[];
  rawHeaders: Record<string, string | string[]>;
  plainTextBody: string;
  htmlBody?: string;
  normalizedText: string;
  nlpIndicators: NlpIndicators;
  attachments: AttachmentAnalysis[];
}

export function computeSha256(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function extractDomain(emailOrHost: string): string {
  if (!emailOrHost) return '';
  const clean = emailOrHost.trim().toLowerCase();
  const atIdx = clean.lastIndexOf('@');
  if (atIdx !== -1) {
    return clean.slice(atIdx + 1).replace(/[<>]/g, '').trim();
  }
  return clean.replace(/^[a-z]+:\/\//, '').split('/')[0].split(':')[0].replace(/[<>]/g, '').trim();
}

export function detectHiddenHtml(html: string): { hasHiddenText: boolean; snippet?: string } {
  if (!html) return { hasHiddenText: false };

  // Patterns for hidden CSS or font styling
  const hiddenPatterns = [
    /style=["'][^"']*(?:display:\s*none|visibility:\s*hidden|font-size:\s*0px?|opacity:\s*0|mso-hide:\s*all)[^"']*["'][^>]*>([^<]+)<\//gi,
    /style=["'][^"']*(?:color:\s*(?:#fff(?:fff)?|white|rgb\(255,\s*255,\s*255\));?\s*(?:background|background-color):\s*(?:#fff(?:fff)?|white|rgb\(255,\s*255,\s*255\)))[^"']*["'][^>]*>([^<]+)<\//gi
  ];

  for (const regex of hiddenPatterns) {
    const match = regex.exec(html);
    if (match && match[1] && match[1].trim().length > 0) {
      return {
        hasHiddenText: true,
        snippet: match[1].trim().slice(0, 150)
      };
    }
  }

  // Zero-width characters check
  const zeroWidthRegex = /[\u200B\u200C\u200D\uFEFF]{2,}/;
  if (zeroWidthRegex.test(html)) {
    return {
      hasHiddenText: true,
      snippet: '[Detected sequences of zero-width hidden unicode characters]'
    };
  }

  return { hasHiddenText: false };
}

export function normalizeEmailText(plainText: string, htmlText: string): string {
  let source = plainText || htmlText || '';
  
  // Strip HTML tags if any remain
  source = source.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  source = source.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  source = source.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  source = source
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Remove email quote reply lines (e.g., > ...)
  const lines = source.split(/\r?\n/);
  const filteredLines: string[] = [];
  let skippingQuotes = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('>') || /^-{3,}\s*Original Message\s*-{3,}/i.test(trimmed)) {
      skippingQuotes = true;
      continue;
    }
    if (/^On .+ wrote:$/i.test(trimmed)) {
      skippingQuotes = true;
      continue;
    }
    if (!skippingQuotes) {
      filteredLines.push(line);
    }
  }

  // Normalize whitespace
  return filteredLines.join('\n').replace(/\s{2,}/g, ' ').trim();
}

export function extractNlpFeatures(subject: string, text: string, html: string): NlpIndicators {
  const combined = `${subject} ${text}`.toLowerCase();

  const urgencyWords = ['urgent', 'immediately', 'today', 'action required', 'deadline', 'final warning', 'suspend', 'expire', 'critical', 'asap', 'within 24 hours'];
  const foundUrgency = urgencyWords.filter(w => combined.includes(w));
  const urgencyScore = Math.min(100, foundUrgency.length * 25);

  const financialWords = ['invoice', 'wire', 'transfer', 'bank account', 'ach', 'payment', 'refund', 'transaction', 'remit', 'routing number', 'due date', 'balance'];
  const foundFinancial = financialWords.filter(w => combined.includes(w));
  const financialScore = Math.min(100, foundFinancial.length * 20);

  const credWords = ['password', 'sign in', 'login', 'verify account', 'reset password', 'authentication', 'mfa', 'credentials', 'portal', 'session expired'];
  const foundCred = credWords.filter(w => combined.includes(w));
  const credentialScore = Math.min(100, foundCred.length * 25);

  const execWords = ['ceo', 'cfo', 'coo', 'vp', 'executive', 'director', 'president', 'vendor', 'administrator', 'it support', 'helpdesk', 'treasury'];
  const foundExec = execWords.filter(w => combined.includes(w));
  const impersonationScore = Math.min(100, foundExec.length * 25);

  const threatWords = ['suspension', 'penalty', 'account blocked', 'legal action', 'lawsuit', 'restricted', 'terminated', 'unauthorized access'];
  const foundThreat = threatWords.filter(w => combined.includes(w));
  const threatScore = Math.min(100, foundThreat.length * 30);

  const callToActionMatches = combined.match(/click here|verify now|sign in here|review document|download attachment|log in to|confirm your/g) || [];

  const hidden = detectHiddenHtml(html);

  return {
    urgencyScore,
    urgencyKeywords: foundUrgency,
    financialScore,
    financialKeywords: foundFinancial,
    credentialScore,
    credentialKeywords: foundCred,
    impersonationScore,
    impersonationKeywords: foundExec,
    threatScore,
    threatKeywords: foundThreat,
    callToActionCount: callToActionMatches.length,
    hiddenTextDetected: hidden.hasHiddenText,
    hiddenTextSnippet: hidden.snippet,
    languageDetected: 'English (detected via token distribution)'
  };
}

export async function parseEmailContent(rawEml: string | Buffer): Promise<ParsedEmailResult> {
  const sha256 = computeSha256(rawEml);
  const parsed: ParsedMail = await simpleParser(rawEml);

  // Extract from
  const fromFirst = parsed.from?.value?.[0];
  const fromAddress = fromFirst?.address || '';
  const fromName = fromFirst?.name || fromAddress.split('@')[0] || '';
  const fromDomain = extractDomain(fromAddress);

  // Extract To & CC
  const toList: string[] = [];
  if (parsed.to) {
    const toArr = Array.isArray(parsed.to) ? parsed.to : [parsed.to];
    for (const item of toArr) {
      if (item?.value) {
        for (const addr of item.value) {
          if (addr.address) toList.push(addr.address);
        }
      }
    }
  }

  const ccList: string[] = [];
  if (parsed.cc) {
    const ccArr = Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc];
    for (const item of ccArr) {
      if (item?.value) {
        for (const addr of item.value) {
          if (addr.address) ccList.push(addr.address);
        }
      }
    }
  }

  // Reply-To & Return-Path
  const replyTo = parsed.replyTo?.value?.[0]?.address;
  let returnPath: string | undefined;
  const rawReturnPath = parsed.headers.get('return-path');
  if (rawReturnPath) {
    if (typeof rawReturnPath === 'string') returnPath = rawReturnPath.replace(/[<>]/g, '').trim();
    else if (typeof rawReturnPath === 'object' && 'text' in rawReturnPath) returnPath = (rawReturnPath as any).text?.replace(/[<>]/g, '').trim();
  }

  // Received headers
  const receivedHeaders: string[] = [];
  const rawReceived = parsed.headers.get('received');
  if (rawReceived) {
    if (Array.isArray(rawReceived)) {
      for (const r of rawReceived) {
        if (typeof r === 'string') receivedHeaders.push(r);
        else if (typeof r === 'object' && 'text' in r) receivedHeaders.push((r as any).text);
      }
    } else if (typeof rawReceived === 'string') {
      receivedHeaders.push(rawReceived);
    } else if (typeof rawReceived === 'object' && 'text' in rawReceived) {
      receivedHeaders.push((rawReceived as any).text);
    }
  }

  // Raw headers map
  const rawHeadersMap: Record<string, string | string[]> = {};
  for (const [key, val] of parsed.headers.entries()) {
    if (typeof val === 'string') {
      rawHeadersMap[key] = val;
    } else if (Array.isArray(val)) {
      rawHeadersMap[key] = val.map(v => typeof v === 'string' ? v : (v as any)?.text || JSON.stringify(v));
    } else if (val && typeof val === 'object' && 'text' in val) {
      rawHeadersMap[key] = (val as any).text;
    }
  }

  const plainText = parsed.text || '';
  const htmlBody = typeof parsed.html === 'string' ? parsed.html : undefined;
  const normalizedText = normalizeEmailText(plainText, htmlBody || '');

  // Extract attachments
  const attachments: AttachmentAnalysis[] = [];
  if (parsed.attachments && Array.isArray(parsed.attachments)) {
    for (const att of parsed.attachments) {
      const filename = att.filename || 'unnamed_attachment';
      const ext = (filename.includes('.') ? filename.split('.').pop() || '' : '').toLowerCase();
      const mime = att.contentType || 'application/octet-stream';
      const sizeBytes = att.size || att.content?.length || 0;
      const attSha = att.content ? computeSha256(att.content) : computeSha256(filename);

      // Detect dangerous traits
      const executableExts = ['exe', 'bat', 'cmd', 'scr', 'vbs', 'js', 'hta', 'ps1', 'cpl', 'iso', 'msi'];
      const macroExts = ['docm', 'xlsm', 'pptm', 'dotm', 'xltm'];
      const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'iso'];

      const isExecutable = executableExts.includes(ext);
      const isMacroEnabled = macroExts.includes(ext);
      const isDoubleExtension = /\.[a-z0-9]{2,4}\.(?:exe|scr|vbs|bat|js|cmd)$/i.test(filename);
      const isSuspiciousArchive = archiveExts.includes(ext);
      const isMimeMismatch = (ext === 'pdf' && !mime.includes('pdf')) || (isExecutable && mime.includes('image'));

      const flags: string[] = [];
      let verdict: 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS' = 'SAFE';

      if (isDoubleExtension) {
        flags.push('Double extension masquerade detected');
        verdict = 'MALICIOUS';
      }
      if (isExecutable) {
        flags.push('Direct executable file payload');
        verdict = 'MALICIOUS';
      }
      if (isMacroEnabled) {
        flags.push('Macro-enabled Office document capable of VBA execution');
        verdict = 'SUSPICIOUS';
      }
      if (isSuspiciousArchive) {
        flags.push('Archive file (requires extraction analysis)');
        if (verdict === 'SAFE') verdict = 'SUSPICIOUS';
      }
      if (isMimeMismatch) {
        flags.push(`MIME type mismatch: declared '${mime}' for extension '.${ext}'`);
        verdict = 'SUSPICIOUS';
      }

      attachments.push({
        id: `att-${crypto.randomUUID().slice(0, 8)}`,
        filename,
        extension: ext,
        mimeType: mime,
        sizeBytes,
        sha256: attSha,
        isExecutable,
        isMacroEnabled,
        isDoubleExtension,
        isSuspiciousArchive,
        isMimeMismatch,
        verdict,
        flags
      });
    }
  }

  const nlpIndicators = extractNlpFeatures(parsed.subject || '', normalizedText, htmlBody || '');

  return {
    sha256,
    subject: parsed.subject || '(No Subject)',
    from: {
      name: fromName,
      address: fromAddress,
      domain: fromDomain
    },
    to: toList,
    cc: ccList,
    replyTo,
    returnPath,
    messageId: parsed.messageId,
    date: parsed.date ? parsed.date.toISOString() : undefined,
    receivedHeaders,
    rawHeaders: rawHeadersMap,
    plainTextBody: plainText,
    htmlBody,
    normalizedText,
    nlpIndicators,
    attachments
  };
}
