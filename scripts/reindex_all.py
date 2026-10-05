#!/usr/bin/env python3
"""
scripts/reindex_all.py

IndexNow sweep runner for Ānvīkṣikī Journal.

Asks the production site to submit sitemap URLs to IndexNow (Bing, Yandex,
Seznam, Naver). The URL list is always built server-side from /sitemap.xml, so
only canonical, indexable pages are ever submitted.

  --scope changed   (default) URLs whose sitemap lastmod changed in the window
  --scope all       every sitemap URL; use once after a site-wide change

Google is not contacted: the Google Indexing API is only permitted for
JobPosting and BroadcastEvent pages, and Google discovers journal pages through
the sitemap submitted in Search Console.

The endpoint requires the site's CRON_SECRET (sent as a Bearer token).

Usage:
  python scripts/reindex_all.py --secret "$CRON_SECRET"
  python scripts/reindex_all.py --secret "$CRON_SECRET" --scope all
  python scripts/reindex_all.py --dry-run
"""

import argparse
import json
import os
import sys
import urllib.error
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
DEFAULT_USER_AGENT = "AnvikshikiJournal-BatchReindexer/2.0"


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


def request_reindex(base_url: str, secret: str, scope: str, dry_run: bool = False) -> bool:
    endpoint = f"{base_url.rstrip('/')}/api/seo/reindex"
    print(f"\n[*] Requesting IndexNow sweep (scope={scope}) from {endpoint}...")
    if dry_run:
        print("  [DRY-RUN] Reindex request not sent.")
        return True
    if not secret:
        print("[!] --secret (the site's CRON_SECRET) is required; the endpoint rejects anonymous calls.", file=sys.stderr)
        return False

    req = urllib.request.Request(
        endpoint,
        data=json.dumps({"scope": scope}).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "User-Agent": DEFAULT_USER_AGENT,
            "Authorization": f"Bearer {secret}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"  [+] {data.get('message', 'Completed')}")
            print(f"      IndexNow: {data.get('indexNow', {})}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"  [!] Reindex endpoint returned HTTP {e.code}: {body}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"  [!] Reindex request failed: {e}", file=sys.stderr)
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Ānvīkṣikī Journal IndexNow sweep runner")
    parser.add_argument("--host", default=DEFAULT_HOST, help="Base URL (default: https://anvikshikijournal.in)")
    parser.add_argument(
        "--secret",
        default=os.environ.get("CRON_SECRET", ""),
        help="The site's CRON_SECRET (defaults to the CRON_SECRET environment variable)",
    )
    parser.add_argument("--scope", choices=["changed", "all"], default="changed", help="Which sitemap URLs to submit")
    parser.add_argument("--dry-run", action="store_true", help="List sitemap URLs without requesting a sweep")
    args = parser.parse_args()

    print("=" * 65)
    print(" Ānvīkṣikī Journal — IndexNow sweep")
    print("=" * 65)

    urls = fetch_sitemap_urls(args.host)
    if urls:
        print(f"[+] The sitemap currently lists {len(urls)} URLs:")
        for idx, u in enumerate(urls, start=1):
            print(f"  [{idx:2d}/{len(urls)}] {u}")

    ok = request_reindex(args.host, args.secret, args.scope, dry_run=args.dry_run)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
