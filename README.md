# TrendTune

TrendTune is an AI-powered trend analysis and product intelligence platform. This monorepo contains the React frontend and the FastAPI backend used for agentic chat, trend analysis, and demographic inference.

## Repository structure

```
trendtunefinal/
├── frontend/          # React + Vite + Firebase (UI)
│   ├── functions/     # Firebase Cloud Functions
│   └── src/           # Application source
└── backend/           # FastAPI agentic chat API
    ├── main.py
    ├── module1.py … module5.py
    └── requirements.txt
```

## Prerequisites

- **Node.js** 18+ (frontend)
- **Python** 3.11+ (backend)
- **Firebase** project with Firestore and Auth enabled
- **OpenAI** API key

## Frontend setup

```bash
cd frontend
cp .env.example .env   # fill in your Firebase and OpenAI keys
npm install
npm run dev
```

The app runs at [http://localhost:5173](http://localhost:5173).

See [frontend/AI_SETUP.md](frontend/AI_SETUP.md) for details on the AI-powered CSV column mapping feature.

### Firebase Cloud Functions (optional)

```bash
cd frontend/functions
npm install
npm run serve
```

## Backend setup

The backend provides the agentic chat API (`/ask_ai`, `/generate_summary`, `/demographic-inference`, etc.) consumed by the frontend.

```bash
cd backend
cp .env.example .env   # fill in OpenAI, xAI, and Firebase credentials
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Or with Docker:

```bash
cd backend
docker compose up --build
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

## Running locally (full stack)

1. Start the backend on port **8000**
2. Start the frontend on port **5173**
3. Ensure your `.env` in `frontend/` has valid Firebase credentials

Some frontend endpoints point to the deployed Cloud Run URL by default. For local development, update API URLs in `frontend/src/pages/Chat/ChatPage.tsx` and `frontend/src/apis/demographicInference.ts` to `http://localhost:8000`.

## Deployment

- **Frontend**: Firebase Hosting / Vercel (see `frontend/firebase.json`, `frontend/vercel.json`)
- **Backend**: Docker / Google Cloud Run (see `backend/Dockerfile`)
- **CI**: GitHub Actions in `frontend/.github/workflows/`

## Tech stack

| Layer    | Technologies                                      |
|----------|---------------------------------------------------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, Firebase |
| Backend  | FastAPI, LangChain, OpenAI, Firebase Admin, FAISS |
| Data     | Firestore, Cloud Functions                        |
