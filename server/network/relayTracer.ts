import { RelayHop, RelayTrust } from '../types.js';
import { isPrivateIp, lookupIpIntelligence } from './ipIntelligence.js';

export async function reconstructRelayPath(receivedHeaders: string[]): Promise<RelayHop[]> {
  if (!receivedHeaders || receivedHeaders.length === 0) {
    return [];
  }

  // Received headers are ordered newest (recipient mail server) at index 0,
  // down to oldest (sender / earliest observed node) at index N-1.
  // We reverse them so sequence 1 is the earliest observed node.
  const chronological = [...receivedHeaders].reverse();
  const hops: RelayHop[] = [];

  const ipRegex = /(?:\[(?:::ffff:)?([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\]|\b([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\b)/;
  const hostRegex = /from\s+([a-zA-Z0-9.\-_]+)/i;
  const byRegex = /by\s+([a-zA-Z0-9.\-_]+)/i;
  const dateRegex = /;\s*([A-Za-z]+,\s*\d+\s+[A-Za-z]+\s+\d{4}\s+\d{2}:\d{2}:\d{2}[^;\r\n]*)/;

  for (let i = 0; i < chronological.length; i++) {
    const raw = chronological[i];
    const seq = i + 1;
    const isEarliest = i === 0;
    const isFinalHop = i === chronological.length - 1;

    // Extract IP
    const ipMatch = ipRegex.exec(raw);
    const ip = ipMatch ? (ipMatch[1] || ipMatch[2]) : (isEarliest ? '127.0.0.1' : 'Unknown');

    // Extract hostname
    const hostMatch = hostRegex.exec(raw);
    const hostname = hostMatch ? hostMatch[1] : 'unspecified-mta';

    // Extract by host
    const byMatch = byRegex.exec(raw);
    const byHost = byMatch ? byMatch[1] : undefined;

    // Extract timestamp
    const dateMatch = dateRegex.exec(raw);
    const timestamp = dateMatch ? dateMatch[1].trim() : undefined;

    const isPriv = isPrivateIp(ip);

    // Determine trust assessment
    let trustAssessment: RelayTrust = 'trusted hop';

    if (isEarliest) {
      trustAssessment = isPriv ? 'untrusted/possibly forged hop' : 'earliest observed IP';
    } else if (i === 1 && hops[0]?.trustAssessment === 'untrusted/possibly forged hop') {
      trustAssessment = 'probable infrastructure origin';
    } else if (!isFinalHop && (raw.includes('unverified') || raw.includes('unknown') || isPriv)) {
      trustAssessment = 'untrusted/possibly forged hop';
    } else {
      trustAssessment = 'trusted hop';
    }

    // Geolocation / ASN enrichment
    let geo = { country: 'Unknown', city: 'Unknown', asn: 'AS0', org: 'Unknown' };
    if (ip && ip !== 'Unknown') {
      try {
        const intel = await lookupIpIntelligence(ip);
        geo = {
          country: intel.country,
          city: intel.city,
          asn: intel.asn,
          org: intel.org
        };
      } catch (e) {
        // Fallback
      }
    }

    hops.push({
      hopNumber: seq,
      ip,
      hostname,
      byHost,
      timestamp,
      rawHeader: raw.trim(),
      trustAssessment,
      country: geo.country,
      city: geo.city,
      asn: geo.asn,
      org: geo.org,
      isPrivateIp: isPriv
    });
  }

  return hops;
}
