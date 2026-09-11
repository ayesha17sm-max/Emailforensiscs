import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode, GraphLink } from '../types.js';
import { Network, ZoomIn, ZoomOut, RotateCcw, Info, ExternalLink } from 'lucide-react';

interface GraphViewProps {
  caseId: string;
}

export const GraphView: React.FC<GraphViewProps> = ({ caseId }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/cases/${caseId}/graph`)
      .then(res => res.json())
      .then((data: GraphData) => {
        setGraphData(data);
        if (data.nodes.length > 0) {
          setSelectedNode(data.nodes[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load graph data:', err);
        setLoading(false);
      });
  }, [caseId]);

  useEffect(() => {
    if (!graphData || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = 500;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('viewBox', [0, 0, width, height]);

    // Zoom behavior
    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Deep clone data for D3 mutation
    const nodes: any[] = graphData.nodes.map(d => ({ ...d }));
    const links: any[] = graphData.links.map(d => ({ ...d }));

    // Force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(90))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(35));

    // Arrow markers for links
    svg.append('defs').selectAll('marker')
      .data(['arrow'])
      .enter().append('marker')
      .attr('id', String)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#64748b');

    // Draw Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', (d: any) => d.suspicious ? '#f43f5e' : '#475569')
      .attr('stroke-width', (d: any) => d.suspicious ? 2 : 1.2)
      .attr('stroke-dasharray', (d: any) => d.suspicious ? '4 2' : 'none')
      .attr('marker-end', 'url(#arrow)');

    // Link Labels
    const linkText = g.append('g')
      .selectAll('text')
      .data(links)
      .enter().append('text')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('fill', '#94a3b8')
      .attr('text-anchor', 'middle')
      .text((d: any) => d.relationship || '');

    // Draw Nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .call(d3.drag<SVGGElement, any>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      )
      .on('click', (event, d) => {
        setSelectedNode(d);
      });

    // Node circles
    node.append('circle')
      .attr('r', (d: any) => d.type === 'email' ? 18 : (d.type === 'case' ? 15 : 12))
      .attr('fill', (d: any) => {
        if (d.type === 'email') return '#10b981';
        if (d.risk === 'Critical') return '#f43f5e';
        if (d.risk === 'High') return '#f59e0b';
        if (d.type === 'domain') return '#8b5cf6';
        if (d.type === 'ip') return '#0284c7';
        if (d.type === 'url') return '#ec4899';
        if (d.type === 'asn') return '#06b6d4';
        if (d.type === 'attachment') return '#e11d48';
        if (d.type === 'case') return '#eab308';
        return '#64748b';
      })
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2.5)
      .attr('class', 'cursor-pointer hover:opacity-80 transition');

    // Node text labels
    node.append('text')
      .attr('dx', 16)
      .attr('dy', 4)
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('fill', '#f1f5f9')
      .text((d: any) => d.label);

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkText
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2 - 3);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData]);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center bg-slate-950/80 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3 text-emerald-400 font-mono text-xs">
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Synthesizing entity correlation topology...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Network className="w-4 h-4 text-emerald-400" />
              <span>Entity Relationship &amp; Campaign Correlation Graph</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Maps multi-entity relationships between Email &harr; Domain &harr; URL &harr; IP &harr; ASN &harr; Correlated Cases.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            <span>Scroll to Zoom &bull; Drag to Reorganize</span>
          </div>
        </div>

        {/* Forensic Disclaimer */}
        <div className="mb-3 p-2.5 rounded bg-slate-950/80 border border-slate-800 text-slate-400 text-[11px] flex items-start gap-2">
          <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <span>
            <strong>Forensic Correlation Notice:</strong> This graph represents observed technical relationships between registered domains, network infrastructure, and extracted campaign artifacts. It assists in campaign tracking and pivot investigation; it does NOT establish definitive legal attribution of a human actor.
          </span>
        </div>

        {/* Graph canvas + Sidebar inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" ref={containerRef}>
          <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden relative">
            <svg ref={svgRef} className="w-full h-[480px] cursor-grab active:cursor-grabbing"></svg>
            {/* Legend */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 rounded-md p-2 text-[10px] font-mono text-slate-300 flex flex-wrap gap-x-3 gap-y-1 backdrop-blur-xs">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Current Email</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>Domain</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>URL</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>Relay IP</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>ASN / Org</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>Attachment</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>Correlated Case</span>
            </div>
          </div>

          {/* Node Inspector */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
            {selectedNode ? (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Selected Entity</span>
                <h4 className="text-sm font-semibold text-slate-100 break-all mt-1">{selectedNode.label}</h4>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 uppercase">
                    {selectedNode.type}
                  </span>
                  {selectedNode.risk && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      selectedNode.risk === 'Critical' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                      selectedNode.risk === 'High' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {selectedNode.risk} Risk
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                  <span className="text-[11px] font-mono text-slate-400">Entity Attributes:</span>
                  {selectedNode.details && Object.entries(selectedNode.details).map(([key, val]) => (
                    <div key={key} className="text-xs">
                      <span className="text-slate-500 font-mono text-[10px] uppercase block">{key}</span>
                      <span className="text-slate-200 font-mono break-all">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Click on any node in the canvas to inspect forensic properties.</p>
            )}

            <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-500">
              Correlated across {graphData?.nodes.filter(n => n.type === 'case').length || 0} external incident campaigns.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
