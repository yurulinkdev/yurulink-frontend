#!/usr/bin/env python3
"""Wait for a specific Git SHA to finish deploying on Cloudflare Pages.

Read-only. Requires CLOUDFLARE_PAGES_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--project", default="yurulink-frontend")
    p.add_argument("--branch", required=True)
    p.add_argument("--sha", required=True)
    p.add_argument("--environment", choices=("preview", "production"), required=True)
    p.add_argument("--timeout", type=int, default=600)
    p.add_argument("--interval", type=int, default=15)
    args = p.parse_args()
    if not 1 <= args.interval <= 120 or not 1 <= args.timeout <= 3600:
        p.error("interval must be 1..120 and timeout 1..3600 seconds")
    if not (len(args.sha) == 40 and all(c in "0123456789abcdef" for c in args.sha.lower())):
        p.error("sha must be a full 40-character commit hash")
    token = os.environ.get("CLOUDFLARE_PAGES_API_TOKEN")
    account = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
    if not token or not account:
        print("Missing CLOUDFLARE_PAGES_API_TOKEN or CLOUDFLARE_ACCOUNT_ID", file=sys.stderr)
        return 2
    url = ("https://api.cloudflare.com/client/v4/accounts/"
           + urllib.parse.quote(account, safe="")
           + "/pages/projects/" + urllib.parse.quote(args.project, safe="")
           + "/deployments")
    deadline = time.monotonic() + args.timeout
    attempt = 0
    while True:
        attempt += 1
        req = urllib.request.Request(url, headers={"Authorization": "Bearer " + token})
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                data = json.load(response)
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            print(f"Attempt {attempt}: API request failed: {type(exc).__name__}", flush=True)
            return 2
        if data.get("success") is not True:
            print("Cloudflare API returned success=false", flush=True)
            return 2
        matches = [
            d for d in data.get("result", [])
            if d.get("deployment_trigger", {}).get("metadata", {}).get("commit_hash") == args.sha
            and d.get("deployment_trigger", {}).get("metadata", {}).get("branch") == args.branch
            and d.get("environment") == args.environment
        ]
        if matches:
            deployment = matches[0]
            stages = deployment.get("stages") or []
            last = stages[-1].get("status") if stages else "unknown"
            print(f"Attempt {attempt}: deployment={deployment.get('id')} stage={last}", flush=True)
            if last == "success":
                print(f"DEPLOYMENT_URL={deployment.get('url', '')}", flush=True)
                return 0
            if last in ("failure", "failed", "canceled", "cancelled"):
                print("Target deployment failed", file=sys.stderr)
                return 1
        else:
            print(f"Attempt {attempt}: matching deployment not visible yet", flush=True)
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            print("Timed out waiting for exact SHA/branch/environment", file=sys.stderr)
            return 1
        time.sleep(min(args.interval, remaining))


if __name__ == "__main__":
    sys.exit(main())
