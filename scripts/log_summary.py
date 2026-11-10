"""Summarize the two monitoring metrics from exported JSON request logs."""
import argparse
import json
import math
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("log", type=Path)
    args = parser.parse_args()
    records = []
    for line in args.log.read_text(encoding="utf-8").splitlines():
        try:
            record = json.loads(line[line.index("{"):])
            if record.get("event") == "http_request":
                records.append(record)
        except (ValueError, TypeError):
            continue
    if not records:
        raise SystemExit("No structured request records in this export.")
    durations = sorted(float(r["duration_ms"]) for r in records)
    print(json.dumps({"requests":len(records),
        "error_rate_percent":round(100*sum(r["status"]>=500 for r in records)/len(records),2),
        "response_time_p95_ms":durations[math.ceil(.95*len(durations))-1]}))


if __name__ == "__main__":
    main()
