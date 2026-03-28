import { useCallback, useEffect, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { GraphData, GraphNode, GraphEdge } from "../types";
import { Network, ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";

interface Props {
  graph: GraphData;
}

const NODE_TYPE_COLORS: Record<string, string> = {
  Person:        "#60a5fa",
  Organization:  "#a78bfa",
  Location:      "#34d399",
  FinancialTerm: "#fbbf24",
  EnergyTerm:    "#f87171",
  Project:       "#38bdf8",
  Regulation:    "#fb923c",
  Event:         "#e879f9",
  entity:        "#94a3b8",
};

const NODE_TYPE_LABEL_COLOR: Record<string, string> = {
  Person:        "#1e3a5f",
  Organization:  "#2d1b69",
  Location:      "#064e3b",
  FinancialTerm: "#78350f",
  EnergyTerm:    "#7f1d1d",
  Project:       "#0c4a6e",
  Regulation:    "#7c2d12",
  Event:         "#701a75",
  entity:        "#1e293b",
};

function nodeColor(type: string): string {
  return NODE_TYPE_COLORS[type] || NODE_TYPE_COLORS.entity;
}

function nodeLabelColor(type: string): string {
  return NODE_TYPE_LABEL_COLOR[type] || NODE_TYPE_LABEL_COLOR.entity;
}

interface FGNode {
  id: string;
  label: string;
  type: string;
  x?: number;
  y?: number;
}
interface FGLink {
  source: string | FGNode;
  target: string | FGNode;
  relation: string;
  weight: number;
}

export default function GraphVisualization({ graph }: Props) {
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 420 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<FGNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<FGNode | null>(null);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        setDimensions({ width: Math.max(300, width), height: Math.max(300, height) });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const fgData = {
    nodes: graph.nodes.map((n) => ({ ...n })) as FGNode[],
    links: graph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      relation: e.relation,
      weight: e.weight,
    })) as FGLink[],
  };

  const isEmpty = graph.nodes.length === 0;

  const handleZoomIn  = () => fgRef.current?.zoom(fgRef.current.zoom() * 1.4, 300);
  const handleZoomOut = () => fgRef.current?.zoom(fgRef.current.zoom() / 1.4, 300);
  const handleFit     = () => fgRef.current?.zoomToFit(400, 40);
  const handleReset   = () => {
    fgRef.current?.zoomToFit(400, 40);
    setSelectedNode(null);
  };

  const drawNode = useCallback((node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const r    = Math.max(6, Math.min(14, 8 + (node as any).val || 8));
    const color = nodeColor(node.type);
    const isHov = hoveredNode?.id === node.id;
    const isSel = selectedNode?.id === node.id;

    ctx.save();
    if (isHov || isSel) {
      ctx.shadowBlur  = 18;
      ctx.shadowColor = color;
    }
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, r + (isSel ? 2 : isHov ? 1 : 0), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (isSel) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }
    ctx.restore();

    const fontSize = Math.max(8, Math.min(12, 10 / Math.max(0.6, globalScale)));
    ctx.font        = `500 ${fontSize}px Inter, system-ui`;
    ctx.textAlign   = "center";
    ctx.textBaseline = "middle";

    const label  = node.label.length > 18 ? node.label.slice(0, 16) + "…" : node.label;
    const tw     = ctx.measureText(label).width;
    const pad    = 3;

    ctx.fillStyle   = nodeLabelColor(node.type) + "cc";
    ctx.beginPath();
    const bx = node.x! - tw / 2 - pad;
    const by = node.y! + r + 3;
    const bw = tw + pad * 2;
    const bh = fontSize + pad * 2;
    ctx.roundRect(bx, by, bw, bh, 3);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.fillText(label, node.x!, node.y! + r + 3 + fontSize / 2 + pad);
  }, [hoveredNode, selectedNode]);

  const drawLink = useCallback((link: FGLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const src = link.source as FGNode;
    const tgt = link.target as FGNode;
    if (!src.x || !src.y || !tgt.x || !tgt.y) return;

    const alpha = Math.min(1, (link.weight || 1) / 5 + 0.3);
    ctx.strokeStyle = `rgba(148,163,184,${alpha * 0.5})`;
    ctx.lineWidth   = Math.min(3, (link.weight || 1) * 0.5 + 0.5);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    ctx.lineTo(tgt.x, tgt.y);
    ctx.stroke();

    if (globalScale > 0.7) {
      const mx     = (src.x + tgt.x) / 2;
      const my     = (src.y + tgt.y) / 2;
      const fs     = Math.max(6, 8 / globalScale);
      const label  = link.relation.replace(/_/g, " ").toLowerCase();
      ctx.font     = `${fs}px Inter, system-ui`;
      ctx.fillStyle = "rgba(148,163,184,0.7)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, mx, my);
    }
  }, []);

  return (
    <div className="glass rounded-xl overflow-hidden h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Network size={14} className="text-accent-purple" />
          <span className="text-sm font-medium text-slate-200">Knowledge Graph</span>
          <span className="badge bg-accent-purple/15 text-accent-purple border border-accent-purple/20">
            {graph.nodes.length} nodes · {graph.edges.length} edges
          </span>
        </div>
        {!isEmpty && (
          <div className="flex items-center gap-1">
            {[
              { icon: <ZoomIn size={13} />,    title: "Zoom in",  fn: handleZoomIn },
              { icon: <ZoomOut size={13} />,   title: "Zoom out", fn: handleZoomOut },
              { icon: <Maximize2 size={13} />, title: "Fit",      fn: handleFit },
              { icon: <RotateCcw size={13} />, title: "Reset",    fn: handleReset },
            ].map((b, i) => (
              <button
                key={i}
                onClick={b.fn}
                title={b.title}
                className="p-1.5 rounded text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors"
              >
                {b.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      {!isEmpty && (
        <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-white/5 bg-surface-900/30">
          {Object.entries(NODE_TYPE_COLORS)
            .filter(([t]) => t !== "entity" && graph.nodes.some((n) => n.type === t))
            .map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                {type}
              </div>
            ))}
          {graph.nodes.some((n) => n.type === "entity") && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              Unknown
            </div>
          )}
        </div>
      )}

      {/* Graph canvas */}
      <div ref={containerRef} className="flex-1 min-h-0 relative">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
            <Network size={40} className="opacity-30" />
            <p className="text-sm">No graph data for this query</p>
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            graphData={fgData}
            width={dimensions.width}
            height={dimensions.height - 0}
            backgroundColor="transparent"
            nodeCanvasObject={drawNode as any}
            nodeCanvasObjectMode={() => "replace"}
            linkCanvasObject={drawLink as any}
            linkCanvasObjectMode={() => "replace"}
            onNodeHover={(node) => setHoveredNode(node as FGNode | null)}
            onNodeClick={(node) => setSelectedNode((prev) => (prev?.id === (node as FGNode).id ? null : node as FGNode))}
            nodeRelSize={6}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            linkDirectionalArrowColor={() => "rgba(148,163,184,0.4)"}
            cooldownTicks={120}
            onEngineStop={() => fgRef.current?.zoomToFit(400, 40)}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
          />
        )}

        {/* Hover tooltip */}
        {hoveredNode && !selectedNode && (
          <div className="absolute bottom-4 left-4 glass rounded-lg px-3 py-2 pointer-events-none">
            <div className="text-xs text-slate-400 mb-0.5">Entity</div>
            <div className="text-sm font-medium text-slate-100">{hoveredNode.label}</div>
            {hoveredNode.type !== "entity" && (
              <div className="text-xs mt-0.5" style={{ color: nodeColor(hoveredNode.type) }}>
                {hoveredNode.type}
              </div>
            )}
          </div>
        )}

        {/* Selected node detail */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 glass rounded-lg px-3 py-2 pointer-events-none">
            <div className="text-xs text-slate-400 mb-0.5">Selected</div>
            <div className="text-sm font-medium text-slate-100">{selectedNode.label}</div>
            {selectedNode.type !== "entity" && (
              <div className="text-xs mt-0.5" style={{ color: nodeColor(selectedNode.type) }}>
                {selectedNode.type}
              </div>
            )}
            <div className="text-xs text-slate-500 mt-1">
              Connected to{" "}
              {fgData.links.filter(
                (l) =>
                  (typeof l.source === "object" ? l.source.id : l.source) === selectedNode.id ||
                  (typeof l.target === "object" ? l.target.id : l.target) === selectedNode.id
              ).length}{" "}
              node(s)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
