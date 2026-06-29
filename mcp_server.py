import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import json
import logging
from fastmcp import FastMCP
from supabase_client import LogDatabaseManager

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("mcp_server")

# Initialize FastMCP Server
mcp = FastMCP("Supabase Log Analyzer")
db = LogDatabaseManager()

@mcp.tool()
def list_recent_logs(limit: int = 15) -> str:
    """
    Retrieves the most recent Supabase platform log entries across all enabled
    sources (Postgres, API/Edge, Auth, Edge Functions). Each entry is normalized to
    {created_at, level, service, source, message}.
    Use this to see what has been happening on the project recently.

    Args:
        limit: The maximum number of logs to return. Capped at 15.
    """
    limit = min(limit, 15)
    logger.info(f"Tool 'list_recent_logs' called with limit={limit} (capped at 15)")
    try:
        logs = db.fetch_logs(limit=limit)
        # Strip metadata to save token payload size
        cleaned = [{k: v for k, v in log.items() if k != "metadata"} for log in logs]
        return json.dumps(cleaned, default=str)
    except Exception as e:
        logger.error(f"Error in list_recent_logs: {e}")
        return json.dumps({"error": str(e)})

@mcp.tool()
def get_logs_by_level(level: str, limit: int = 15) -> str:
    """
    Filters Supabase platform logs by normalized severity level (INFO, WARNING, ERROR, DEBUG).
    Severity is derived per source: HTTP status buckets for API/Edge & Edge Functions,
    Postgres error_severity for the database, and the auth log level for Auth events.
    Use this to investigate errors, warnings, or specific event levels.

    Args:
        level: The severity level to filter by (INFO, WARNING, ERROR, DEBUG). Case-insensitive.
        limit: The maximum number of logs to return. Capped at 15.
    """
    limit = min(limit, 15)
    logger.info(f"Tool 'get_logs_by_level' called with level={level}, limit={limit} (capped at 15)")
    try:
        logs = db.get_logs_by_level(level=level, limit=limit)
        # Strip metadata to save token payload size
        cleaned = [{k: v for k, v in log.items() if k != "metadata"} for log in logs]
        return json.dumps(cleaned, default=str)
    except Exception as e:
        logger.error(f"Error in get_logs_by_level: {e}")
        return json.dumps({"error": str(e)})

@mcp.tool()
def search_logs_by_keyword(keyword: str, limit: int = 15) -> str:
    """
    Searches Supabase platform logs for a keyword or phrase in the message, service, or
    metadata fields. Use this to look for specific error codes, request paths, status
    codes, function names, or SQL fragments.

    Args:
        keyword: The search term or keyword (e.g., '500', '/auth/v1/token', 'deadlock', 'timeout').
        limit: The maximum number of matches to return. Capped at 15.
    """
    limit = min(limit, 15)
    logger.info(f"Tool 'search_logs_by_keyword' called with keyword='{keyword}', limit={limit} (capped at 15)")
    try:
        logs = db.search_logs(keyword=keyword, limit=limit)
        # Strip metadata to save token payload size
        cleaned = [{k: v for k, v in log.items() if k != "metadata"} for log in logs]
        return json.dumps(cleaned, default=str)
    except Exception as e:
        logger.error(f"Error in search_logs_by_keyword: {e}")
        return json.dumps({"error": str(e)})

@mcp.tool()
def get_log_analytics_summary() -> str:
    """
    Computes summary metrics and aggregates over recent Supabase platform logs:
    - Total log counts (in the active time window)
    - Counts grouped by severity level (INFO, WARNING, ERROR, DEBUG)
    - Volume per source (api-gateway, database, auth, edge-functions)
    - Error rate percentage
    Use this to answer general dashboard or analytics questions.
    """
    logger.info("Tool 'get_log_analytics_summary' called")
    try:
        summary = db.get_analytics_summary()
        return json.dumps(summary, indent=2, default=str)
    except Exception as e:
        logger.error(f"Error in get_log_analytics_summary: {e}")
        return json.dumps({"error": str(e)})

@mcp.tool()
def execute_custom_log_query(sql_query: str) -> str:
    """
    Executes a custom read-only Logflare/BigQuery SQL query directly against the
    Supabase log sources (edge_logs, postgres_logs, auth_logs, function_edge_logs).
    Use this for advanced filtering, grouping, aggregations, or calculations the
    predefined tools cannot perform. Nested fields live inside the repeated `metadata`
    record and must be unnested.

    Example:
        SELECT response.status_code AS status, COUNT(*) AS n
        FROM edge_logs
        CROSS JOIN UNNEST(metadata) AS m
        CROSS JOIN UNNEST(m.response) AS response
        GROUP BY status ORDER BY n DESC

    Args:
        sql_query: A valid read-only SELECT/WITH statement in BigQuery dialect.
    """
    logger.info(f"Tool 'execute_custom_log_query' called with query: {sql_query}")
    try:
        results, message = db.execute_raw_query(sql_query)
        response = {
            "execution_status": message,
            "results_count": len(results),
            "data": results
        }
        return json.dumps(response, indent=2, default=str)
    except Exception as e:
        logger.error(f"Error in execute_custom_log_query: {e}")
        return json.dumps({"error": str(e)})

if __name__ == "__main__":
    # Start FastMCP server in stdio transport mode (default when run as process)
    logger.info("Starting FastMCP Supabase Log Server...")
    mcp.run()
