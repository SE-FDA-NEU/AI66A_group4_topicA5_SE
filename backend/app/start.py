"""Render entry point: validation, additive schema/optional seed, ASGI server."""
import logging
import os

import uvicorn


def main():
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    # main.lifespan performs the schema/seed work; do not do it twice here.
    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.environ.get("PORT", "10000")),
                access_log=False, proxy_headers=True, forwarded_allow_ips="127.0.0.1")


if __name__ == "__main__":
    main()
