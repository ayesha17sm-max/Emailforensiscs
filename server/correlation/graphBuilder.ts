import { GraphData, GraphNode, GraphLink, EmailCase, ThreatLevel } from '../types.js';

export function buildCaseGraph(currentCase: EmailCase, allCases: EmailCase[] = []): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const addedNodeIds = new Set<string>();

  function addNode(node: GraphNode) {
    if (!addedNodeIds.has(node.id)) {
      addedNodeIds.add(node.id);
      nodes.push(node);
    }
  }

  function addLink(link: GraphLink) {
    links.push(link);
  }

  // 1. Central Email Case Node
  const emailNodeId = `case-${currentCase.caseId}`;
  addNode({
    id: emailNodeId,
    label: currentCase.subject.length > 30 ? `${currentCase.subject.slice(0, 30)}...` : currentCase.subject,
    type: 'email',
    risk: currentCase.risk.category,
    details: {
      caseId: currentCase.caseId,
      sender: currentCase.from.address,
      score: currentCase.risk.score,
      verdict: currentCase.ml.predictedClass
    }
  });

  // 2. Sender Domain Node
  if (currentCase.from.domain) {
    const domainId = `dom-${currentCase.from.domain}`;
    const isDomainSuspicious = currentCase.authentication.displaySpoofDetected || currentCase.domains.some(d => d.domain === currentCase.from.domain && d.isLookalike);
    addNode({
      id: domainId,
      label: currentCase.from.domain,
      type: 'domain',
      risk: isDomainSuspicious ? 'High' : 'Low',
      details: {
        source: 'from_header',
        mismatches: currentCase.authentication.detectedMismatches
      }
    });

    addLink({
      source: emailNodeId,
      target: domainId,
      relationship: 'sent_from_domain',
      suspicious: isDomainSuspicious
    });
  }

  // 3. URLs
  currentCase.urls.slice(0, 8).forEach(u => {
    const urlId = `url-${u.domain}-${u.id}`;
    addNode({
      id: urlId,
      label: u.domain,
      type: 'url',
      risk: u.verdict === 'MALICIOUS' ? 'Critical' : (u.verdict === 'SUSPICIOUS' ? 'High' : 'Low'),
      details: {
        rawUrl: u.rawUrl,
        verdict: u.verdict,
        anchorMismatch: u.anchorMismatch
      }
    });

    addLink({
      source: emailNodeId,
      target: urlId,
      relationship: 'embeds_link',
      suspicious: u.verdict !== 'SAFE'
    });
  });

  // 4. Relay IP & Origin Infrastructure
  currentCase.relayPath.forEach(hop => {
    if (hop.ip && !hop.isPrivateIp && hop.ip !== 'Unknown') {
      const ipNodeId = `ip-${hop.ip}`;
      const isUntrusted = hop.trustAssessment === 'untrusted/possibly forged hop' || hop.trustAssessment === 'earliest observed IP';

      addNode({
        id: ipNodeId,
        label: `${hop.ip} (${hop.country || 'N/A'})`,
        type: 'ip',
        risk: isUntrusted ? 'Moderate' : 'Low',
        details: {
          ip: hop.ip,
          assessment: hop.trustAssessment,
          country: hop.country,
          city: hop.city
        }
      });

      addLink({
        source: emailNodeId,
        target: ipNodeId,
        relationship: hop.trustAssessment === 'earliest observed IP' ? 'origin_hop_ip' : 'relayed_by_hop',
        suspicious: isUntrusted
      });

      // ASN Node
      if (hop.asn && hop.asn !== 'AS0' && hop.asn !== 'N/A') {
        const asnId = `asn-${hop.asn}`;
        addNode({
          id: asnId,
          label: `${hop.asn} ${hop.org ? `(${hop.org.slice(0, 20)})` : ''}`,
          type: 'asn',
          risk: 'Low',
          details: {
            asn: hop.asn,
            org: hop.org
          }
        });

        addLink({
          source: ipNodeId,
          target: asnId,
          relationship: 'announced_by_asn'
        });
      }
    }
  });

  // 5. Attachments
  currentCase.attachments.forEach(att => {
    const attId = `att-${att.sha256.slice(0, 10)}`;
    addNode({
      id: attId,
      label: att.filename,
      type: 'attachment',
      risk: att.verdict === 'MALICIOUS' ? 'Critical' : (att.verdict === 'SUSPICIOUS' ? 'High' : 'Low'),
      details: {
        sha256: att.sha256,
        sizeBytes: att.sizeBytes,
        isExecutable: att.isExecutable
      }
    });

    addLink({
      source: emailNodeId,
      target: attId,
      relationship: 'delivers_attachment',
      suspicious: att.verdict !== 'SAFE'
    });
  });

  // 6. Cross-case campaign correlation:
  // Link to other cases that share the same sender domain, URL domain, or attachment hash!
  for (const other of allCases) {
    if (other.id === currentCase.id) continue;

    let sharedReason = '';
    // Check shared sender domain
    if (other.from.domain && other.from.domain === currentCase.from.domain) {
      sharedReason = `Shared domain: ${other.from.domain}`;
    }
    // Check shared URL domains
    const otherUrlDomains = new Set(other.urls.map(u => u.domain));
    for (const u of currentCase.urls) {
      if (otherUrlDomains.has(u.domain)) {
        sharedReason = `Shared target URL domain: ${u.domain}`;
        break;
      }
    }
    // Check shared attachment hash
    const otherShaSet = new Set(other.attachments.map(a => a.sha256));
    for (const a of currentCase.attachments) {
      if (otherShaSet.has(a.sha256)) {
        sharedReason = `Shared attachment payload SHA-256`;
        break;
      }
    }

    if (sharedReason) {
      const otherCaseNodeId = `case-${other.caseId}`;
      addNode({
        id: otherCaseNodeId,
        label: `Case #${other.caseId}: ${other.subject.slice(0, 20)}`,
        type: 'case',
        risk: other.risk.category,
        details: {
          caseId: other.caseId,
          correlationReason: sharedReason
        }
      });

      addLink({
        source: emailNodeId,
        target: otherCaseNodeId,
        relationship: 'campaign_correlated',
        suspicious: true
      });
    }
  }

  return { nodes, links };
}
