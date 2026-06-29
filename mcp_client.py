import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import json
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Tuple

from groq import AsyncGroq
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("mcp_client")

# Load environments
from dotenv import load_dotenv
load_dotenv()

# Groq model to use — fast, free-tier, supports tool calling
GROQ_MODEL = "llama-3.3-70b-versatile"

class MCPGeminiClient:
    """AI chat client powered by Groq LLM with MCP tool support."""

    def __init__(self):
        # API key — stored in env as GEMINI_API_KEY for backward compatibility
        # but now accepts a Groq key (gsk_...)
        self.api_key = os.getenv("GEMINI_API_KEY")

        # Spawn the MCP server with the same Python interpreter running this app.
        self.python_exe = sys.executable
        self.server_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mcp_server.py")
        self.trace_logs = []

    def log_trace(self, trace_type: str, message: str, data: Any = None):
        """Adds a structured log trace for UI display."""
        logger.info(f"[{trace_type.upper()}] {message}")
        self.trace_logs.append({
            "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3],
            "type": trace_type,
            "message": message,
            "data": data
        })

    async def execute_query(self, user_query: str, chat_history: List[Dict[str, Any]] = None) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Connects to the MCP server, gets the available tools, binds them to Groq,
        runs the async function-calling loop, and returns the final text response.
        """
        self.trace_logs = []  # Clear previous traces
        self.log_trace("system", "Initializing MCP client connection...")

        # Setup stdio subprocess parameters for MCP server
        server_params = StdioServerParameters(
            command=self.python_exe,
            args=[self.server_script],
            env={**os.environ, "PYTHONUNBUFFERED": "1"}
        )

        self.log_trace("system", f"Spawning MCP server subprocess: {self.python_exe} {self.server_script}")

        try:
            # 1. Connect to the MCP Server
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    self.log_trace("system", "Establishing session connection...")
                    await session.initialize()
                    self.log_trace("system", "MCP Handshake completed successfully.")

                    # 2. Get tools from MCP Server
                    self.log_trace("mcp_protocol", "Sending list_tools request...")
                    tools_result = await session.list_tools()
                    mcp_tools = tools_result.tools

                    tool_names = [t.name for t in mcp_tools]
                    self.log_trace("mcp_protocol", f"Received {len(mcp_tools)} tools from server", tool_names)

                    # 3. Convert MCP tools to Groq/OpenAI tool format
                    groq_tools = []
                    for tool in mcp_tools:
                        schema = tool.inputSchema
                        if "type" not in schema:
                            schema["type"] = "object"

                        clean_schema = {
                            "type": schema["type"],
                            "properties": schema.get("properties", {}),
                            "required": schema.get("required", [])
                        }

                        groq_tools.append({
                            "type": "function",
                            "function": {
                                "name": tool.name,
                                "description": tool.description or f"Execute tool {tool.name}",
                                "parameters": clean_schema
                            }
                        })

                    # 4. Initialize Groq Async Client
                    if not self.api_key:
                        raise ValueError("API Key (GEMINI_API_KEY env var) is missing.")

                    client = AsyncGroq(api_key=self.api_key)
                    self.log_trace("llm", f"Configuring Groq model '{GROQ_MODEL}' with {len(groq_tools)} tools.")

                    # 5. Build conversation history (OpenAI format)
                    messages = [
                        {
                            "role": "system",
                            "content": (
                                "You are an expert Supabase log analyst AI assistant. "
                                "Use the available tools to fetch and analyse Supabase logs, "
                                "then give a clear, concise answer. "
                                "Always call the relevant tool first before answering."
                            )
                        }
                    ]

                    # Replay previous chat history
                    if chat_history:
                        for msg in chat_history:
                            messages.append(msg)

                    # Append new user message
                    messages.append({"role": "user", "content": user_query})

                    # 6. Tool-calling loop
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
                                    tools=groq_tools if groq_tools else None,
                                    tool_choice="auto" if groq_tools else None,
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

                        # If the model returned text with no tool calls → done
                        if not msg.tool_calls:
                            self.log_trace("llm", "LLM completed reasoning and returned final answer.")
                            final_answer = msg.content or ""
                            # Persist assistant message to history
                            messages.append({"role": "assistant", "content": final_answer})
                            break

                        # The model wants to call tools
                        # a) Append assistant message with tool calls to history
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

                        # b) Execute each tool call via MCP
                        for tc in msg.tool_calls:
                            tool_name = tc.function.name
                            try:
                                tool_args = json.loads(tc.function.arguments)
                            except Exception:
                                tool_args = {}

                            self.log_trace("mcp_call", f"LLM requested tool: '{tool_name}'", tool_args)

                            try:
                                self.log_trace("mcp_protocol", f"Calling tool '{tool_name}' on MCP server...")
                                tool_result = await session.call_tool(tool_name, arguments=tool_args)

                                result_text = ""
                                if tool_result and hasattr(tool_result, "content"):
                                    for block in tool_result.content:
                                        if getattr(block, "type", "text") == "text":
                                            result_text += getattr(block, "text", "")

                                self.log_trace("mcp_response", f"Tool '{tool_name}' succeeded.", {"output_length": len(result_text)})
                            except Exception as tool_err:
                                result_text = json.dumps({"error": f"Tool execution failed: {tool_err}"})
                                self.log_trace("mcp_response", f"Tool '{tool_name}' failed.", {"error": str(tool_err)})

                            # c) Append tool result to history
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tc.id,
                                "content": result_text
                            })

                    # Return final answer and serializable history (strip system prompt)
                    export_history = [m for m in messages if m.get("role") != "system"]
                    return final_answer, export_history

        except Exception as e:
            friendly_err = self._extract_friendly_error(e)
            err_msg = f"Failed to run MCP client connection loop: {friendly_err}"
            self.log_trace("error", err_msg)
            import traceback
            logger.error(traceback.format_exc())
            return f"An error occurred while connecting to the MCP Server:\n\n{friendly_err}", []

    def _extract_friendly_error(self, e: Exception) -> str:
        """Checks for rate-limit, auth errors and returns a friendly message."""
        err_str = str(e)
        if "429" in err_str or "rate_limit" in err_str.lower():
            return "⚠️ Groq API Rate Limit (429). Please wait 30 seconds and try again."
        if "401" in err_str or "invalid_api_key" in err_str.lower() or "authentication" in err_str.lower():
            return "❌ Invalid Groq API Key. Please update your API key in Settings."
        return err_str
