"""Read-only public HTTPS health check; suitable for an external monitor."""
import argparse
import json
import os
import time
import urllib.error
import urllib.request


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=os.environ.get("PUBLIC_APP_URL", ""))
    parser.add_argument("--expect-commit")
    parser.add_argument("--allow-local", action="store_true")
    args = parser.parse_args()
    if not args.url.startswith("https://") and not (args.allow_local and args.url.startswith("http://127.0.0.1:")):
        raise SystemExit("Set PUBLIC_APP_URL to the public HTTPS app URL.")
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(args.url.rstrip("/") + "/health", timeout=90) as response:
            data = json.load(response)
            assert response.status == 200 and data.get("status") == "ok", "Unhealthy response"
            revision = response.headers.get("X-App-Commit")
            if args.expect_commit:
                assert revision == args.expect_commit, "Deployed commit does not match release"
    except (urllib.error.URLError, TimeoutError, AssertionError, ValueError) as error:
        raise SystemExit(f"Health check failed ({type(error).__name__}); inspect platform logs.") from None
    print(json.dumps({"health":"ok","elapsed_ms":round((time.perf_counter()-started)*1000,2),"commit":revision}))


if __name__ == "__main__":
    main()
