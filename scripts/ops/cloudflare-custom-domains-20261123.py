#!/usr/bin/env python3
"""One-time, fixed-scope Cloudflare Pages custom domain setup for YuruLink.

Driven only by ops/requests/cloudflare-domains-20261123.json on the main branch.
No arbitrary hostnames, record types, or user-provided API paths are accepted.
"""
import base64
import datetime
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.cloudflare.com/client/v4"
PROJECT = "yurulink-frontend"
ZONE_NAME = "yurulink.com"
EXPECTED = {
    "www.yurulink.com": "yurulink-frontend.pages.dev",
    "staging.yurulink.com": "staging.yurulink-frontend.pages.dev",
}
REQUEST = "ops/requests/cloudflare-domains-20261123.json"
REPORT = "ops/reports/cloudflare-domains-20261123.json"
REPORT_BRANCH = "ops/cloudflare-domain-status-20261123"
GITHUB_REPO = "yurulinkdev/yurulink-frontend"


def api(method, path, token, data=None):
    if not token:
        raise RuntimeError("Required Cloudflare token is absent")
    payload = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(
        API + path, data=payload, method=method,
        headers={"Authorization": "Bearer " + token,
                 "Content-Type": "application/json", "User-Agent": "YuruLink-domain-setup/1"},
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            result = json.load(resp)
    except urllib.error.HTTPError as ex:
        try:
            error = json.loads(ex.read().decode("utf-8"))
            codes = [str(e.get("code")) for e in error.get("errors", [])]
        except Exception:
            codes = []
        raise RuntimeError("Cloudflare HTTP " + str(ex.code) + " on " + method + " " + path.split("?")[0] + "; error codes: " + ",".join(codes)) from None
    if not result.get("success"):
        codes = [str(e.get("code")) for e in result.get("errors", [])]
        raise RuntimeError("Cloudflare API error on " + method + " " + path.split("?")[0] + "; codes: " + ",".join(codes))
    return result.get("result")


def read_dns(zone, hostname, token):
    query = urllib.parse.urlencode({"name": hostname, "per_page": "100"})
    result = api("GET", "/zones/" + zone + "/dns_records?" + query, token)
    if not isinstance(result, list):
        raise RuntimeError("Unexpected DNS list response")
    return [r for r in result if r.get("name", "").rstrip(".").lower() == hostname]


def dns_summary(records):
    return [
        {"id": r.get("id"), "type": r.get("type"), "name": r.get("name"),
         "content": r.get("content"), "proxied": r.get("proxied"), "locked": r.get("locked")}
        for r in records
    ]


def safe_record_check(host, rows):
    allowed = {EXPECTED[host], "yurulink-frontend.pages.dev"} if host.startswith("staging.") else {EXPECTED[host]}
    # Avoid destructively overwriting unrelated DNS, including A/AAAA, TXT, and third-party CNAME.
    for r in rows:
        if r.get("type") != "CNAME" or r.get("content", "").rstrip(".").lower() not in allowed:
            raise RuntimeError("Conflicting DNS record on " + host + "; operation stopped")
    if len(rows) > 1:
        raise RuntimeError("Multiple DNS records on " + host + "; operation stopped")



def probe_host(host):
    """Public HTTPS verification; no authentication, no external redirects trusted."""
    result = {"hostname": host}
    try:
        req = urllib.request.Request("https://" + host + "/", headers={
            "User-Agent": "Mozilla/5.0 (compatible; YuruLinkDomainVerify/1)",
            "Accept": "text/html",
        })
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read(500_000).decode("utf-8", errors="replace")
            final_url = resp.geturl()
            result.update({
                "http_status": resp.status,
                "final_hostname": urllib.parse.urlsplit(final_url).hostname,
                "title_present": "YuruLink" in body,
                "canonical_custom_host": ('rel="canonical" href="https://' + host + '/') in body,
                "noindex": 'name="robots" content="noindex' in body,
                "expected_ogp": ("yurulink-staging.png" if host.startswith("staging.") else "yurulink-light.png") in body,
            })
    except urllib.error.HTTPError as ex:
        result["http_status"] = ex.code
        result["error"] = "HTTP " + str(ex.code)
    except Exception as ex:
        result["error"] = type(ex).__name__ + ": " + str(ex)[:180]
    return result


def github_report(report):
    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        print("REPORT_WRITE_UNAVAILABLE: missing GITHUB_TOKEN", flush=True)
        return
    uri = ("https://api.github.com/repos/" + GITHUB_REPO + "/contents/" + REPORT)
    headers = {
        "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "YuruLink-domain-setup/1",
    }
    current_sha = None
    try:
        get = urllib.request.Request(uri + "?ref=" + urllib.parse.quote(REPORT_BRANCH, safe=""), headers=headers)
        with urllib.request.urlopen(get, timeout=20) as resp:
            current_sha = json.load(resp).get("sha")
    except urllib.error.HTTPError as ex:
        if ex.code != 404:
            print("REPORT_READ_HTTP_" + str(ex.code), flush=True)
            return
    content = json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    body = {
        "message": "ops: record Cloudflare domain " + report["mode"] + " result",
        "branch": REPORT_BRANCH,
        "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
    }
    if current_sha:
        body["sha"] = current_sha
    req = urllib.request.Request(
        uri, data=json.dumps(body).encode("utf-8"), method="PUT",
        headers={**headers, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            print("REPORT_WRITTEN HTTP " + str(resp.status) + " branch=" + REPORT_BRANCH + " path=" + REPORT, flush=True)
    except urllib.error.HTTPError as ex:
        print("REPORT_WRITE_HTTP_" + str(ex.code), flush=True)


def main():
    request = json.load(open(REQUEST, encoding="utf-8"))
    if (set(request) != {"schema_version", "mode", "request_id"} or
        request["schema_version"] != 1 or request["mode"] not in {"plan", "apply"} or
        not isinstance(request["request_id"], str) or
        not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", request["request_id"])):
        raise RuntimeError("Invalid fixed-scope request JSON")
    if os.environ.get("GITHUB_REF") != "refs/heads/main":
        raise RuntimeError("Only main may run the domain setup")
    mode = request["mode"]
    report = {
        "schema_version": 1, "mode": mode, "request_id": request["request_id"],
        "time_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "state": "started", "zone": ZONE_NAME, "project": PROJECT,
        "pages": {}, "dns": {}, "actions": [],
    }
    try:
        account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
        pages_token = os.environ.get("CLOUDFLARE_PAGES_WRITE_TOKEN") or os.environ.get("CLOUDFLARE_API_TOKEN")
        dns_token = os.environ.get("CLOUDFLARE_DNS_API_TOKEN") or os.environ.get("CLOUDFLARE_API_TOKEN")
        if not re.fullmatch(r"[0-9a-f]{32}", account):
            raise RuntimeError("Missing or malformed CLOUDFLARE_ACCOUNT_ID")
        project_path = "/accounts/" + account + "/pages/projects/" + PROJECT
        project = api("GET", project_path, pages_token)
        if project.get("name") != PROJECT or project.get("production_branch") != "main":
            raise RuntimeError("Pages project/production branch mismatch")
        repo = ((project.get("source") or {}).get("config") or {}).get("repo_name")
        if repo and repo not in ("yurulink-frontend", GITHUB_REPO):
            raise RuntimeError("Pages repository mismatch")
        report["pages_project"] = {
            "name": project.get("name"), "production_branch": project.get("production_branch"),
            "source_repo": repo, "domains": project.get("domains", []),
        }
        zone = os.environ.get("CLOUDFLARE_ZONE_ID", "").strip()
        if not re.fullmatch(r"[0-9a-f]{32}", zone):
            results = api("GET", "/zones?name=" + ZONE_NAME + "&per_page=20", dns_token)
            found = [z for z in results if z.get("name") == ZONE_NAME]
            if len(found) != 1:
                raise RuntimeError("Unable to resolve exactly one yurulink.com Cloudflare zone")
            zone = found[0]["id"]
        zone_info = api("GET", "/zones/" + zone, dns_token)
        if zone_info.get("name") != ZONE_NAME:
            raise RuntimeError("Zone ID is not yurulink.com")
        report["zone_status"] = zone_info.get("status")
        if zone_info.get("status") != "active":
            raise RuntimeError("Cloudflare DNS zone is not active")
        domains = api("GET", project_path + "/domains?per_page=25", pages_token)
        if not isinstance(domains, list):
            raise RuntimeError("Unexpected Pages custom domain list")
        names = {d.get("name"): d for d in domains}
        for host in EXPECTED:
            rows = read_dns(zone, host, dns_token)
            report["dns"][host] = dns_summary(rows)
            if host in names:
                report["pages"][host] = {"status": names[host].get("status"), "validation_data": bool(names[host].get("validation_data"))}
            else:
                report["pages"][host] = {"status": "not_attached"}
            safe_record_check(host, rows)
        report["state"] = "preflight_ok"
        if mode == "plan":
            report["https"] = {host: probe_host(host) for host in EXPECTED}
            return report

        # Attach both hostnames to Pages BEFORE creating any missing CNAME.
        for host in EXPECTED:
            if host not in names:
                api("POST", project_path + "/domains", pages_token, {"name": host})
                report["actions"].append("pages_attached:" + host)

        # Cloudflare Pages commonly creates the base project CNAME automatically.
        # Use the branch-alias CNAME on staging, always with orange-cloud proxy.
        for host, target in EXPECTED.items():
            rows = read_dns(zone, host, dns_token)
            safe_record_check(host, rows)
            if not rows:
                api("POST", "/zones/" + zone + "/dns_records", dns_token,
                    {"type": "CNAME", "name": host, "content": target, "ttl": 1, "proxied": True})
                report["actions"].append("dns_created:" + host)
            elif rows[0].get("content", "").rstrip(".").lower() != target or not rows[0].get("proxied"):
                api("PATCH", "/zones/" + zone + "/dns_records/" + rows[0]["id"], dns_token,
                    {"type": "CNAME", "name": host, "content": target, "ttl": 1, "proxied": True})
                report["actions"].append("dns_updated:" + host)
            else:
                report["actions"].append("dns_unchanged:" + host)

        for host, target in EXPECTED.items():
            rows = read_dns(zone, host, dns_token)
            if len(rows) != 1 or rows[0].get("type") != "CNAME" or not rows[0].get("proxied") or rows[0].get("content", "").rstrip(".").lower() != target:
                raise RuntimeError("DNS readback mismatch for " + host)
            report["dns"][host] = dns_summary(rows)
        # Readback may show pending; provisioning/TLS are asynchronous.
        for host in EXPECTED:
            result = api("GET", project_path + "/domains/" + host, pages_token)
            report["pages"][host] = {
                "status": result.get("status"), "verification_data_present": bool(result.get("verification_data")),
            }
        report["state"] = "configured_dns_readback_ok"
        return report
    except Exception as ex:
        report["state"] = "error"
        report["error"] = str(ex)
        return report
    finally:
        # The report is intentionally limited to this domain's public config; no credentials.
        pass


if __name__ == "__main__":
    try:
        output = main()
    except Exception as ex:
        output = {"schema_version": 1, "mode": "unknown", "state": "error", "error": str(ex)}
    print(json.dumps(output, ensure_ascii=False, sort_keys=True), flush=True)
    github_report(output)
    sys.exit(0 if output.get("state") in ("preflight_ok", "configured_dns_readback_ok") else 1)
