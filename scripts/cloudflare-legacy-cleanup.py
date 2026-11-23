#!/usr/bin/env python3
"""Delete ONLY the retired standalone YuruLink Staging Cloudflare Pages project.

Called by a narrowly gated, manual-intent GitHub Actions request. Never touch DNS,
Cloudflare API tokens, or the active unified 'yurulink-frontend' project.
Cloudflare known issue: project deletion may fail with >100 deployments.
"""
import concurrent.futures
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ACTIVE = "yurulink-frontend"
LEGACY = "yurulink-frontend-staging"
API_ROOT = "https://api.cloudflare.com/client/v4"
TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN", "")
ACCOUNT = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
REPORT_DIR = Path("maintenance-report")
REPORT_DIR.mkdir(exist_ok=True)


class ApiError(Exception):
    def __init__(self, status, message):
        self.status = status
        super().__init__(message)


def call(method, path, *, query=None, allow_missing=False):
    if query:
        path = path + "?" + urllib.parse.urlencode(query)
    url = API_ROOT + path
    for attempt in range(6):
        request = urllib.request.Request(
            url, headers={
                "Authorization": "Bearer " + TOKEN,
                "Content-Type": "application/json",
                "User-Agent": "YuruLink-safe-legacy-cleanup/1.0",
            }, method=method)
        try:
            with urllib.request.urlopen(request, timeout=35) as response:
                status = response.status
                body = response.read()
        except urllib.error.HTTPError as exc:
            status, body = exc.code, exc.read()
        except Exception as exc:
            if attempt < 5:
                time.sleep(min(2 ** attempt, 20))
                continue
            raise ApiError(0, "network failure: " + type(exc).__name__) from exc
        if status == 404 and allow_missing:
            return None
        if status in (429, 500, 502, 503, 504) and attempt < 5:
            time.sleep(min(2 ** attempt, 20))
            continue
        try:
            parsed = json.loads(body.decode("utf-8")) if body else {"success": True, "result": None}
        except ValueError:
            parsed = {}
        if 200 <= status < 300 and parsed.get("success") is True:
            return parsed
        errors = parsed.get("errors", []) if isinstance(parsed, dict) else []
        reason = ", ".join(str(item.get("code", "?")) + ":" + str(item.get("message", ""))[:150]
                           for item in errors[:2] if isinstance(item, dict))
        raise ApiError(status, ("Cloudflare HTTP " + str(status) + " / " + reason)[:400])
    raise ApiError(0, "maximum retries exceeded")


def project(name):
    result = call("GET", "/accounts/" + ACCOUNT + "/pages/projects/" + name)
    return result["result"]


def deployment_page():
    result = call("GET", "/accounts/" + ACCOUNT + "/pages/projects/" + LEGACY +
                  "/deployments", query={"page": 1, "per_page": 100})
    return result.get("result") or [], result.get("result_info") or {}


def delete_deployment(deployment_id):
    if not re.fullmatch(r"[0-9a-fA-F-]{36}", deployment_id):
        raise ValueError("Unexpected deployment ID format; refusing delete")
    path = "/accounts/" + ACCOUNT + "/pages/projects/" + LEGACY + "/deployments/" + deployment_id
    try:
        call("DELETE", path, query={"force": "true"}, allow_missing=True)
        return "deleted"
    except ApiError as exc:
        if "active production deployment" in str(exc).lower():
            return "protected"
        raise


def main():
    if not TOKEN or not re.fullmatch(r"[0-9a-f]{32}", ACCOUNT):
        raise ValueError("Cloudflare authentication is not available")
    if os.environ.get("CONFIRM_LEGACY_PROJECT") != LEGACY:
        raise ValueError("Exact legacy project confirmation is missing")
    if os.environ.get("GITHUB_REF") != "refs/heads/main":
        raise ValueError("Cleanup must run from protected main branch")
    current, old = project(ACTIVE), project(LEGACY)
    if current.get("name") != ACTIVE or old.get("name") != LEGACY:
        raise ValueError("Project identity mismatch")
    if not current.get("id") or not old.get("id") or current["id"] == old["id"]:
        raise ValueError("Active and legacy projects must have distinct IDs")
    if current.get("subdomain") != ACTIVE + ".pages.dev":
        raise ValueError("Active production project subdomain mismatch")
    if old.get("subdomain") != LEGACY + ".pages.dev":
        raise ValueError("Legacy subdomain mismatch")
    domains = old.get("domains") or []
    if set(domains) - {LEGACY + ".pages.dev"}:
        raise ValueError("Legacy project has unexpected custom domain(s); refuse deletion")
    print("Safety gate passed: active project remains " + ACTIVE +
          "; only legacy project " + LEGACY + " can be deleted")
    entries, info = deployment_page()
    total = info.get("total_count")
    if not isinstance(total, int):
        raise ValueError("Cloudflare deployment total_count missing")
    active_ids = set()
    for k in ("canonical_deployment", "production_deployment"):
        value = old.get(k)
        if isinstance(value, dict) and value.get("id"):
            active_ids.add(value["id"])
    report = {"project": LEGACY, "legacy_project_id": old["id"],
              "protected_active_project": ACTIVE, "active_project_id": current["id"],
              "legacy_domains": domains, "deployments_before": total,
              "active_deployment_ids": sorted(active_ids), "deleted_history": 0}
    (REPORT_DIR / "predelete.json").write_text(json.dumps(report, indent=2) + "\n")
    print("Legacy deployment count before cleanup:", total)
    protected = set(active_ids)
    deleted = 0
    for round_no in range(1, 35):
        entries, info = deployment_page()
        total = info.get("total_count", len(entries))
        if total <= 80:
            print("History reduced to", total, "deployments; ready to delete project")
            break
        choices = [d["id"] for d in entries if d.get("id") not in protected]
        choices = [v for v in choices if isinstance(v, str) and re.fullmatch(r"[0-9a-fA-F-]{36}", v)]
        choices = choices[:min(99, max(1, total - 75))]
        if not choices:
            raise RuntimeError("No safe deployments left to remove")
        success = 0
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(delete_deployment, did): did for did in choices}
            for future in concurrent.futures.as_completed(futures):
                did = futures[future]
                try:
                    outcome = future.result()
                except Exception as exc:
                    print("Deployment cleanup failed, aborting:", type(exc).__name__, str(exc)[:200])
                    raise
                if outcome == "deleted":
                    success += 1
                elif outcome == "protected":
                    protected.add(did)
        deleted += success
        print("History cleanup round", round_no, "deleted", success, "entries")
        if success == 0:
            raise RuntimeError("No progress: refusing indefinite cleanup")
        time.sleep(0.5)
    else:
        raise RuntimeError("Exceeded history cleanup round limit")

    report["deleted_history"] = deleted
    report["deployments_before_project_delete"] = total
    (REPORT_DIR / "predelete.json").write_text(json.dumps(report, indent=2) + "\n")
    print("Deleting retired Pages project (not active project) ...")
    call("DELETE", "/accounts/" + ACCOUNT + "/pages/projects/" + LEGACY)
    old_after = call("GET", "/accounts/" + ACCOUNT + "/pages/projects/" + LEGACY,
                     allow_missing=True)
    active_after = project(ACTIVE)
    if old_after is not None or active_after.get("id") != current["id"]:
        raise RuntimeError("Deletion verification failed")
    report["legacy_project_deleted"] = True
    report["active_project_preserved"] = True
    (REPORT_DIR / "result.json").write_text(json.dumps(report, indent=2) + "\n")
    print("SUCCESS: retired project deleted. Active production Pages project preserved.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("Cleanup stopped:", type(exc).__name__, str(exc)[:300], file=sys.stderr)
        raise
