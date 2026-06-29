import os
import sys
import json
import logging
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import database manager and MCP client
from supabase_client import LogDatabaseManager
from mcp_client import MCPGeminiClient

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("api_server")

# Load environment variables
load_dotenv()

app = FastAPI(title="Supabase Log AI Assistant API")

# Enable CORS for Next.js frontend
# CORS_ORIGINS env var can be a comma-separated list of allowed origins.
# Defaults to localhost for local dev. Set it to your Vercel URL in Render.
_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",  # allow all Vercel preview deploys
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
db = LogDatabaseManager()
mcp_client = MCPGeminiClient()
chat_history = []

class LogFilters(BaseModel):
    search: Optional[str] = None
    severity: Optional[List[str]] = None
    source: Optional[List[str]] = None
    timeRange: Optional[str] = "24h"
    limit: Optional[int] = 50
    offset: Optional[int] = 0

class ChatRequest(BaseModel):
    message: str

class SettingsUpdateRequest(BaseModel):
    appName: Optional[str] = None
    logFetchInterval: Optional[int] = None
    maxLogsPerQuery: Optional[int] = None
    geminiApiKey: Optional[str] = None
    supabaseUrl: Optional[str] = None
    supabasePat: Optional[str] = None

# Helper to re-initialize clients when settings update
def reload_clients():
    global db, mcp_client
    load_dotenv(override=True)
    db = LogDatabaseManager()
    mcp_client = MCPGeminiClient()
    logger.info("Database and Groq/MCP clients reloaded with new settings.")

# 1. Dashboard Metrics
@app.get("/api/dashboard/metrics")
def get_dashboard_metrics():
    try:
        summary = db.get_analytics_summary()
        total_logs = summary.get("total_logs", 0)
        level_counts = summary.get("level_counts", {})
        service_counts = summary.get("service_counts", {})
        error_rate = summary.get("error_rate_percentage", 0.0)

        # Sum up errors
        critical_errors = level_counts.get("ERROR", 0) + level_counts.get("CRITICAL", 0)
        warnings = level_counts.get("WARNING", 0)

        # Map severity distribution
        severity_colors = {
            "INFO": "#38bdf8",
            "WARNING": "#f59e0b",
            "ERROR": "#ef4444",
            "CRITICAL": "#b91c1c",
            "DEBUG": "#64748b"
        }
        severity_dist = []
        for level, count in level_counts.items():
            severity_dist.append({
                "name": level,
                "value": count,
                "color": severity_colors.get(level.upper(), "#3b82f6")
            })

        # Map source distribution
        source_dist = []
        for service, count in service_counts.items():
            source_dist.append({
                "name": service,
                "count": count
            })

        # Fetch recent logs
        recent_logs_raw = db.fetch_logs(limit=20)
        recent_logs = []
        for log in recent_logs_raw:
            recent_logs.append({
                "id": log.get("id"),
                "timestamp": log.get("created_at"),
                "severity": log.get("level"),
                "source": log.get("service"),
                "message": log.get("message"),
                "metadata": log.get("metadata")
            })

        return {
            "totalLogs": total_logs,
            "totalLogsChange": 0,  # Real-time change is defaulted to 0
            "criticalErrors": critical_errors,
            "criticalErrorsChange": 0,
            "warnings": warnings,
            "warningsChange": 0,
            "errorRate": error_rate,
            "severityDistribution": severity_dist,
            "sourceDistribution": source_dist,
            "recentLogs": recent_logs
        }
    except Exception as e:
        logger.error(f"Error getting dashboard metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 2. Error Rate Timeseries
@app.get("/api/dashboard/error-rate")
def get_error_rate(timeRange: str = "24h"):
    try:
        summary = db.get_analytics_summary()
        hourly = summary.get("hourly_counts", {})
        
        # Sort hours chronologically
        sorted_hours = sorted(hourly.keys())
        error_rate_data = [{"time": h, "value": hourly[h]} for h in sorted_hours]
        
        return {
            "data": error_rate_data
        }
    except Exception as e:
        logger.error(f"Error getting error rate data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 3. Logs Search and Filtering
@app.post("/api/logs/search")
def search_logs(filters: LogFilters):
    try:
        # Fetch all logs in active window (defaulting to pool cache)
        pool = db._fetch_pool(per_source=250)
        
        filtered = []
        for log in pool:
            # Filter by keyword search
            if filters.search:
                search_term = filters.search.lower()
                msg = log.get("message", "").lower()
                service = log.get("service", "").lower()
                metadata_str = json.dumps(log.get("metadata", {}), default=str).lower()
                if search_term not in msg and search_term not in service and search_term not in metadata_str:
                    continue
            
            # Filter by severity level
            if filters.severity and len(filters.severity) > 0:
                if log.get("level", "").upper() not in [s.upper() for s in filters.severity]:
                    continue
                    
            # Filter by source/service
            if filters.source and len(filters.source) > 0:
                if log.get("service", "") not in filters.source:
                    continue
            
            filtered.append(log)
            
        total = len(filtered)
        start = filters.offset
        end = filters.offset + filters.limit
        
        sliced_logs = filtered[start:end]
        mapped_logs = []
        for log in sliced_logs:
            mapped_logs.append({
                "id": log.get("id"),
                "timestamp": log.get("created_at"),
                "severity": log.get("level"),
                "source": log.get("service"),
                "message": log.get("message"),
                "metadata": log.get("metadata")
            })
        
        return {
            "total": total,
            "data": mapped_logs
        }
    except Exception as e:
        logger.error(f"Error searching logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 4. Get Log Detail
@app.get("/api/logs/{log_id}")
def get_log_detail(log_id: str):
    try:
        pool = db._fetch_pool()
        for log in pool:
            if log.get("id") == log_id:
                return {
                    "id": log.get("id"),
                    "timestamp": log.get("created_at"),
                    "severity": log.get("level"),
                    "source": log.get("service"),
                    "message": log.get("message"),
                    "metadata": log.get("metadata")
                }
        raise HTTPException(status_code=404, detail="Log entry not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting log detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 5. AI Assistant Chat
@app.post("/api/chat/message")
async def send_chat_message(request: ChatRequest):
    global chat_history
    try:
        if not os.getenv("GEMINI_API_KEY"):
            raise HTTPException(status_code=400, detail="Groq API Key is not configured. Go to Settings to save your key.")
            
        answer, updated_history = await mcp_client.execute_query(
            user_query=request.message,
            chat_history=chat_history
        )
        chat_history = updated_history
        
        # Format tracing trace_logs so Next.js can read
        traces = mcp_client.trace_logs.copy()
        
        return {
            "message": answer,
            "toolUse": traces
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running Groq MCP chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 6. Get Current Settings
@app.get("/api/settings")
def get_settings():
    return {
        "appName": os.getenv("NEXT_PUBLIC_APP_NAME", "Supabase Log AI Assistant"),
        "logFetchInterval": int(os.getenv("NEXT_PUBLIC_LOG_FETCH_INTERVAL", "300000")),
        "maxLogsPerQuery": int(os.getenv("NEXT_PUBLIC_MAX_LOGS_PER_QUERY", "1000")),
        "geminiApiKey": os.getenv("GEMINI_API_KEY", ""),
        "supabaseUrl": os.getenv("SUPABASE_URL", ""),
        "supabasePat": os.getenv("SUPABASE_PAT", "")
    }

# 7. Update Settings
@app.put("/api/settings")
def update_settings(settings: SettingsUpdateRequest):
    try:
        # Load existing dotenv lines
        env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
        env_lines = []
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                env_lines = f.readlines()

        # Update environment values dictionary
        env_dict = {}
        for line in env_lines:
            line_str = line.strip()
            if line_str and not line_str.startswith("#") and "=" in line_str:
                k, v = line_str.split("=", 1)
                env_dict[k.strip()] = v.strip()

        # Map update settings
        if settings.appName is not None:
            env_dict["NEXT_PUBLIC_APP_NAME"] = settings.appName
        if settings.logFetchInterval is not None:
            env_dict["NEXT_PUBLIC_LOG_FETCH_INTERVAL"] = str(settings.logFetchInterval)
        if settings.maxLogsPerQuery is not None:
            env_dict["NEXT_PUBLIC_MAX_LOGS_PER_QUERY"] = str(settings.maxLogsPerQuery)
        if settings.geminiApiKey is not None:
            env_dict["GEMINI_API_KEY"] = settings.geminiApiKey
        if settings.supabaseUrl is not None:
            env_dict["SUPABASE_URL"] = settings.supabaseUrl
        if settings.supabasePat is not None:
            env_dict["SUPABASE_PAT"] = settings.supabasePat

        # Write values back to .env
        with open(env_path, "w", encoding="utf-8") as f:
            for k, v in env_dict.items():
                f.write(f"{k}={v}\n")

        # Reload clients
        reload_clients()
        
        return {"status": "success", "message": "Settings updated and saved to .env"}
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 8. Test Connection
@app.post("/api/test-connection")
def test_connection():
    status = {
        "supabase": {"connected": False, "message": "Not tested"},
        "gemini": {"connected": False, "message": "Not tested"}
    }
    
    # Test Supabase connection
    try:
        # Force fetch recent logs from Supabase
        db._fetch_pool(per_source=1, force=True)
        status["supabase"]["connected"] = True
        status["supabase"]["message"] = "Successfully connected to Supabase Analytics API"
    except Exception as e:
        status["supabase"]["connected"] = False
        status["supabase"]["message"] = f"Failed: {e}"
        
    # Test Gemini (now Groq) connection
    try:
        from groq import Groq
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("Groq API Key is not configured (stored in Gemini Key setting)")
        client = Groq(api_key=api_key)
        # Quick validation request (e.g. list models)
        client.models.list()
        status["gemini"]["connected"] = True
        status["gemini"]["message"] = "Successfully authenticated with Groq API"
    except Exception as e:
        status["gemini"]["connected"] = False
        status["gemini"]["message"] = f"Failed: {e}"
        
    return status

if __name__ == "__main__":
    import uvicorn
    # Start uvicorn server on port 8000
    uvicorn.run(app, host="127.0.0.1", port=8000)
