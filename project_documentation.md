# Supabase Log AI Assistant (MCP) - Project Documentation

Welcome to the **Supabase Log AI Assistant** project documentation. This guide details the project's purpose, architecture, setup requirements, and provides a file-by-file breakdown to help you understand how every component works together.

---

## 1. Project Overview

The **Supabase Log AI Assistant** is an interactive, AI-driven log analysis platform built with Python, Streamlit, and Google's Gemini LLM. It uses the **Model Context Protocol (MCP)** to allow Gemini to dynamically explore, search, and analyze real, live logs from a Supabase project.

Unlike typical static databases, Supabase platform logs (Postgres, API Gateway, Auth, and Edge Functions) are hosted in Logflare/BigQuery and accessed via the Supabase Management API. This project exposes those logs to an LLM via MCP tools, enabling you to ask natural language questions (e.g., *"Show me recent database deadlocks"* or *"What's the auth failure rate?"*) and receive detailed analytics.

---

## 2. System Architecture

The project consists of four primary software layers communicating asynchronously:

```
   ┌──────────────────────────┐
   │       Streamlit UI       │◄─── (Dashboard / Log Explorer)
   │         (app.py)         │
   └─────────────┬────────────┘
                 │
                 ▼ (Queries)
   ┌──────────────────────────┐
   │     MCP Gemini Client    │◄─── (Orchestrates Gemini API Function Loop)
   │      (mcp_client.py)     │
   └─────────────┬────────────┘
                 │
                 ▼ (Stdio JSON-RPC Subprocess)
   ┌──────────────────────────┐
   │        MCP Server        │
   │      (mcp_server.py)     │
   └─────────────┬────────────┘
                 │
                 ▼ (Retrieves logs via)
   ┌──────────────────────────┐
   │    Log Database Manager  │◄─── (Reads and normalizes logs from Supabase)
   │   (supabase_client.py)   │
   └─────────────┬────────────┘
                 │
                 ▼ (HTTPS requests)
   ┌──────────────────────────┐
   │     Supabase Management  │
   │        Analytics API     │
   └──────────────────────────┘
```

### Flow of a Chat Query:
1. The user types a query in the **Streamlit UI** (`app.py`).
2. The UI sends the query to the **MCP Gemini Client** (`mcp_client.py`).
3. The client spawns the local **MCP Server** (`mcp_server.py`) as a subprocess using stdio transport.
4. The client lists available tools on the server and registers them as Gemini tool declarations.
5. Gemini decides if it needs to call a log-fetching tool to answer the user's query.
6. The client interceptor calls the tool on the **MCP Server**, which uses the **Log Database Manager** (`supabase_client.py`) to query the Supabase Management Analytics API.
7. The result returns back to Gemini to complete its reasoning and generate a final human-friendly response.

---

## 3. File Directory Breakdown

Here is a directory map and detailed descriptions of all files in the workspace:

| File Name | Purpose | Key Classes/Functions |
| :--- | :--- | :--- |
| [app.py](file:///f:/Supabase%20assist/app.py) | Streamlit dashboard and chat user interface. | Tabs, Session State, UI layout |
| [supabase_client.py](file:///f:/Supabase%20assist/supabase_client.py) | Normalizer & client to fetch live logs from Supabase API. | `LogDatabaseManager` |
| [mcp_server.py](file:///f:/Supabase%20assist/mcp_server.py) | MCP server exposing log querying tools to the LLM. | `FastMCP` tools |
| [mcp_client.py](file:///f:/Supabase%20assist/mcp_client.py) | Core Gemini orchestrator that runs the tool-calling loop. | `MCPGeminiClient` |
| [init_db.py](file:///f:/Supabase%20assist/init_db.py) | Deprecated db initializer, now serves as a mock log generator. | `generate_mock_logs` |
| [test_client.py](file:///f:/Supabase%20assist/test_client.py) | CLI utility to quickly test client connections. | `main` |
| [requirements.txt](file:///f:/Supabase%20assist/requirements.txt) | Python project dependencies. | `fastmcp`, `google-genai`, etc. |
| [.env.example](file:///f:/Supabase%20assist/.env.example) | Template for local environment variables. | API keys and connection secrets |
| [.gitignore](file:///f:/Supabase%20assist/.gitignore) | Git file exclusion patterns. | Ignores `.env`, temporary caches |

---

## 4. Detailed File Explanations

### 🖥️ [app.py](file:///f:/Supabase%20assist/app.py)
This is the entry point for the Streamlit web application.
- **Glassmorphism Theme**: Applies custom CSS styles for dark mode aesthetics, clean metrics cards, and scrollable console-like windows for MCP traces.
- **Dashboard Tab**: Renders high-level metrics (Total Logs, Total Errors, Warnings, and Error Rate) using **Plotly** visualizations. Contains a searchable, tabular log explorer.
- **AI Log Assistant Tab**: An interactive chat interface to converse with the Gemini client. It also embeds an expandable **MCP Protocol Trace** log so you can inspect raw JSON-RPC messages and tool arguments.

### 🛡️ [supabase_client.py](file:///f:/Supabase%20assist/supabase_client.py)
This file handles low-level HTTP integration with the Supabase Management API.
- **`LogDatabaseManager`**: Derives the project reference ID from your `SUPABASE_URL`, executes SQL queries via HTTPS, and normalizes various source logs (postgres, auth, gateway, edge functions) to a uniform dictionary shape.
- **Custom SQL Engine**: Provides a safe `execute_raw_query` method to run custom read-only queries (restricted to `SELECT`/`WITH` statements) directly against your Logflare database.

### 🕸️ [mcp_server.py](file:///f:/Supabase%20assist/mcp_server.py)
Built using `FastMCP`, this file runs the Model Context Protocol server. It wraps `LogDatabaseManager` methods and exposes them to the client as tool endpoints.

### 🧠 [mcp_client.py](file:///f:/Supabase%20assist/mcp_client.py)
This file implements the **MCP Client** orchestrating Gemini's reasoning loop.
- **Subprocess Spawner**: Launches `mcp_server.py` using the current active Python interpreter and initiates a JSON-RPC stdio handshake.
- **Gemini SDK Binding**: Translates FastMCP schemas into Google GenAI (`google-genai` v0.1.1) `FunctionDeclaration` types.
- **Manual Function Loop**: Executes requests sequentially. When `gemini-2.5-flash` decides to run a tool, the client halts the model, calls the MCP Server subprocess, translates the JSON result back to a `FunctionResponse` object, and resumes model completion.

---

## 5. Configuration & Environment Variables

Create a file named `.env` in the root of the project using the settings below:

```ini
# Gemini API Key (obtain from Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Project Base URL
SUPABASE_URL=https://your-project-ref.supabase.co

# Supabase Personal Access Token (PAT)
# REQUIRED to read platform logs. Create at: https://supabase.com/dashboard/account/tokens
SUPABASE_PAT=sbp_xxxxxxxxxxxxxxxxxxxxxxxx
```

*Note: A Supabase Project's standard `anon` or `service_role` API keys **cannot** read system logs. You must use a Personal Access Token (`SUPABASE_PAT`) beginning with `sbp_`.*

---

## 6. How to Run the Project

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run Direct CLI Tests (Optional)
```bash
python test_client.py
```

### 3. Launch Streamlit Web UI
```bash
streamlit run app.py
```
