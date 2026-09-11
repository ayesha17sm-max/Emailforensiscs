import { IpIntelligence } from '../types.js';

const IP_CACHE = new Map<string, IpIntelligence>();

// Built-in infrastructure intelligence database for common email relay IPs
const KNOWN_INFRASTRUCTURE: Record<string, Partial<IpIntelligence>> = {
  // Microsoft 365 / Outlook
  '40.92.0.0': { country: 'United States', countryCode: 'US', region: 'Washington', city: 'Redmond', isp: 'Microsoft Corporation', asn: 'AS8075', org: 'Microsoft Exchange Online' },
  '40.107.0.0': { country: 'United States', countryCode: 'US', region: 'Washington', city: 'Redmond', isp: 'Microsoft Corporation', asn: 'AS8075', org: 'Microsoft Exchange Online Protection' },
  '52.100.0.0': { country: 'United States', countryCode: 'US', region: 'Virginia', city: 'Boydton', isp: 'Microsoft Corporation', asn: 'AS8075', org: 'Microsoft Azure Cloud' },

  // Google Workspace / Gmail
  '209.85.220.41': { country: 'United States', countryCode: 'US', region: 'California', city: 'Mountain View', isp: 'Google LLC', asn: 'AS15169', org: 'Google Mail Servers' },
  '209.85.167.0': { country: 'United States', countryCode: 'US', region: 'California', city: 'Mountain View', isp: 'Google LLC', asn: 'AS15169', org: 'Google Cloud Mail Relay' },

  // Suspicious / Bulletproof / High-risk Demo origins
  '185.220.101.5': { country: 'Germany', countryCode: 'DE', region: 'Hesse', city: 'Frankfurt', isp: 'Zwiebelfreunde e.V.', asn: 'AS205100', org: 'Tor Exit Node Relay', isVpnOrProxy: true, reputationStatus: 'SUSPICIOUS' },
  '194.26.29.112': { country: 'Russian Federation', countryCode: 'RU', region: 'Moscow', city: 'Moscow', isp: 'Chunghwa Telecommunications', asn: 'AS4865', org: 'Offshore Bulletproof Hosting', reputationStatus: 'KNOWN MALICIOUS' },
  '45.154.255.89': { country: 'Netherlands', countryCode: 'NL', region: 'North Holland', city: 'Amsterdam', isp: 'Hostkey B.V.', asn: 'AS57043', org: 'Unverified VPN Gateway', isVpnOrProxy: true, reputationStatus: 'SUSPICIOUS' },
  '103.145.13.22': { country: 'Vietnam', countryCode: 'VN', region: 'Hanoi', city: 'Hanoi', isp: 'Viettel Group', asn: 'AS7552', org: 'Compromised Broadband Dynamic Range', reputationStatus: 'SUSPICIOUS' },
  '91.240.118.15': { country: 'Romania', countryCode: 'RO', region: 'Bucharest', city: 'Bucharest', isp: 'HostSailor Host', asn: 'AS60117', org: 'Known Malicious Infrastructure', reputationStatus: 'KNOWN MALICIOUS' }
};

export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    if (parts.length >= 2) {
      const second = parseInt(parts[1], 10);
      if (second >= 16 && second <= 31) return true;
    }
  }
  return false;
}

export async function lookupIpIntelligence(ip: string): Promise<IpIntelligence> {
  const cleanIp = ip.trim();
  if (IP_CACHE.has(cleanIp)) {
    return IP_CACHE.get(cleanIp)!;
  }

  const isPrivate = isPrivateIp(cleanIp);
  const version = cleanIp.includes(':') ? 'IPv6' : 'IPv4';

  const disclaimer = 'Associated infrastructure location is derived from network routing announcements and BGP registries. It does NOT prove the physical location or identity of the human actor.';

  if (isPrivate) {
    const privIntel: IpIntelligence = {
      ip: cleanIp,
      version,
      isPrivate: true,
      country: 'Private/Internal Network',
      countryCode: 'LAN',
      region: 'Internal RFC 1918 / Loopback',
      city: 'Local Area Network',
      isp: 'Internal Enterprise Network',
      asn: 'N/A',
      org: 'Local Subnet',
      isVpnOrProxy: false,
      reputationStatus: 'NOT FOUND',
      disclaimer
    };
    IP_CACHE.set(cleanIp, privIntel);
    return privIntel;
  }

  // Check known database first
  if (KNOWN_INFRASTRUCTURE[cleanIp]) {
    const match = KNOWN_INFRASTRUCTURE[cleanIp];
    const intel: IpIntelligence = {
      ip: cleanIp,
      version,
      isPrivate: false,
      country: match.country || 'Unknown',
      countryCode: match.countryCode || 'XX',
      region: match.region || 'Unknown',
      city: match.city || 'Unknown',
      isp: match.isp || 'Unknown ISP',
      asn: match.asn || 'AS0',
      org: match.org || 'Unregistered Org',
      isVpnOrProxy: match.isVpnOrProxy || false,
      reputationStatus: match.reputationStatus || 'NOT FOUND',
      disclaimer
    };
    IP_CACHE.set(cleanIp, intel);
    return intel;
  }

  // Attempt live lookup with 1200ms timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const response = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,message,country,countryCode,regionName,city,lat,lon,isp,org,as,proxy`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success') {
        const intel: IpIntelligence = {
          ip: cleanIp,
          version,
          isPrivate: false,
          country: data.country || 'Unknown',
          countryCode: data.countryCode || 'XX',
          region: data.regionName || 'Unknown',
          city: data.city || 'Unknown',
          lat: data.lat,
          lon: data.lon,
          isp: data.isp || 'Unknown ISP',
          asn: data.as ? data.as.split(' ')[0] : 'Unknown',
          org: data.org || data.isp || 'Unknown',
          isVpnOrProxy: Boolean(data.proxy),
          reputationStatus: 'NOT FOUND',
          disclaimer
        };
        IP_CACHE.set(cleanIp, intel);
        return intel;
      }
    }
  } catch (err) {
    // Graceful offline fallback
  }

  // Fallback if network lookup times out or fails
  const fallbackIntel: IpIntelligence = {
    ip: cleanIp,
    version,
    isPrivate: false,
    country: 'Unavailable (Live DNS/API query timed out)',
    countryCode: 'UN',
    region: 'External Internet Hop',
    city: 'Public Gateway',
    isp: 'Public Transit Provider',
    asn: 'BGP Route Object',
    org: 'Internet Autonomous System',
    isVpnOrProxy: false,
    reputationStatus: 'API UNAVAILABLE',
    disclaimer
  };

  IP_CACHE.set(cleanIp, fallbackIntel);
  return fallbackIntel;
}
