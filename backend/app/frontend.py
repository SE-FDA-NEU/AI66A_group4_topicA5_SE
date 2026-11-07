"""Serve Vite's built SPA without turning unknown API/asset requests into HTML."""
from pathlib import Path

from starlette.exceptions import HTTPException
from starlette.staticfiles import StaticFiles


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        path = path.replace("\\", "/")
        if path == ".":
            path = ""
        if any(part.startswith(".") for part in path.split("/")):
            raise HTTPException(404)
        if path == "api" or path.startswith("api/"):
            raise HTTPException(404)
        try:
            return await super().get_response(path, scope)
        except HTTPException as error:
            if error.status_code != 404 or path.startswith("assets/") or Path(path).suffix:
                raise
            return await super().get_response("index.html", scope)


def mount_frontend(app, directory):
    app.mount("/", SPAStaticFiles(directory=directory, html=True), name="frontend")