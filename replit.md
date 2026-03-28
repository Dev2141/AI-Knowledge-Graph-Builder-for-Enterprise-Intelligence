# AI-Based Knowledge Graph Builder for Enterprise Intelligence

## Overview
A two-milestone AI pipeline built on the Enron Email Dataset. Features a full-stack web interface powered by the Milestone 3 Hybrid RAG backend.

## Architecture
- **Milestone-2.py**: Knowledge graph builder — reads Email nodes from Neo4j, uses an LLM to extract entities/relationships, writes them back to Neo4j.
- **MIlestone-3.py**: CLI for the Hybrid RAG query pipeline (interactive terminal loop).
- **api.py**: Flask REST API wrapping the Milestone 3 retrieval/generation logic — exposes `/health` and `/query` endpoints on port 8000.
- **frontend/**: React + Vite web app (port 5000) — beautiful dark-theme UI with query input, answer display, evidence panels, and Neo4j graph visualization.

## Tech Stack
- **Language**: Python 3.12 (backend) + Node.js 20 / TypeScript (frontend)
- **Backend Framework**: Flask + flask-cors
- **Knowledge Graph**: Neo4j (AuraDB or local)
- **Vector Store**: Pinecone
- **LLM Orchestration**: LangChain (langchain-groq, langchain-pinecone)
- **Frontend**: React 18 + Vite 5 + Tailwind CSS
- **Graph Visualization**: react-force-graph-2d (D3 force-directed)

## Environment Variables (set in Replit Secrets)
| Variable | Description |
|---|---|
| `LLAMA_API_KEY` | LLM API key for Milestone 2 & 3 |
| `NEO4J_URI` | Neo4j connection URI |
| `NEO4J_USERNAME` | Neo4j username (default: neo4j) |
| `NEO4J_PASSWORD` | Neo4j password |
| `NEO4J_DATABASE` | Database name (default: neo4j) |
| `PINECONE_API_KEY` | Pinecone API key |

## API Endpoints (port 8000)
- `GET /health` — Backend health check, reports missing env vars
- `POST /query` — Main query endpoint. Body: `{"question": "..."}`. Returns: question, answer, graph_facts, email_snippets, graph (nodes+edges), diagnostics

## Workflows
- **Start application**: Runs `bash start.sh` which starts both the Flask API (port 8000) and Vite frontend (port 5000)

## Frontend Features
- Query bar with example questions and keyboard shortcut (Enter to submit)
- Real-time progress indicator during query execution
- Markdown-rendered answers with inline citations
- Evidence panel with tabs for Graph Facts and Email Snippets
- Force-directed network graph visualization from Neo4j data
  - Color-coded nodes by entity type (Person, Organization, Location, etc.)
  - Zoom/pan/fit controls
  - Click nodes to inspect connections
- Diagnostics bar showing retrieval counts and latency per stage
- Warning banners for partial backend failures (graceful degradation)
- Backend health indicator in header

## Running the Pipeline
1. Set all environment variables in Replit Secrets
2. Load email data into Neo4j as Email nodes
3. Run `python Milestone-2.py` to extract entities/relationships
4. Run `python MIlestone-3.py` once with `build_vector_index()` uncommented to index emails in Pinecone
5. Use the web interface (port 5000) for interactive Hybrid RAG queries

## Dependencies
- Python: neo4j, pinecone, langchain-pinecone, langchain-groq, langchain-text-splitters, langchain-core, python-dotenv, requests, pandas, flask, flask-cors
- Node: react, react-dom, react-force-graph-2d, react-markdown, lucide-react, vite, tailwindcss
