export interface GraphNode {
  id: string;
  label: string;
  type: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Diagnostics {
  graph_count: number;
  vector_count: number;
  latency_ms: {
    graph: number;
    vector: number;
    llm: number;
    total: number;
  };
  warnings: string[];
}

export interface QueryResponse {
  question: string;
  answer: string;
  graph_facts: string[];
  email_snippets: string[];
  graph: GraphData;
  diagnostics: Diagnostics;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  missing_env: string[];
  model: string;
  pinecone_index: string;
}
