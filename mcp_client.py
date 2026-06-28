import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import json
import asyncio
import logging
import time
from datetime import datetime
from typing import List, Dict, Any, Tuple

from google import genai
from google.genai import types
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("mcp_client")

# Load environments
from dotenv import load_dotenv
load_dotenv()

class MCPGeminiClient:
    def __init__(self):
        # Configure Gemini API Key
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
        Connects to the MCP server, gets the available tools, binds them to Gemini,
        runs the manual async function-calling loop, and returns the final text response.
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

                    # 3. Create Gemini Function Declarations dynamically
                    function_declarations = []
                    for tool in mcp_tools:
                        schema = tool.inputSchema
                        if "type" not in schema:
                            schema["type"] = "object"
                            
                        # Clean parameters to strictly adhere to what Gemini expects
                        clean_schema = {
                            "type": schema["type"],
                            "properties": schema.get("properties", {}),
                            "required": schema.get("required", [])
                        }

                        fd = types.FunctionDeclaration(
                            name=tool.name,
                            description=tool.description or f"Execute tool {tool.name}",
                            parameters=clean_schema
                        )
                        function_declarations.append(fd)

                    # Wrap in Gemini Tool object
                    gemini_tools = [types.Tool(function_declarations=function_declarations)] if function_declarations else []

                    # 4. Initialize Gemini Client
                    if not self.api_key:
                        raise ValueError("GEMINI_API_KEY environment variable is missing.")
                    
                    client = genai.Client(api_key=self.api_key)
                    async_client = client.aio
                    model_name = "gemini-2.0-flash"  # Stable free-tier model (1500 RPD)
                    
                    self.log_trace("llm", f"Configuring Gemini model '{model_name}' with {len(function_declarations)} tools.")

                    # 5. Build conversation history
                    contents = []
                    if chat_history:
                        contents = self._load_history(chat_history)
                    
                    # Append new user message
                    contents.append(types.Content(
                        role="user",
                        parts=[types.Part.from_text(text=user_query)]
                    ))

                    # 6. Manual Function Calling Loop
                    loop_count = 0
                    max_loops = 10
                    final_answer = ""

                    while loop_count < max_loops:
                        loop_count += 1
                        self.log_trace("llm", "Awaiting model response...")

                        # Retry up to 3 times on Gemini 429 / RESOURCE_EXHAUSTED
                        response = None
                        for attempt in range(3):
                            try:
                                response = await async_client.models.generate_content(
                                    model=model_name,
                                    contents=contents,
                                    config=types.GenerateContentConfig(tools=gemini_tools)
                                )
                                break
                            except Exception as ge:
                                err_str = str(ge)
                                is_rate_limit = "429" in err_str or "RESOURCE_EXHAUSTED" in err_str
                                if not is_rate_limit or attempt == 2:
                                    raise
                                wait = 15 if attempt == 0 else 45
                                self.log_trace("llm", f"Gemini 429 rate limit — retrying in {wait}s (attempt {attempt + 1}/3)...")
                                await asyncio.sleep(wait)
                        
                        # Verify candidate content
                        if not response.candidates or not response.candidates[0].content:
                            self.log_trace("error", "Received empty response from Gemini model.")
                            final_answer = "Error: Received empty response from Gemini model."
                            break
                            
                        candidate_content = response.candidates[0].content
                        
                        # Check if Gemini wants to call functions
                        # The new SDK provides the response.function_calls helper
                        func_calls = response.function_calls
                        
                        if not func_calls:
                            self.log_trace("llm", "LLM completed reasoning and returned final answer.")
                            contents.append(candidate_content)
                            final_answer = response.text or ""
                            break
                            
                        # If there are function calls, we must:
                        # a) Append the model response containing function calls to history
                        contents.append(candidate_content)
                        
                        # b) Execute each function call and gather responses
                        function_responses = []
                        for fc in func_calls:
                            tool_name = fc.name
                            tool_args = dict(fc.args) if fc.args else {}
                            
                            self.log_trace("mcp_call", f"LLM requested tool execution: '{tool_name}'", tool_args)
                            
                            try:
                                self.log_trace("mcp_protocol", f"Calling tool '{tool_name}' on server via stdio...")
                                tool_result = await session.call_tool(tool_name, arguments=tool_args)
                                
                                # Extract text output from MCP response
                                result_text = ""
                                if tool_result and hasattr(tool_result, "content"):
                                    for block in tool_result.content:
                                        if getattr(block, "type", "text") == "text":
                                            result_text += getattr(block, "text", "")
                                            
                                self.log_trace("mcp_response", f"Tool '{tool_name}' execution succeeded.", {"output_length": len(result_text)})
                            except Exception as tool_err:
                                result_text = json.dumps({"error": f"Tool execution failed: {tool_err}"})
                                self.log_trace("mcp_response", f"Tool '{tool_name}' execution failed.", {"error": str(tool_err)})

                            # Construct the function response Part
                            fr_part = types.Part.from_function_response(
                                name=tool_name,
                                response={"result": result_text}
                            )
                            function_responses.append(fr_part)

                        # c) Append the function response content back to the history
                        # Under the hood, Gemini expects role='user' or role='tool' for responses,
                        # the new SDK's types.Content(role="user", parts=...) is standard.
                        contents.append(types.Content(
                            role="user",
                            parts=function_responses
                        ))

                    # Export updated history to serializable list
                    updated_history = self._export_history(contents)
                    return final_answer, updated_history

        except Exception as e:
            friendly_err = self._extract_friendly_error(e)
            err_msg = f"Failed to run MCP client connection loop: {friendly_err}"
            self.log_trace("error", err_msg)
            import traceback
            logger.error(traceback.format_exc())
            return f"An error occurred while connecting to the MCP Server:\n\n{friendly_err}", []

    def _extract_friendly_error(self, e: Exception) -> str:
        """Recursively checks for ClientError, rate limits, or quota errors."""
        if hasattr(e, "exceptions"):
            for sub_e in e.exceptions:
                msg = self._extract_friendly_error(sub_e)
                if msg:
                    return msg
        err_str = str(e)
        err_name = type(e).__name__
        if "ClientError" in err_name or "APIError" in err_name or "RESOURCE_EXHAUSTED" in err_str or "429" in err_str:
            if "RESOURCE_EXHAUSTED" in err_str or "429" in err_str:
                return "⚠️ Gemini API Quota Exceeded (429 Rate Limit). The free tier of the Gemini API has a strict request limit. Please wait 30 seconds and try again."
            return f"Gemini API Error: {err_str}"
        return err_str

    def _load_history(self, serializable_history: List[Dict[str, Any]]) -> List[types.Content]:
        """Converts serializable dictionary history back to types.Content list."""
        contents = []
        for msg in serializable_history:
            parts = []
            for p in msg["parts"]:
                if "text" in p:
                    parts.append(types.Part.from_text(text=p["text"]))
                elif "function_call" in p:
                    fc = p["function_call"]
                    # In google-genai, we use types.FunctionCall
                    parts.append(types.Part(
                        function_call=types.FunctionCall(
                            name=fc["name"],
                            args=fc["args"]
                        )
                    ))
                elif "function_response" in p:
                    fr = p["function_response"]
                    parts.append(types.Part.from_function_response(
                        name=fr["name"],
                        response=fr["response"]
                    ))
            contents.append(types.Content(role=msg["role"], parts=parts))
        return contents

    def _export_history(self, contents: List[types.Content]) -> List[Dict[str, Any]]:
        """Converts types.Content list to a serializable dictionary list."""
        serializable = []
        for content in contents:
            if not content.parts:
                continue
            parts_list = []
            for part in content.parts:
                p_dict = {}
                # Check for attributes safely
                if hasattr(part, "text") and part.text:
                    p_dict["text"] = part.text
                elif hasattr(part, "function_call") and part.function_call:
                    p_dict["function_call"] = {
                        "name": part.function_call.name,
                        "args": dict(part.function_call.args) if part.function_call.args else {}
                    }
                elif hasattr(part, "function_response") and part.function_response:
                    p_dict["function_response"] = {
                        "name": part.function_response.name,
                        "response": dict(part.function_response.response) if part.function_response.response else {}
                    }
                if p_dict:
                    parts_list.append(p_dict)
            serializable.append({
                "role": content.role,
                "parts": parts_list
            })
        return serializable
