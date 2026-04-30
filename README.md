# 🧠 ollama-rag-chat

A fully local RAG (Retrieval-Augmented Generation) chat application — no cloud, no API keys, runs entirely on your machine.

## Stack

| Layer | Tech |
|---|---|
| LLM | [Ollama](https://ollama.com) — `llama3` / `mistral` |
| Embeddings | `nomic-embed-text` via Ollama |
| Vector Store | [ChromaDB](https://www.trychroma.com) |
| Backend | Python + FastAPI |
| Frontend | React + Vite + Tailwind CSS |
| Infra | Docker Compose |

## Features

- 📄 **Multi-format ingestion** — PDF, TXT, DOCX
- 🔍 **HyDE retrieval** — Hypothetical Document Embeddings for better semantic search
- 🧠 **Chain-of-thought** — LLM reasons step-by-step before answering
- 📎 **Source citations** — every answer links back to the source chunk & page
- 🌊 **Streaming responses** — tokens stream to the UI in real-time via SSE
- 🔄 **Model switcher** — swap between llama3, mistral, phi3 in the UI
- 🐳 **One-command run** — `docker compose up --build`

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/chandan1819/ollama-rag-chat.git
cd ollama-rag-chat
docker compose up --build
```

Open **http://localhost:3000** — Ollama will auto-pull `llama3` and `nomic-embed-text` on first run (~5 GB, one-time).

### Local Dev

```bash
# 1. Pull models
ollama pull llama3
ollama pull nomic-embed-text

# 2. Start ChromaDB
docker run -d -p 8001:8000 chromadb/chroma:latest

# 3. Backend
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cat > .env <<EOF
OLLAMA_BASE_URL=http://localhost:11434
CHROMA_HOST=localhost
CHROMA_PORT=8001
UPLOAD_DIR=./uploads
EOF
mkdir -p uploads
uvicorn app.main:app --reload --port 8000

# 4. Frontend (new terminal)
cd frontend
npm install && npm run dev
# → http://localhost:5173
```

## Project Structure

```
ollama-rag-chat/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app
│   │   ├── config.py          # Settings
│   │   ├── models/schemas.py  # Pydantic models
│   │   ├── api/routes/
│   │   │   ├── documents.py   # Upload / list / delete
│   │   │   └── chat.py        # Query + SSE stream
│   │   └── core/
│   │       ├── ingestion.py   # Document loading & chunking
│   │       └── rag_pipeline.py # HyDE + retrieval + CoT generation
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── api/client.js
│       └── components/
│           ├── Sidebar.jsx         # Doc list, model picker, HyDE toggle
│           ├── ChatWindow.jsx      # Streaming chat
│           ├── MessageBubble.jsx   # Markdown + sources + reasoning
│           └── DocumentUpload.jsx  # Drag-drop upload modal
├── docker-compose.yml
├── ollama-entrypoint.sh  # Auto-pulls models on first run
└── .env.example
```

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/documents/upload` | Upload & index a document |
| `GET` | `/api/documents/` | List all documents |
| `DELETE` | `/api/documents/{id}` | Delete a document |
| `POST` | `/api/chat/query` | One-shot RAG query |
| `POST` | `/api/chat/stream` | Streaming RAG query (SSE) |
| `GET` | `/api/health` | Health check |

## Ports

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend + Swagger | http://localhost:8000/docs |
| ChromaDB | http://localhost:8001 |
| Ollama | http://localhost:11434 |
