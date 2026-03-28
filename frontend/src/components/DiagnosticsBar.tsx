import type { Diagnostics } from "../types";
import { Activity, Database, Layers, Clock } from "lucide-react";

interface Props {
  diagnostics: Diagnostics;
}

export default function DiagnosticsBar({ diagnostics }: Props) {
  const { latency_ms, graph_count, vector_count } = diagnostics;

  const stats = [
    { icon: <Database size={12} />, label: "Graph facts", value: graph_count, color: "text-accent-purple" },
    { icon: <Layers size={12} />,   label: "Snippets",    value: vector_count, color: "text-accent-cyan" },
    { icon: <Activity size={12} />, label: "Graph ms",    value: latency_ms.graph,  color: "text-accent-green" },
    { icon: <Activity size={12} />, label: "Vector ms",   value: latency_ms.vector, color: "text-accent-cyan" },
    { icon: <Clock size={12} />,    label: "LLM ms",      value: latency_ms.llm,    color: "text-accent-amber" },
    { icon: <Clock size={12} />,    label: "Total ms",    value: latency_ms.total,  color: "text-slate-400" },
  ];

  return (
    <div className="flex flex-wrap gap-3 px-4 py-2.5 rounded-lg bg-surface-800/40 border border-white/5 text-xs">
      {stats.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5 text-slate-500">
          <span className={s.color}>{s.icon}</span>
          <span>{s.label}:</span>
          <span className="text-slate-300 font-medium font-mono">{s.value}</span>
        </div>
      ))}
    </div>
  );
}
