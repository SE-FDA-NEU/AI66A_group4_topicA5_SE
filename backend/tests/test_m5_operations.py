"""M5 production checks use temporary files and a disposable SQLite session."""
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.frontend import mount_frontend


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