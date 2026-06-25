# Supabase Log AI Assistant (MCP)

This project is an interactive, AI-driven log analysis platform built with Python, Streamlit, and Google's Gemini LLM. It uses the **Model Context Protocol (MCP)** to allow Gemini to dynamically explore, search, and analyze real, live logs from your Supabase project.

---

## 1. Architecture Overview

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

1. **Streamlit UI (`app.py`)**: Renders the analytics dashboard, metrics charts, log table explorer, and AI chat interface.
2. **MCP Gemini Client (`mcp_client.py`)**: Orchestrates the communication between the Gemini model (`gemini-2.5-flash`) and the local MCP server using manual function calling loops.
3. **MCP Server (`mcp_server.py`)**: Built with `FastMCP`, this exposes tools to list logs, filter by severity, search by keyword, run analytics summaries, or execute custom BigQuery SQL queries.
4. **Log Database Manager (`supabase_client.py`)**: Interacts with the Supabase Management API using your credentials, converting platform logs (database, edge, auth, functions) into a uniform schema.

---

## 2. File Directory Breakdown

* **[app.py](file:///f:/Supabase%20assist/app.py)**: The main entrypoint for the Streamlit dashboard and chat UI.
* **[supabase_client.py](file:///f:/Supabase%20assist/supabase_client.py)**: Normalizes logs and executes raw SQL queries against the Supabase Analytics endpoints.
* **[mcp_server.py](file:///f:/Supabase%20assist/mcp_server.py)**: FastMCP server providing JSON-RPC tools to query, filter, and search logs.
* **[mcp_client.py](file:///f:/Supabase%20assist/mcp_client.py)**: Spawns the MCP server as a stdio subprocess and implements Gemini tool loop bindings.
* **[init_db.py](file:///f:/Supabase%20assist/init_db.py)**: Contains a mock log generator helper class (no longer required to seed DB, as the app queries live logs).
* **[test_client.py](file:///f:/Supabase%20assist/test_client.py)**: A console script to quickly verify client/server interaction.
* **[requirements.txt](file:///f:/Supabase%20assist/requirements.txt)**: Lists dependencies including Streamlit, Supabase, FastMCP, and the Google GenAI SDK.
* **[.env.example](file:///f:/Supabase%20assist/.env.example)**: Reference template for environment configuration.

---

## 3. Configuration & Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the root of the project:
   ```ini
   GEMINI_API_KEY=your-gemini-api-key
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_PAT=sbp_your_personal_access_token
   ```
   *Note: A Personal Access Token (PAT) starting with `sbp_` is required to query Supabase logs. Standard API service keys will not work.*

3. **Verify Connection**:
   ```bash
   python test_client.py
   ```

4. **Launch Streamlit Dashboard**:
   ```bash
   streamlit run app.py
   ```
