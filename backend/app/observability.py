"""Structured request metadata only: no URL values, query, body or credentials."""
import json
import logging
import os
import re
import time
import uuid

logger = logging.getLogger("credit.requests")


def request_record(method, route, status, duration_ms, request_id):
    return json.dumps({"event": "http_request", "method": method, "route": route,
                       "status": status, "duration_ms": round(duration_ms, 2), "request_id": request_id})


def install_request_logging(app):
    @app.middleware("http")
    async def request_metadata(request, call_next):
        started = time.perf_counter()
        request_id = uuid.uuid4().hex
        status = 500
        try:
            response = await call_next(request)
            status = response.status_code
            response.headers["X-Request-ID"] = request_id
            revision = os.environ.get("RENDER_GIT_COMMIT", "")
            if re.fullmatch(r"[0-9a-f]{40}", revision):
                response.headers["X-App-Commit"] = revision
            return response
        except Exception:
            # Avoid server tracebacks containing request data or SQL values.
            from fastapi.responses import JSONResponse

            return JSONResponse(status_code=500, headers={"X-Request-ID": request_id},
                                content={"detail": "The server had a problem. Try again or ask your manager for help."})
        finally:
            route = getattr(request.scope.get("route"), "path", None)
            # Mount paths/static filenames and unmatched paths can contain user data.
            route = route if route and "{" not in route and route in ("/health", "/", "/favicon.ico") else (
                route if route and route.startswith("/api/") and "{path" not in route else "unmatched_or_frontend")
            logger.info(request_record(request.method, route, status,
                                       (time.perf_counter() - started) * 1000, request_id))
