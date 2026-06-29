import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import json
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Tuple

from groq import AsyncGroq
from supabase_client import LogDatabaseManager

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("mcp_client")

# Load environments
from dotenv import load_dotenv
load_dotenv()

# Groq model to use — fast, free-tier, supports tool calling
GROQ_MODEL = "llama-3.1-8b-instant"

# Hard-coded schemas for our tools (OpenAI / Groq format)
IN_PROCESS_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "list_recent_logs",
            "description": "Retrieves the most recent Supabase platform log entries across all enabled sources (Postgres, API/Edge, Auth, Edge Functions). Each entry contains timestamp, level, service, source, and message.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "The maximum number of logs to return. Defaults to 15. Capped at 15."}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_logs_by_level",
            "description": "Filters Supabase platform logs by normalized severity level (INFO, WARNING, ERROR, DEBUG).",
            "parameters": {
                "type": "object",
                "properties": {
                    "level": {"type": "string", "description": "The severity level (INFO, WARNING, ERROR, DEBUG)."},
                    "limit": {"type": "integer", "description": "The maximum number of logs to return. Defaults to 15. Capped at 15."}
                },
                "required": ["level"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_logs_by_keyword",
            "description": "Searches Supabase platform logs for a keyword or phrase in the message or service fields.",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {"type": "string", "description": "The search term (e.g. '500', 'deadlock', 'timeout')."},
                    "limit": {"type": "integer", "description": "The maximum number of matches to return. Defaults to 15. Capped at 15."}
                },
                "required": ["keyword"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_log_analytics_summary",
            "description": "Computes summary metrics (severity counts, volume per service, error rate) over recent logs.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "execute_custom_log_query",
            "description": "Executes a custom read-only Logflare/BigQuery SQL query against the log tables (edge_logs, postgres_logs, auth_logs, function_edge_logs).",
            "parameters": {
                "type": "object",
                "properties": {
                    "sql_query": {"type": "string", "description": "A valid read-only SELECT statement."}
                },
                "required": ["sql_query"]
            }
        }
    }
]

class MCPGeminiClient:
    """AI chat client powered by Groq LLM with in-process tool support to prevent OOM errors on Render."""

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.trace_logs = []
        self.db = LogDatabaseManager()

    def log_trace(self, trace_type: str, message: str, data: Any = None):
        """Adds a structured log trace for UI display."""
        logger.info(f"[{trace_type.upper()}] {message}")
        self.trace_logs.append({
            "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3],
            "type": trace_type,
            "message": message,
            "data": data
        })

    def _execute_local_tool(self, tool_name: str, arguments: Dict[str, Any]) -> str:
        """Executes log query functions directly inside the same process to save memory."""
        try:
            if tool_name == "list_recent_logs":
                limit = min(int(arguments.get("limit", 15)), 15)
                logs = self.db.fetch_logs(limit=limit)
                cleaned = [{k: v for k, v in l.items() if k != "metadata"} for l in logs]
                return json.dumps(cleaned, default=str)

            elif tool_name == "get_logs_by_level":
                level = arguments.get("level", "INFO")
                limit = min(int(arguments.get("limit", 15)), 15)
                logs = self.db.get_logs_by_level(level=level, limit=limit)
                cleaned = [{k: v for k, v in l.items() if k != "metadata"} for l in logs]
                return json.dumps(cleaned, default=str)

            elif tool_name == "search_logs_by_keyword":
                keyword = arguments.get("keyword", "")
                limit = min(int(arguments.get("limit", 15)), 15)
                logs = self.db.search_logs(keyword=keyword, limit=limit)
                cleaned = [{k: v for k, v in l.items() if k != "metadata"} for l in logs]
                return json.dumps(cleaned, default=str)

            elif tool_name == "get_log_analytics_summary":
                summary = self.db.get_analytics_summary()
                return json.dumps(summary, indent=2, default=str)

            elif tool_name == "execute_custom_log_query":
                sql_query = arguments.get("sql_query", "")
                results, message = self.db.execute_raw_query(sql_query)
                response = {
                    "execution_status": message,
                    "results_count": len(results),
                    "data": results
                }
                return json.dumps(response, default=str)

            else:
                return json.dumps({"error": f"Unknown tool: {tool_name}"})

        except Exception as e:
            return json.dumps({"error": str(e)})

    async def execute_query(self, user_query: str, chat_history: List[Dict[str, Any]] = None) -> Tuple[str, List[Dict[str, Any]]]:
        """Runs the chat completions loop directly using in-process tools."""
        self.trace_logs = []
        self.log_trace("system", "Initializing in-process LLM client...")

        try:
            if not self.api_key:
                raise ValueError("API Key (GEMINI_API_KEY env var) is missing.")

            client = AsyncGroq(api_key=self.api_key)
            self.log_trace("llm", f"Configuring Groq model '{GROQ_MODEL}' with {len(IN_PROCESS_TOOLS)} tools.")

            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are an expert Supabase log analyst AI assistant. "
                        "Always call the relevant tool first before answering. "
                        "To prevent rate limits, call ONLY one tool per turn. Do NOT make multiple parallel tool calls. "
                        "Choose the single most specific tool (e.g., use `search_logs_by_keyword` with 'checkpoint' to find checkpoints) "
                        "rather than querying general logs or multiple tools. "
                        "Avoid using `execute_custom_log_query` unless absolutely necessary."
                    )
                }
            ]

            if chat_history:
                for msg in chat_history:
                    messages.append(msg)

            messages.append({"role": "user", "content": user_query})

            loop_count = 0
            max_loops = 10
            final_answer = ""

            while loop_count < max_loops:
                loop_count += 1
                self.log_trace("llm", "Awaiting model response...")

                # Retry on rate limit (429)
                response = None
                for attempt in range(3):
                    try:
                        response = await client.chat.completions.create(
                            model=GROQ_MODEL,
                            messages=messages,
                            tools=IN_PROCESS_TOOLS,
                            tool_choice="auto",
                            max_tokens=4096,
                            temperature=0.1
                        )
                        break
                    except Exception as ge:
                        err_str = str(ge)
                        is_rate_limit = "429" in err_str or "rate_limit" in err_str.lower()
                        if not is_rate_limit or attempt == 2:
                            raise
                        wait = 15 if attempt == 0 else 45
                        self.log_trace("llm", f"Groq rate limit — retrying in {wait}s (attempt {attempt + 1}/3)...")
                        await asyncio.sleep(wait)

                choice = response.choices[0]
                msg = choice.message

                if not msg.tool_calls:
                    self.log_trace("llm", "LLM completed reasoning and returned final answer.")
                    final_answer = msg.content or ""
                    messages.append({"role": "assistant", "content": final_answer})
                    break

                # The model wants to call tools
                messages.append({
                    "role": "assistant",
                    "content": msg.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments
                            }
                        }
                        for tc in msg.tool_calls
                    ]
                })

                # Execute each tool locally (in-process)
                for tc in msg.tool_calls:
                    tool_name = tc.function.name
                    try:
                        tool_args = json.loads(tc.function.arguments)
                    except Exception:
                        tool_args = {}

                    self.log_trace("mcp_call", f"LLM requested tool: '{tool_name}'", tool_args)
                    
                    # Run direct in-process execution
                    self.log_trace("mcp_protocol", f"Executing tool '{tool_name}' locally in-process...")
                    result_text = self._execute_local_tool(tool_name, tool_args)
                    self.log_trace("mcp_response", f"Tool '{tool_name}' finished.", {"output_length": len(result_text)})

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "name": tool_name,
                        "content": result_text
                    })

            export_history = [m for m in messages if m.get("role") != "system"]
            return final_answer, export_history

        except Exception as e:
            friendly_err = self._extract_friendly_error(e)
            err_msg = f"Failed to run LLM chat loop: {friendly_err}"
            self.log_trace("error", err_msg)
            return f"An error occurred during AI analysis:\n\n{friendly_err}", []

    def _extract_friendly_error(self, e: Exception) -> str:
        err_str = str(e)
        if "429" in err_str or "rate_limit" in err_str.lower():
            return "⚠️ Groq API Rate Limit (429). Please wait 30 seconds and try again."
        if "401" in err_str or "invalid_api_key" in err_str.lower():
            return "❌ Invalid Groq API Key. Please update your API key in Settings."
        return err_str
