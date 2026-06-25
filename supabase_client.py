import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import re
import json
import logging
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Tuple, Optional
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("supabase_client")

# Load environment variables (.env in project root)
load_dotenv()

# Supabase Management API (where the real platform logs live, backed by Logflare/BigQuery).
MANAGEMENT_API = "https://api.supabase.com/v1"

# Definition of each Supabase log source we read, the Logflare/BigQuery SQL used to
# extract the useful columns, and how to derive a normalized severity "level".
#
# All sources expose top-level `id`, `timestamp` (microseconds since epoch) and
# `event_message`. The rest is nested inside a repeated `metadata` record which we
# unnest per-source.
SOURCE_CONFIG: Dict[str, Dict[str, Any]] = {
    "edge_logs": {
        "label": "api-gateway",
        "level_from": "status",
        "sql": """
            select edge_logs.id, edge_logs.timestamp, edge_logs.event_message,
                   request.method as method,
                   request.path as path,
                   request.host as host,
                   response.status_code as status_code
            from edge_logs
            cross join unnest(metadata) as metadata
            cross join unnest(metadata.request) as request
            cross join unnest(metadata.response) as response
        """,
    },
    "postgres_logs": {
        "label": "database",
        "level_from": "severity",
        "sql": """
            select postgres_logs.id, postgres_logs.timestamp, postgres_logs.event_message,
                   parsed.error_severity as error_severity,
                   parsed.application_name as application_name
            from postgres_logs
            cross join unnest(metadata) as metadata
            cross join unnest(metadata.parsed) as parsed
        """,
    },
    "auth_logs": {
        "label": "auth",
        "level_from": "authlevel",
        "sql": """
            select auth_logs.id, auth_logs.timestamp, auth_logs.event_message,
                   metadata.level as level,
                   metadata.status as status,
                   metadata.path as path,
                   metadata.msg as msg
            from auth_logs
            cross join unnest(metadata) as metadata
        """,
    },
    "function_edge_logs": {
        "label": "edge-functions",
        "level_from": "status",
        "sql": """
            select function_edge_logs.id, function_edge_logs.timestamp, function_edge_logs.event_message,
                   request.method as method,
                   response.status_code as status_code
            from function_edge_logs
            cross join unnest(metadata) as metadata
            cross join unnest(metadata.request) as request
            cross join unnest(metadata.response) as response
        """,
    },
}

DEFAULT_SOURCES = ["edge_logs", "postgres_logs", "auth_logs", "function_edge_logs"]
CORE_FIELDS = {"id", "timestamp", "event_message"}


class LogDatabaseManager:
    """
    Reads the *real* Supabase platform logs (Postgres, API/Edge, Auth, Edge Functions)
    through the Management Analytics API and normalizes every source into a common
    shape: {id, created_at, level, service, source, message, metadata}.

    Auth requires a Supabase Personal Access Token (SUPABASE_PAT) plus a project ref
    (derived from SUPABASE_URL, or set SUPABASE_PROJECT_REF). The project anon/service
    key does NOT work against the Analytics API.
    """

    def __init__(self, sources: Optional[List[str]] = None, hours: int = 24):
        self.pat = os.getenv("SUPABASE_PAT")
        self.project_ref = self._derive_ref()
        self.use_supabase = bool(self.pat and self.project_ref)

        self.sources = sources or list(DEFAULT_SOURCES)
        self.window_hours = hours

        # Simple in-instance cache so a single page render doesn't refetch repeatedly.
        self._pool_cache: Optional[List[Dict[str, Any]]] = None
        self._pool_cache_key: Optional[tuple] = None

        if self.use_supabase:
            logger.info(f"Supabase Analytics configured for project '{self.project_ref}'.")
        else:
            missing = []
            if not self.pat:
                missing.append("SUPABASE_PAT")
            if not self.project_ref:
                missing.append("SUPABASE_URL (or SUPABASE_PROJECT_REF)")
            logger.warning(f"Supabase Analytics not configured. Missing: {', '.join(missing)}")

    # ------------------------------------------------------------------ config

    def _derive_ref(self) -> Optional[str]:
        ref = os.getenv("SUPABASE_PROJECT_REF")
        if ref:
            return ref.strip()
        url = os.getenv("SUPABASE_URL", "") or ""
        if "://" in url:
            host = url.split("://", 1)[1]
            sub = host.split(".", 1)[0].strip()
            return sub or None
        return None

    def configure(self, sources: Optional[List[str]] = None, hours: Optional[int] = None):
        """Update which sources/time window are read and invalidate the cache."""
        changed = False
        if sources is not None and sources != self.sources:
            self.sources = sources
            changed = True
        if hours is not None and hours != self.window_hours:
            self.window_hours = hours
            changed = True
        if changed:
            self.refresh()

    def refresh(self):
        """Drop the cached log pool so the next read hits the API fresh."""
        self._pool_cache = None
        self._pool_cache_key = None

    # ------------------------------------------------------------- API access

    def _run_analytics_sql(self, sql: str, hours: Optional[int] = None) -> List[Dict[str, Any]]:
        """Execute a Logflare/BigQuery SQL statement against the project's logs."""
        if not self.use_supabase:
            raise RuntimeError(
                "Supabase Analytics is not configured. Set SUPABASE_PAT and SUPABASE_URL in .env."
            )

        hours = hours or self.window_hours
        end = datetime.now(timezone.utc)
        start = end - timedelta(hours=hours)

        # The Analytics API only accepts ISO datetimes in the form YYYY-MM-DDTHH:MM:SSZ
        # (no microseconds, no numeric offset).
        ts_fmt = "%Y-%m-%dT%H:%M:%SZ"
        params = {
            "sql": " ".join(sql.split()),
            "iso_timestamp_start": start.strftime(ts_fmt),
            "iso_timestamp_end": end.strftime(ts_fmt),
        }
        url = (
            f"{MANAGEMENT_API}/projects/{self.project_ref}/analytics/endpoints/logs.all?"
            + urllib.parse.urlencode(params)
        )
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {self.pat}",
                "Accept": "application/json",
                # A non-default User-Agent is required; Cloudflare blocks urllib's default
                # signature with a 1010 error.
                "User-Agent": "supabase-log-assistant/1.0",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "ignore")
            raise RuntimeError(f"Analytics API HTTP {e.code}: {body[:300]}")
        except urllib.error.URLError as e:
            raise RuntimeError(f"Analytics API connection error: {e}")

        if isinstance(payload, dict):
            if payload.get("error"):
                raise RuntimeError(f"Analytics API error: {payload['error']}")
            return payload.get("result", []) or []
        return payload or []

    # ----------------------------------------------------------- normalization

    @staticmethod
    def _ts_to_iso(ts: Any) -> str:
        try:
            if isinstance(ts, (int, float)):
                # Logflare timestamps are microseconds since epoch.
                return datetime.fromtimestamp(ts / 1_000_000, tz=timezone.utc).isoformat()
        except Exception:
            pass
        return str(ts)

    @staticmethod
    def _bucket_status(code: Any) -> str:
        try:
            c = int(code)
        except (TypeError, ValueError):
            return "INFO"
        if c >= 500:
            return "ERROR"
        if c >= 400:
            return "WARNING"
        return "INFO"

    @staticmethod
    def _normalize_pg_severity(sev: Any) -> str:
        s = (sev or "").upper()
        if s in ("ERROR", "FATAL", "PANIC"):
            return "ERROR"
        if s == "WARNING":
            return "WARNING"
        if s.startswith("DEBUG"):
            return "DEBUG"
        return "INFO"

    @staticmethod
    def _normalize_auth_level(lvl: Any) -> str:
        s = (lvl or "").upper()
        if s in ("ERROR", "FATAL", "PANIC"):
            return "ERROR"
        if s in ("WARN", "WARNING"):
            return "WARNING"
        if s == "DEBUG":
            return "DEBUG"
        return "INFO"

    def _normalize_row(self, source: str, row: Dict[str, Any]) -> Dict[str, Any]:
        cfg = SOURCE_CONFIG[source]
        level_from = cfg["level_from"]
        if level_from == "status":
            level = self._bucket_status(row.get("status_code"))
        elif level_from == "severity":
            level = self._normalize_pg_severity(row.get("error_severity"))
        elif level_from == "authlevel":
            level = self._normalize_auth_level(row.get("level"))
        else:
            level = "INFO"

        metadata = {k: v for k, v in row.items() if k not in CORE_FIELDS and v is not None}

        return {
            "id": row.get("id"),
            "created_at": self._ts_to_iso(row.get("timestamp")),
            "level": level,
            "service": cfg["label"],
            "source": source,
            "message": row.get("event_message", "") or "",
            "metadata": metadata,
        }

    # --------------------------------------------------------------- log pool

    def _fetch_pool(self, per_source: int = 200, hours: Optional[int] = None,
                    force: bool = False) -> List[Dict[str, Any]]:
        """Fetch + normalize recent logs across the selected sources (cached)."""
        hours = hours or self.window_hours
        key = (tuple(self.sources), per_source, hours)
        if not force and self._pool_cache is not None and self._pool_cache_key == key:
            return self._pool_cache

        pool: List[Dict[str, Any]] = []
        for source in self.sources:
            cfg = SOURCE_CONFIG.get(source)
            if not cfg:
                logger.warning(f"Unknown log source '{source}' skipped.")
                continue

            base_sql = cfg["sql"].strip().rstrip(";")
            rich_sql = f"{base_sql} order by timestamp desc limit {int(per_source)}"
            try:
                rows = self._run_analytics_sql(rich_sql, hours=hours)
            except Exception as e:
                # Schemas vary across projects/plans; fall back to the always-present columns.
                logger.error(f"Source '{source}' rich query failed ({e}); trying minimal query.")
                minimal_sql = (
                    f"select id, timestamp, event_message from {source} "
                    f"order by timestamp desc limit {int(per_source)}"
                )
                try:
                    rows = self._run_analytics_sql(minimal_sql, hours=hours)
                except Exception as e2:
                    logger.error(f"Source '{source}' minimal query also failed: {e2}")
                    rows = []

            for r in rows:
                pool.append(self._normalize_row(source, r))

        pool.sort(key=lambda x: x.get("created_at") or "", reverse=True)
        self._pool_cache = pool
        self._pool_cache_key = key
        return pool

    # ----------------------------------------------------------- public reads

    def fetch_logs(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Return the most recent normalized logs across selected sources."""
        pool = self._fetch_pool()
        return pool[offset:offset + limit]

    def get_logs_by_level(self, level: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Filter the recent log pool by normalized severity level."""
        level = (level or "").upper()
        pool = self._fetch_pool()
        return [l for l in pool if l["level"] == level][:limit]

    def search_logs(self, keyword: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Keyword search across message, service, and metadata of recent logs."""
        kw = (keyword or "").lower()
        pool = self._fetch_pool()
        out: List[Dict[str, Any]] = []
        for l in pool:
            haystack = (
                f"{l['message']} {l['service']} {json.dumps(l['metadata'], default=str)}"
            ).lower()
            if kw in haystack:
                out.append(l)
            if len(out) >= limit:
                break
        return out

    def get_analytics_summary(self) -> Dict[str, Any]:
        """Aggregate metrics (levels, per-source volume, error rate) over recent logs."""
        pool = self._fetch_pool()
        return self._calculate_aggregates(pool)

    def _calculate_aggregates(self, rows: List[Dict[str, Any]]) -> Dict[str, Any]:
        levels: Dict[str, int] = {}
        services: Dict[str, int] = {}
        hourly: Dict[str, int] = {}
        total = len(rows)

        for r in rows:
            lvl = r.get("level", "INFO")
            svc = r.get("service", "unknown")
            created = r.get("created_at")

            levels[lvl] = levels.get(lvl, 0) + 1
            services[svc] = services.get(svc, 0) + 1

            if created:
                try:
                    dt = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
                    hour = dt.strftime("%H:00")
                    hourly[hour] = hourly.get(hour, 0) + 1
                except Exception:
                    pass

        error_rate = 0.0
        if total > 0:
            errors = levels.get("ERROR", 0) + levels.get("CRITICAL", 0)
            error_rate = round((errors / total) * 100, 2)

        return {
            "total_logs": total,
            "level_counts": levels,
            "service_counts": services,
            "hourly_counts": hourly,
            "error_rate_percentage": error_rate,
        }

    def execute_raw_query(self, sql_query: str) -> Tuple[List[Dict[str, Any]], str]:
        """
        Run a custom read-only Logflare/BigQuery SQL statement against the project logs.
        Returns (results, execution_message). SELECT/WITH statements only.
        """
        clean_query = (sql_query or "").strip().rstrip(";")
        if not clean_query.lower().startswith(("select", "with")):
            return [], "Error: Only read-only SELECT/WITH queries are allowed."

        forbidden = ["insert", "update", "delete", "drop", "alter", "truncate", "create", "grant", "merge"]
        for f in forbidden:
            if re.search(rf"\b{f}\b", clean_query.lower()):
                return [], f"Error: Write/DDL command '{f}' is prohibited."

        try:
            rows = self._run_analytics_sql(clean_query)
            return rows, f"Success: Query returned {len(rows)} records."
        except Exception as e:
            return [], f"Analytics Query Error: {e}"

    # ----------------------------------------------------------- write (n/a)

    def insert_logs(self, logs: List[Dict[str, Any]]) -> bool:
        """Platform logs are read-only; insertion is not supported."""
        logger.warning("insert_logs is a no-op: Supabase platform logs are read-only.")
        return False
