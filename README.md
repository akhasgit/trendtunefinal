# TrendTune

TrendTune is an AI-powered trend analysis and product intelligence platform for retail and e-commerce teams. Upload a product catalog, ask questions in plain English, and get synthesized insights that connect **market trends** with **your actual inventory** — no login required (Firebase Anonymous Auth).

## What this project demonstrates

This repo is a **full-stack reference implementation** of an agentic AI product for retail intelligence. It shows how to go beyond a single chatbot prompt and build a system that:

- Ingests messy real-world data (CSV product catalogs with arbitrary column names)
- Maintains multi-turn conversation context across sessions
- Routes user questions to the right AI capability automatically
- Combines **live trend research** with **private product data** in one answer
- Returns business-ready output (markdown, tables, charts, downloadable reports)
- Runs as a deployable production stack (React frontend on Vercel, FastAPI backend on Modal)

**Demo scenario:** A brand uploads their SKU list, then asks *"What trends are relevant to my products?"* or *"Which items should I prioritize this season?"* The system pulls their catalog from Firestore, queries trend intelligence via Grok, searches products via embeddings and pandas agents, and synthesizes a single actionable response.

## AI skills showcased

| Skill | Where it appears | What it does |
|-------|----------------|--------------|
| **Multi-agent orchestration** | `backend/main.py` → `orchestrate_with_llm` | An LLM planner decides whether to call the trend agent, SKU agent, or both — and in what order |
| **Query classification & decomposition** | `module1.py` | Classifies prompts as product-related, trend-related, or both; splits them into focused sub-queries |
| **Conversational context condensation** | `_condense_query` | Rewrites follow-up messages into self-contained queries using chat history |
| **Hybrid RAG pipeline** | `run_query_pipeline` | Decomposes SKU questions into **vector** (semantic) and **table** (structured) sub-queries, runs each, chains results |
| **Vector search / embeddings** | FAISS + OpenAI embeddings | Semantic product matching against the user's catalog |
| **LangChain Pandas agent** | `module2.py`, `run_query_pipeline` | Natural language → SQL-like operations on product/review DataFrames |
| **Multi-LLM routing** | OpenAI GPT-4o + xAI Grok-3 | OpenAI for reasoning, agents, and synthesis; Grok for live trend research with search |
| **Structured LLM output** | Query planners, trend extraction | Prompts return parseable JSON for reliable downstream routing |
| **Insight synthesis** | `insight_synthesizer`, `module4.py` | Merges trend + product outputs into one coherent business narrative |
| **Rich response formatting** | Chat UI + synthesizer | Embeds `\t...\tx` tables and `\c...\cx` charts inside markdown responses |
| **Client-side schema mapping** | `csvUpload.tsx` | OpenAI auto-maps arbitrary CSV columns to product fields on upload |
| **Conversation summarization** | `/generate_summary` | Turns a full chat into a structured bullet-point report |
| **Trend extraction from chat** | `/analyse_trends` | LLM reads conversation history and extracts fashion/consumer trends to store in Firestore |
| **Context-aware fallbacks** | `module5.py` | Handles general/onboarding questions when the query isn't product or trend related |

### Architecture at a glance

```
User question
    │
    ▼
Condense with chat history (OpenAI)
    │
    ▼
Orchestrator (OpenAI) ──► trend agent (Grok)     ──► live trend JSON
                      └──► SKU agent (OpenAI)     ──► FAISS vector search
                                                   └──► Pandas DataFrame agent
    │
    ▼
Insight synthesizer (OpenAI) ──► markdown + tables + charts
```

## Live demo

| Service | URL |
|---------|-----|
| **App (Vercel)** | [https://www.trendtune.ai](https://www.trendtune.ai) |
| **API (Modal)** | [https://akshikrish--trendtune-api-fastapi-app.modal.run/docs](https://akshikrish--trendtune-api-fastapi-app.modal.run/docs) |

The Vercel frontend is configured to call the Modal backend via `VITE_API_BASE_URL`.

---

## Repository structure

```
trendtune/
├── frontend/          # React + Vite + Firebase (UI)
│   ├── src/
│   ├── vercel.json
│   └── .env.example
└── backend/           # FastAPI agentic chat API
    ├── main.py
    ├── modal_app.py   # Modal deployment entrypoint
    ├── module1.py … module5.py
    └── .env.example
```

---

## Prerequisites

You bring your own keys and accounts:

| Requirement | Used for |
|-------------|----------|
| [Firebase](https://console.firebase.google.com/) project | Auth (Anonymous), Firestore, Hosting (optional) |
| [OpenAI](https://platform.openai.com/api-keys) API key | Chat agents, CSV mapping, embeddings |
| [xAI](https://console.x.ai/) API key | Grok trend intelligence |
| [Modal](https://modal.com/) account | Backend hosting (recommended) |
| [Vercel](https://vercel.com/) account | Frontend hosting (recommended) |
| Node.js 18+ | Frontend |
| Python 3.11+ | Backend local dev |

---

## Quick start (local)

### 1. Clone the repo

```bash
git clone https://github.com/akhasgit/trendtunefinal.git
cd trendtunefinal
```

### 2. Firebase setup

1. Create a Firebase project (or use an existing one).
2. Enable **Firestore** and **Authentication → Anonymous** sign-in.
3. Download a **service account JSON** (Project Settings → Service Accounts → Generate new private key).
4. Copy your web app config from Project Settings → Your apps.

### 3. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set OPENAI_API_KEY and XAI_API_KEY
# Place service account file as serviceAccountKey.json

python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. Frontend

```bash
cd frontend
cp .env.example .env
# Fill in all VITE_FIREBASE_* values from Firebase Console
# Set VITE_OPENAI_API_KEY and VITE_API_BASE_URL=http://localhost:8000

npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)

---

## Environment variables

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Analytics ID (optional) |
| `VITE_OPENAI_API_KEY` | OpenAI key for client-side CSV mapping |
| `VITE_API_BASE_URL` | Backend URL (no trailing slash) |

### Backend (`backend/.env` or Modal secret)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI key for LangChain agents |
| `XAI_API_KEY` | xAI key for trend queries |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON (local dev) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Inline JSON string (Modal / cloud) |

---

## Deploy backend to Modal

Modal hosts the FastAPI backend as a serverless ASGI app.

### 1. Install Modal CLI

```bash
pip install modal
modal setup
```

### 2. Create a Modal secret

Replace values with your own keys. For Firebase on Modal, pass the **entire service account JSON as a string**:

```bash
cd backend

modal secret create trendtune-secrets \
  OPENAI_API_KEY="sk-..." \
  XAI_API_KEY="xai-..." \
  FIREBASE_SERVICE_ACCOUNT_JSON="$(cat serviceAccountKey.json)"
```

To update an existing secret, add `--force`:

```bash
modal secret create trendtune-secrets --force \
  OPENAI_API_KEY="sk-..." \
  XAI_API_KEY="xai-..." \
  FIREBASE_SERVICE_ACCOUNT_JSON="$(cat serviceAccountKey.json)"
```

### 3. Deploy

```bash
cd backend
modal deploy modal_app.py
```

Modal prints your API URL, e.g.:

```
https://YOUR-WORKSPACE--trendtune-api-fastapi-app.modal.run
```

Verify: open `https://YOUR-WORKSPACE--trendtune-api-fastapi-app.modal.run/docs`

---

## Deploy frontend to Vercel

### Option A: Vercel Dashboard

1. Import this repo on [vercel.com](https://vercel.com/new).
2. Set **Root Directory** to `frontend`.
3. Framework preset: **Other** (Vite — not Next.js).
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Add all `VITE_*` environment variables (see table above).
7. Set `VITE_API_BASE_URL` to your Modal API URL.
8. Deploy.

### Option B: Vercel CLI

```bash
cd frontend
npm install -g vercel   # or use npx vercel

# Set env vars (repeat for each variable)
vercel env add VITE_FIREBASE_API_KEY production
vercel env add VITE_API_BASE_URL production
# ... etc.

vercel --prod
```

The included `vercel.json` configures Vite output and SPA rewrites.

---

## How it works

1. **No login** — the app signs users in anonymously via Firebase Auth on first visit.
2. **Products** — upload a CSV; OpenAI maps columns automatically.
3. **Chat** — ask about trends, SKUs, or market fit; the backend orchestrates OpenAI + xAI agents.
4. **Data** — Firestore stores chats, products, trends, and reports per anonymous user.

### API endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ask_ai` | POST | Main chat (form: `userid`, `chatId`, `prompt`) |
| `/generate_summary` | POST | Summarize a chat session |
| `/analyse_trends` | POST | Extract trends from chat history |
| `/aks_ai` | POST | Legacy chat pipeline |

---

## Docker (backend alternative)

```bash
cd backend
docker compose up --build
```

Set env vars in `backend/.env` before running.

---

## Tech stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, Firebase |
| Backend | FastAPI, LangChain, OpenAI, xAI (Grok), Firebase Admin, FAISS |
| Hosting | Vercel (frontend), Modal (backend) |
| Data | Firestore |

---

## Security notes

- Never commit `.env`, `serviceAccountKey.json`, or API keys.
- These files are listed in `.gitignore`.
- For production, restrict Firestore rules to authenticated users.
- Rotate any keys that were accidentally exposed.

---

## License

MIT (or your chosen license — update as needed)
