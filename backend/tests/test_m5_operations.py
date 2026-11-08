"""M5 production checks use temporary files and a disposable SQLite session."""
import json
import logging
from types import SimpleNamespace

import pytest
from cryptography.fernet import Fernet
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.database import get_db
from app.deployment import normalize_database_url, validate_production
from app.frontend import mount_frontend
from app.main import app
from app.observability import install_request_logging


def test_spa_serves_root_and_reloaded_routes_without_exposing_api_or_missing_assets(tmp_path):
    (tmp_path / "index.html").write_text("<html><body>App shell</body></html>")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets/app.js").write_text("console.log('built')")
    web = FastAPI()
    mount_frontend(web, str(tmp_path))
    with TestClient(web) as client:
        for path in ("/", "/dashboard", "/loan-applications", "/loan-applications/known-id"):
            response = client.get(path)
            assert response.status_code == 200 and "App shell" in response.text
        assert client.get("/assets/app.js").status_code == 200
        for path in ("/api/missing", "/api", "/assets/missing.js", "/missing.css", "/..%2F..%2F.env"):
            response = client.get(path)
            assert response.status_code == 404 and "App shell" not in response.text


def test_health_checks_the_database_and_returns_503_without_leaking_details(client):
    assert client.get("/health").status_code == 200

    class FailedDatabase:
        def execute(self, statement):
            raise OperationalError("private database URI", {}, RuntimeError("private password"))

    app.dependency_overrides[get_db] = lambda: FailedDatabase()
    response = client.get("/health")
    assert response.status_code == 503
    assert response.json() == {"status":"unavailable"}
    assert "private" not in response.text
    assert response.headers["cache-control"] == "no-store"


def test_logs_keep_route_status_latency_but_not_credentials_query_or_body(caplog):
    web = FastAPI()

    @web.post("/api/example/{item_id}")
    def endpoint(item_id: str):
        return {"ok":True}

    install_request_logging(web)
    with caplog.at_level(logging.INFO, logger="credit.requests"), TestClient(web) as client:
        response = client.post("/api/example/private-id?token=private-query", json={"password":"private-body"},
                               headers={"Authorization":"Bearer private-token"})
    record = json.loads(next(r.message for r in caplog.records if r.name == "credit.requests"))
    assert record["route"] == "/api/example/{item_id}" and record["status"] == 200
    assert record["duration_ms"] >= 0 and record["request_id"] == response.headers["x-request-id"]
    assert not any(secret in json.dumps(record) for secret in ("private-id","private-query","private-body","private-token"))


def valid_settings(tmp_path):
    (tmp_path / "index.html").write_text("app")
    return SimpleNamespace(APP_ENV="production", DATABASE_URL="postgresql://host/demo?sslmode=require",
                           JWT_SECRET="x" * 48, DATA_ENCRYPTION_KEY=Fernet.generate_key().decode(),
                           STATIC_DIR=str(tmp_path))


@pytest.mark.parametrize("name,value", [("DATABASE_URL","sqlite:///ephemeral.db"),
    ("JWT_SECRET","dev-only-change-me"), ("DATA_ENCRYPTION_KEY","invalid"), ("STATIC_DIR","")])
def test_production_refuses_ephemeral_data_or_missing_secrets_and_build(tmp_path, name, value):
    settings = valid_settings(tmp_path)
    setattr(settings, name, value)
    with pytest.raises(RuntimeError):
        validate_production(settings)


def test_production_accepts_complete_configuration_and_normalizes_pg_urls(tmp_path):
    validate_production(valid_settings(tmp_path))
    for prefix in ("postgres://", "postgresql://"):
        assert normalize_database_url(prefix + "host/db?sslmode=require") == "postgresql+psycopg://host/db?sslmode=require"
