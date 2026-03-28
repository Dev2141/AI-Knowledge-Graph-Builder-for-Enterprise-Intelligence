import os
import re
import time
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(override=True)

# ── Credentials ────────────────────────────────────────────────────────────────
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
LLAMA_API_KEY    = os.getenv("LLAMA_API_KEY")
NEO4J_URI        = os.getenv("NEO4J_URI",      "neo4j+s://your-instance.databases.neo4j.io")
NEO4J_USER       = os.getenv("NEO4J_USERNAME", os.getenv("NEO4J_USER", "neo4j"))
NEO4J_PASSWORD   = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE   = os.getenv("NEO4J_DATABASE", "neo4j")

# ── Model / Index settings ─────────────────────────────────────────────────────
PINECONE_INDEX = "email-knowledge-graph"
EMBED_MODEL    = "multilingual-e5-large"
EMBED_DIM      = 1024
OPENROUTER_URL = "https://ollama.com/v1/chat/completions"
MODEL_NAME     = "gpt-oss:120b-cloud"

# ── Retrieval settings ─────────────────────────────────────────────────────────
VECTOR_TOP_K      = 5
GRAPH_FACTS_LIMIT = 5

# ── Lazy imports (only load heavy deps when actually querying) ─────────────────
_vectorstore = None
_neo4j_driver = None

def get_vectorstore():
    global _vectorstore
    if _vectorstore is None:
        from pinecone import Pinecone
        from langchain_pinecone import PineconeVectorStore, PineconeEmbeddings
        _vectorstore = PineconeVectorStore(
            index_name=PINECONE_INDEX,
            embedding=PineconeEmbeddings(model=EMBED_MODEL),
        )
    return _vectorstore

def get_neo4j_driver():
    global _neo4j_driver
    if _neo4j_driver is None:
        from neo4j import GraphDatabase
        _neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    return _neo4j_driver

# ── Stop-words for keyword extraction (identical to Milestone 3) ───────────────
GRAPH_STOPWORDS = {
    "what", "which", "where", "when", "who", "whom", "whose",
    "have", "does", "their", "about", "with", "from", "that",
    "this", "were", "been", "being", "most", "more", "many",
    "some", "ever", "mention", "mentioned", "sent", "received",
    "email", "emails", "communicated", "said", "saying", "related",
    "during", "tone", "context", "anywhere", "then", "know",
    "before", "raise", "raised", "internal", "both", "also",
    "there", "those", "these", "they", "them", "than", "only",
    "just", "into", "onto", "over", "under", "after", "between",
}

def extract_keywords(query: str) -> list:
    words = re.sub(r"[^a-zA-Z0-9\s]", " ", query).split()
    return list(dict.fromkeys(w.strip() for w in words
                              if len(w) > 3 and w.lower() not in GRAPH_STOPWORDS))

# ── Retrieval (identical logic to Milestone 3) ─────────────────────────────────
def retrieve_vector(query: str, top_k: int = VECTOR_TOP_K):
    """Returns (snippets_list, warning_or_None)."""
    try:
        vs = get_vectorstore()
        return [doc.page_content for doc in vs.similarity_search(query, k=top_k)], None
    except Exception as e:
        return [], str(e)

def retrieve_graph(query: str):
    """Returns (facts_list, warning_or_None)."""
    keywords = extract_keywords(query)
    facts    = set()
    try:
        driver = get_neo4j_driver()
        with driver.session(database=NEO4J_DATABASE) as session:
            for kw in keywords:
                for row in session.run("""
                    MATCH (n:Entity) WHERE toLower(n.name) CONTAINS toLower($kw)
                    MATCH (n)-[r]->(t:Entity) WHERE type(r) <> 'MENTIONS'
                    RETURN n.name AS src, type(r) AS rel, t.name AS tgt LIMIT $limit
                """, kw=kw, limit=GRAPH_FACTS_LIMIT):
                    facts.add(f"{row['src']} [{row['rel']}] {row['tgt']}")

                for row in session.run("""
                    MATCH (n:Entity) WHERE toLower(n.name) CONTAINS toLower($kw)
                    MATCH (src:Entity)-[r]->(n) WHERE type(r) <> 'MENTIONS'
                    RETURN src.name AS src, type(r) AS rel, n.name AS tgt LIMIT $limit
                """, kw=kw, limit=GRAPH_FACTS_LIMIT):
                    facts.add(f"{row['src']} [{row['rel']}] {row['tgt']}")

                for row in session.run("""
                    MATCH (e:Employee) WHERE toLower(e.name) CONTAINS toLower($kw) OR toLower(e.email) CONTAINS toLower($kw)
                    MATCH (e)-[r:COMMUNICATES_WITH]->(other:Employee)
                    RETURN e.name AS src, type(r) AS rel, other.name AS tgt, r.frequency AS freq
                    ORDER BY r.frequency DESC LIMIT $limit
                """, kw=kw, limit=GRAPH_FACTS_LIMIT):
                    facts.add(f"{row['src']} [{row['rel']} x{row['freq']}] {row['tgt']}")

                for row in session.run("""
                    MATCH (emp:Employee)-[:SENT]->(e:Email)-[:HAS_ENTITY]->(en:Entity)
                    WHERE toLower(en.name) CONTAINS toLower($kw)
                    RETURN DISTINCT emp.name AS sender, en.name AS entity LIMIT $limit
                """, kw=kw, limit=GRAPH_FACTS_LIMIT):
                    facts.add(f"{row['sender']} [MENTIONED] {row['entity']}")

                for row in session.run("""
                    MATCH (emp:Employee)-[:RECEIVED]->(e:Email)-[:HAS_ENTITY]->(en:Entity)
                    WHERE toLower(en.name) CONTAINS toLower($kw)
                    RETURN DISTINCT emp.name AS sender, en.name AS entity LIMIT $limit
                """, kw=kw, limit=GRAPH_FACTS_LIMIT):
                    facts.add(f"{row['sender']} [RECEIVED_EMAIL_ABOUT] {row['entity']}")

                for row in session.run("""
                    MATCH (emp:Employee)-[:SENT]->(e:Email)-[:HAS_ENTITY]->(en:Entity)
                    WHERE toLower(en.name) CONTAINS toLower($kw)
                    RETURN emp.name AS sender, en.name AS entity, count(e) AS email_count
                    ORDER BY email_count DESC LIMIT $limit
                """, kw=kw, limit=GRAPH_FACTS_LIMIT):
                    facts.add(f"{row['sender']} [SENT_MOST_EMAILS_ABOUT] {row['entity']} (count: {row['email_count']})")

        return list(facts), None
    except Exception as e:
        return [], str(e)

def fetch_entity_types(names: list) -> dict:
    """Optional enrichment: fetch entity_type from Neo4j for known entity names."""
    if not names:
        return {}
    try:
        driver = get_neo4j_driver()
        with driver.session(database=NEO4J_DATABASE) as session:
            result = session.run(
                "UNWIND $names AS n MATCH (e:Entity {name: n}) RETURN e.name AS name, e.entity_type AS type",
                names=names,
            )
            return {row["name"]: row["type"] for row in result if row["type"]}
    except Exception:
        return {}

# ── Parse graph facts → nodes + edges ─────────────────────────────────────────
FACT_PATTERN = re.compile(r"^(.+?)\s+\[(.+?)\]\s+(.+?)(?:\s+\(.*\))?$")

def parse_facts_to_graph(facts: list, type_map: dict) -> dict:
    nodes = {}
    edges = []
    for fact in facts:
        m = FACT_PATTERN.match(fact.strip())
        if not m:
            continue
        src = m.group(1).strip()
        rel = m.group(2).strip()
        tgt = m.group(3).strip()

        # Extract optional weight (e.g. "COMMUNICATES_WITH x5")
        weight = 1
        wm = re.search(r"x(\d+)", rel)
        if wm:
            weight = int(wm.group(1))
            rel = re.sub(r"\s*x\d+", "", rel).strip()

        if src not in nodes:
            nodes[src] = {"id": src, "label": src, "type": type_map.get(src, "entity")}
        if tgt not in nodes:
            nodes[tgt] = {"id": tgt, "label": tgt, "type": type_map.get(tgt, "entity")}

        edges.append({"source": src, "target": tgt, "relation": rel, "weight": weight})

    return {"nodes": list(nodes.values()), "edges": edges}

# ── Generation (identical to Milestone 3) ─────────────────────────────────────
SYSTEM_PROMPT = """You are an Enterprise Intelligence Assistant specializing in the Enron email dataset.
You think and communicate like a senior analyst — structured, precise, and insightful, in the style of Claude or Gemini.
Your ONLY source of truth is the context provided below. You never go beyond it.

━━━ EVIDENCE SOURCES ━━━
You are given two types of context:
[GRAPH FACTS]    — Structured, verified knowledge-graph triples extracted from Neo4j. Treat as confirmed facts.
[EMAIL SNIPPETS] — Semantic excerpts from real Enron emails retrieved from Pinecone. Treat as direct evidence.

━━━ STRICT GROUNDING RULES (NON-NEGOTIABLE) ━━━
1. Answer using ONLY the information in the provided context. Your training data does not exist for this task.
2. Cite every claim inline with its source:
    — End the sentence with (graph fact)             if it came from GRAPH FACTS.
    — End the sentence with (from email)             if it came from EMAIL SNIPPETS.
    — End the sentence with (graph fact, from email) if supported by both.
3. If context is insufficient, respond with exactly:
    "The provided context does not contain enough information to answer this question."
Then add one sentence specifying what data would be needed to answer it.
4. Never speculate, infer beyond what is stated, or fill gaps with general knowledge.

━━━ RESPONSE STYLE ━━━
Write like a senior analyst briefing an executive — the way Claude or Gemini would respond:

• Opening: 1–2 sentences that directly answer the core question.
• Body: Use **bold** for names, organizations, counts, and key terms.
        Use bullet points for lists of people, entities, or findings.
        Use numbered lists for rankings or sequential facts.
        Group related facts under a short plain-text label like "Key People:" or "Context:".
• If graph facts and email evidence both contribute, present them in clearly separated sections.
• If counts or rankings are available from graph facts, lead with those numbers prominently.
• Closing: End with a 1-sentence "Summary:" that synthesizes the key takeaway.
• Tone: Professional, neutral, and concise. Never begin with filler like "Sure!", "Certainly!", or "Great question!"
"""

HUMAN_TEMPLATE = """Context:
{context}

Question: {question}

Answer (grounded strictly in the context above):"""


def generate_answer(question: str, graph_section: str, vector_section: str) -> str:
    import requests as req
    context = (
        f"=== GRAPH FACTS (structured, from knowledge graph) ===\n{graph_section}\n\n"
        f"=== EMAIL SNIPPETS (semantic, from Pinecone) ===\n{vector_section}"
    )
    headers = {"Authorization": f"Bearer {LLAMA_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": HUMAN_TEMPLATE.format(context=context, question=question)},
        ],
        "temperature": 0,
    }
    response = req.post(OPENROUTER_URL, headers=headers, json=payload, timeout=120)
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


# ── Flask app ──────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

@app.route("/api/health", methods=["GET"])
def health():
    missing = [k for k, v in {
        "PINECONE_API_KEY": PINECONE_API_KEY,
        "LLAMA_API_KEY":    LLAMA_API_KEY,
        "NEO4J_PASSWORD":   NEO4J_PASSWORD,
    }.items() if not v]
    return jsonify({
        "status": "ok" if not missing else "degraded",
        "missing_env": missing,
        "model": MODEL_NAME,
        "pinecone_index": PINECONE_INDEX,
    })

@app.route("/api/query", methods=["POST"])
def query():
    data     = request.get_json(force=True) or {}
    question = (data.get("question") or "").strip()
    if not question:
        return jsonify({"error": "question is required"}), 400

    warnings = []
    t_start  = time.time()

    # ── Graph retrieval ────────────────────────────────────────────────────────
    t0 = time.time()
    graph_facts, graph_warn = retrieve_graph(question)
    t_graph = round((time.time() - t0) * 1000)
    if graph_warn:
        warnings.append(f"Graph retrieval partial failure: {graph_warn}")

    # ── Vector retrieval ───────────────────────────────────────────────────────
    t0 = time.time()
    email_snippets, vec_warn = retrieve_vector(question)
    t_vector = round((time.time() - t0) * 1000)
    if vec_warn:
        warnings.append(f"Vector retrieval partial failure: {vec_warn}")

    # Build context sections
    graph_section  = "\n".join(f"- {f}" for f in graph_facts)  or "(none found)"
    vector_section = "\n".join(f"- {c}" for c in email_snippets) or "(none found)"

    # ── LLM generation ─────────────────────────────────────────────────────────
    t0     = time.time()
    answer = ""
    llm_warn = None
    try:
        answer = generate_answer(question, graph_section, vector_section)
    except Exception as e:
        llm_warn = str(e)
        answer   = "Answer generation failed. Please check API configuration."
        warnings.append(f"LLM generation failed: {llm_warn}")
    t_llm = round((time.time() - t0) * 1000)

    # ── Build graph object ─────────────────────────────────────────────────────
    all_node_ids = set()
    for fact in graph_facts:
        m = FACT_PATTERN.match(fact.strip())
        if m:
            all_node_ids.add(m.group(1).strip())
            all_node_ids.add(m.group(3).strip())
    type_map = fetch_entity_types(list(all_node_ids))
    graph    = parse_facts_to_graph(graph_facts, type_map)

    return jsonify({
        "question":      question,
        "answer":        answer,
        "graph_facts":   graph_facts,
        "email_snippets": email_snippets,
        "graph":         graph,
        "diagnostics": {
            "graph_count":  len(graph_facts),
            "vector_count": len(email_snippets),
            "latency_ms": {
                "graph":  t_graph,
                "vector": t_vector,
                "llm":    t_llm,
                "total":  round((time.time() - t_start) * 1000),
            },
            "warnings": warnings,
        },
    })


# ── Static frontend serving (production) ──────────────────────────────────────
STATIC_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_static(path):
    if path and os.path.exists(os.path.join(STATIC_DIR, path)):
        return send_from_directory(STATIC_DIR, path)
    return send_from_directory(STATIC_DIR, "index.html")


if __name__ == "__main__":
    app.run(host="localhost", port=8000, debug=False)
