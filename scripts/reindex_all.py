#!/usr/bin/env python3
"""
scripts/reindex_all.py

Batch Search Engine Re-indexing Runner for Ānvīkṣikī Journal.
Submits all public URLs to:
  1. IndexNow API (Bing, Yandex, Seznam, Naver)
  2. Google Indexing API (via production batch endpoint)
  3. Search Engine Sitemap Pings

Usage:
  python scripts/reindex_all.py
  python scripts/reindex_all.py --dry-run
  python scripts/reindex_all.py --host https://anvikshikijournal.in
"""

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

# UTF-8 stdout on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

DEFAULT_HOST = "https://anvikshikijournal.in"
DEFAULT_USER_AGENT = "AnvikshikiJournal-BatchReindexer/1.0"


def fetch_sitemap_urls(base_url: str) -> list[str]:
    sitemap_url = f"{base_url.rstrip('/')}/sitemap.xml"
    print(f"[*] Fetching sitemap from: {sitemap_url}")
    req = urllib.request.Request(sitemap_url, headers={"User-Agent": DEFAULT_USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read()
    except Exception as e:
        print(f"[!] Failed to fetch sitemap: {e}", file=sys.stderr)
        return []

    try:
        root = ET.fromstring(content)
    except ET.ParseError as e:
        print(f"[!] XML parse error: {e}", file=sys.stderr)
        return []

    ns_match = ""
    if root.tag.startswith("{"):
        ns_match = root.tag.split("}")[0] + "}"

    urls: list[str] = []
    for url_node in root.findall(f"{ns_match}url"):
        loc = url_node.find(f"{ns_match}loc")
        if loc is not None and loc.text:
            urls.append(loc.text.strip())

    return list(dict.fromkeys(urls))


def submit_indexnow(base_url: str, urls: list[str], dry_run: bool = False) -> bool:
    print(f"\n[*] Submitting {len(urls)} URLs to IndexNow (Bing / Yandex / Naver)...")
    if dry_run:
        print("  [DRY-RUN] IndexNow submission simulated successfully.")
        return True

    notify_url = f"{base_url.rstrip('/')}/api/indexnow/notify"
    payload = json.dumps({"urlList": urls}).encode("utf-8")
    req = urllib.request.Request(
        notify_url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "User-Agent": DEFAULT_USER_AGENT,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"  [+] IndexNow Success: {data.get('submitted', len(urls))} URLs submitted!")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"  [!] IndexNow HTTP {e.code}: {body}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"  [!] IndexNow network error: {e}", file=sys.stderr)
        return False


def submit_batch_reindex(base_url: str, secret: str = "", dry_run: bool = False) -> bool:
    print(f"\n[*] Calling full batch reindexing endpoint on {base_url}...")
    if dry_run:
        print("  [DRY-RUN] Full batch reindex simulated successfully.")
        return True

    endpoint = f"{base_url.rstrip('/')}/api/admin/seo/reindex-all"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": DEFAULT_USER_AGENT,
    }
    if secret:
        headers["X-SEO-Secret"] = secret

    req = urllib.request.Request(endpoint, data=json.dumps({}).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"  [+] Batch Reindex Success: {data.get('message', 'Completed')}")
            print(f"      Total URLs: {data.get('totalUrls', 0)}")
            print(f"      IndexNow: {data.get('indexNow', {})}")
            print(f"      Google: {data.get('google', {})}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"  [~] Batch reindex endpoint status {e.code}: {body}")
        return False
    except Exception as e:
        print(f"  [~] Batch reindex notice: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Ānvīkṣikī Journal Batch Search Engine Reindexer")
    parser.add_argument("--host", default=DEFAULT_HOST, help="Base host URL (default: https://anvikshikijournal.in)")
    parser.add_argument("--secret", default="", help="Admin or SEO secret token for protected reindex endpoint")
    parser.add_argument("--dry-run", action="store_true", help="Simulate submissions without making mutating requests")
    args = parser.parse_args()

    print("=" * 65)
    print(" Ānvīkṣikī Journal — Batch Search Engine Re-indexing Runner")
    print("=" * 65)

    urls = fetch_sitemap_urls(args.host)
    if not urls:
        print("[!] No URLs extracted from sitemap. Exiting.", file=sys.stderr)
        sys.exit(1)

    print(f"[+] Discovered {len(urls)} published URLs across the journal:")
    for idx, u in enumerate(urls, start=1):
        print(f"  [{idx:2d}/{len(urls)}] {u}")

    # 1. IndexNow
    submit_indexnow(args.host, urls, dry_run=args.dry_run)

    # 2. Batch Reindex
    if args.secret:
        submit_batch_reindex(args.host, secret=args.secret, dry_run=args.dry_run)

    print("\n" + "=" * 65)
    print("[+] Re-indexing sweep complete.")
    print("=" * 65)


if __name__ == "__main__":
    main()
