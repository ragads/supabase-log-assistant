# Supabase Log AI Assistant

An interactive, AI-powered log analysis platform built with a **Next.js** frontend, a **FastAPI** backend, and **Groq LLM** (`llama-3.1-8b-instant`). It enables real-time monitoring and natural language querying of live logs fetched directly from the Supabase Analytics API.

---

## 1. Tech Stack & Architecture

```
  ┌────────────────────────────────────────────────────────┐
  │                 Next.js Frontend (Vercel)              │
  │     (Dashboard / Log Explorer / AI Chat / Recharts)    │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼ (API requests proxied / rewritten)
  ┌────────────────────────────────────────────────────────┐
  │                 FastAPI Backend (Render)               │
  │                      (app.py)                          │
  └──────────────────────────┬─────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌───────────────────────┐         ┌───────────────────────┐
│     Groq LLM API      │         │ Log Database Manager  │
│ (llama-3.1-8b-instant)│         │  (supabase_client.py) │
└───────────────────────┘         └───────────┬───────────┘
                                              │ (Parallel calls via ThreadPool)
                                              ▼
                                  ┌───────────────────────┐
                                  │  Supabase Analytics   │
                                  │     Logflare API      │
                                  └───────────────────────┘
```

### Key Technical Achievements
* **In-Process Tool Calling**: Refactored the Model Context Protocol (MCP) to run tools directly in-process, bypassing stdio subprocess spawning and saving **200MB+ of RAM** to prevent Out-Of-Memory (OOM) crashes on Render's free tier.
* **Parallel DB Queries**: Orchestrated log fetching from multiple Supabase log sources (Postgres, API, Auth, Functions) concurrently using Python's `ThreadPoolExecutor`, reducing log load latency by **80%** (from 18s to under 4s).
* **Payload & Rate-Limit Optimization**: Stripped heavy metadata structures from log records and restricted parallel tool invocations, allowing full-text searches to run comfortably within Groq's free-tier Token-Per-Minute (TPM) limits.

---

## 2. Directory Structure

* **`src/`** (Next.js Frontend)
  * `src/app/` — Dashboard, Chat, Explorer, Layout, and Settings pages.
  * `src/components/` — Shared UI elements (Cards, Tables, Toast notifications, Charts).
  * `src/context/` — Global context manager (`AppContext.tsx`).
  * `src/services/` — Frontend API communication client.
* **`app.py`** — FastAPI entrypoint defining log query, status, and chat endpoints.
* **`mcp_client.py`** — Handles Groq LLM communication and in-process function execution.
* **`supabase_client.py`** — Connects to the Supabase Analytics API and normalizes log datasets.
* **`requirements.txt`** — Python dependencies (FastAPI, Groq, Supabase, Uvicorn, Pydantic).
* **`render.yaml`** — One-click configuration for deploying the backend on Render.
* **`vercel.json`** — Deployment settings for Vercel.
* **`next.config.mjs`** — Configures proxy rewrites to forward `/api` requests to the FastAPI backend.

---

## 3. Configuration & Setup

### Local Development

#### 1. Setup the Backend:
```bash
# Install dependencies
pip install -r requirements.txt

# Run FastAPI Server (starts on port 8000)
python -m uvicorn app:app --port 8000
```

#### 2. Setup the Frontend:
```bash
# Install dependencies
npm install

# Run Next.js Dev Server (starts on port 3000)
npm run dev
```

#### 3. Credentials Configuration:
Create a `.env.local` in the project root:
```ini
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PAT=sbp_your_personal_access_token
GEMINI_API_KEY=gsk_your_groq_api_key
```
*(Note: Enter these same credentials on the **Settings** page of the web app interface to save them.)*

---

## 4. Cloud Deployment (Free Tier)

This project is configured for one-click deployment:
- **Frontend** → **Vercel**
- **Backend** → **Render**

Follow the detailed step-by-step instructions in the [Walkthrough / Hosting Guide](hosting_guide.md) to set up your GitHub repository, configure environment variables, and map CORS origins.
