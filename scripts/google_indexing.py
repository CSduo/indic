#!/usr/bin/env python3
"""
scripts/google_indexing.py

Automated Google Search Indexing CLI for Ānvīkṣikī Journal.
Supports:
  - Submitting single URL or all sitemap URLs to Google Indexing API
    (https://indexing.googleapis.com/v3/urlNotifications:publish)
  - Ping search engine sitemaps (Google & Bing)
  - Dry-run mode for auditing and inspection
  - Graceful fallback when credentials or optional libraries are absent

Usage Examples:
  # View help
  python scripts/google_indexing.py --help

  # Dry run to inspect extracted sitemap URLs
  python scripts/google_indexing.py --all --dry-run

  # Submit a single URL in dry-run mode
  python scripts/google_indexing.py --url "https://anvikshikijournal.in/articles/nyaya-epistemology" --dry-run

  # Ping search engine sitemaps directly without API credentials
  python scripts/google_indexing.py --ping-only

  # Submit URLs using Google Service Account credentials
  python scripts/google_indexing.py --all --credentials service_account.json
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

CANONICAL_DOMAIN = "anvikshikijournal.in"
DEFAULT_SITEMAP_URL = f"https://{CANONICAL_DOMAIN}/sitemap.xml"
GOOGLE_INDEXING_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish"
DEFAULT_USER_AGENT = "AnvikshikiJournal-GoogleIndexing-CLI/1.0"
DAILY_QUOTA_LIMIT = 200

# Optional Google Auth library
try:
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request as GoogleAuthRequest
    GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    GOOGLE_AUTH_AVAILABLE = False


def fetch_sitemap_urls(sitemap_url: str) -> list[str]:
    """
    Fetches and parses sitemap.xml, extracting all unique <loc> entries.
    Recursively resolves sitemapindex entries if found.
    """
    urls: list[str] = []
    headers = {"User-Agent": DEFAULT_USER_AGENT}
    req = urllib.request.Request(sitemap_url, headers=headers)

    print(f"[*] Fetching sitemap from: {sitemap_url}")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read()
    except Exception as e:
        print(f"[!] Error fetching sitemap {sitemap_url}: {e}", file=sys.stderr)
        return urls

    try:
        root = ET.fromstring(content)
    except ET.ParseError as e:
        print(f"[!] XML parse error: {e}", file=sys.stderr)
        return urls

    # Check for namespace (e.g. xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    ns_match = ""
    if root.tag.startswith("{"):
        ns_match = root.tag.split("}")[0] + "}"

    # Handle sitemap index
    if root.tag.endswith("sitemapindex"):
        for sm in root.findall(f"{ns_match}sitemap"):
            loc = sm.find(f"{ns_match}loc")
            if loc is not None and loc.text:
                nested_url = loc.text.strip()
                print(f"  [>] Discovered nested sitemap: {nested_url}")
                urls.extend(fetch_sitemap_urls(nested_url))
        return list(dict.fromkeys(urls))

    # Handle standard urlset
    for url_elem in root.findall(f"{ns_match}url"):
        loc = url_elem.find(f"{ns_match}loc")
        if loc is not None and loc.text:
            cleaned = loc.text.strip()
            if cleaned:
                urls.append(cleaned)

    # Deduplicate while preserving order
    return list(dict.fromkeys(urls))


def ping_search_engines(sitemap_url: str = DEFAULT_SITEMAP_URL, dry_run: bool = False) -> dict[str, bool]:
    """
    Pings Google and Bing with the sitemap location to trigger re-crawls.
    """
    encoded_sitemap = urllib.parse.quote(sitemap_url, safe="")
    targets = {
        "Google": f"https://www.google.com/ping?sitemap={encoded_sitemap}",
        "Bing": f"https://www.bing.com/ping?sitemap={encoded_sitemap}",
    }

    results: dict[str, bool] = {}
    print(f"\n[*] Pinging search engine sitemaps for: {sitemap_url}")

    for engine, ping_url in targets.items():
        if dry_run:
            print(f"  [DRY-RUN] Would GET {ping_url}")
            results[engine] = True
            continue

        try:
            req = urllib.request.Request(ping_url, headers={"User-Agent": DEFAULT_USER_AGENT})
            with urllib.request.urlopen(req, timeout=10) as resp:
                status = resp.status
                is_ok = 200 <= status < 500  # Non-5xx is acceptable
                results[engine] = is_ok
                print(f"  [+] {engine} sitemap ping: HTTP {status} ({'OK' if is_ok else 'WARN'})")
        except urllib.error.HTTPError as e:
            # Pings might return 404 or 410 if search engine endpoint has changed; non-fatal
            print(f"  [~] {engine} sitemap ping responded with HTTP {e.code} (non-fatal)")
            results[engine] = e.code < 500
        except Exception as e:
            print(f"  [-] {engine} sitemap ping error: {e}")
            results[engine] = False

    return results


def get_google_access_token(credentials_path: str | None) -> str | None:
    """
    Retrieves a Google OAuth2 Bearer token with indexing scope using the service account credentials.
    """
    creds_path = credentials_path or os.environ.get("GOOGLE_SERVICE_ACCOUNT_KEY") or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path:
        return None

    if not GOOGLE_AUTH_AVAILABLE:
        print("[!] 'google-auth' is not installed in the current Python environment.", file=sys.stderr)
        print("    Install it via: pip install google-auth", file=sys.stderr)
        return None

    try:
        if os.path.exists(creds_path):
            creds = service_account.Credentials.from_service_account_file(
                creds_path,
                scopes=["https://www.googleapis.com/auth/indexing"]
            )
        else:
            # Attempt to parse as raw JSON string
            key_data = json.loads(creds_path)
            creds = service_account.Credentials.from_service_account_info(
                key_data,
                scopes=["https://www.googleapis.com/auth/indexing"]
            )

        auth_req = GoogleAuthRequest()
        creds.refresh(auth_req)
        return creds.token
    except Exception as e:
        print(f"[!] Failed to acquire Google OAuth2 token: {e}", file=sys.stderr)
        return None


def submit_url_to_google(
    url: str,
    action: str = "URL_UPDATED",
    token: str | None = None,
    dry_run: bool = False
) -> tuple[bool, str]:
    """
    Submits a single URL notification to the Google Indexing API.
    """
    payload = {
        "url": url,
        "type": action
    }

    if dry_run:
        return True, "DRY-RUN: Simulation only"

    if not token:
        return False, "No OAuth2 access token available"

    body_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        GOOGLE_INDEXING_ENDPOINT,
        data=body_bytes,
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": f"Bearer {token}",
            "User-Agent": DEFAULT_USER_AGENT
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp_text = resp.read().decode("utf-8")
            return True, f"HTTP {resp.status}"
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else ""
        try:
            err_json = json.loads(err_body)
            msg = err_json.get("error", {}).get("message", f"HTTP {e.code}")
        except Exception:
            msg = f"HTTP {e.code}: {err_body}"
        return False, msg
    except Exception as e:
        return False, str(e)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Ānvīkṣikī Journal - Automated Google Search Indexing CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/google_indexing.py --help
  python scripts/google_indexing.py --all --dry-run
  python scripts/google_indexing.py --url "https://anvikshikijournal.in/articles/nyaya-epistemology" --dry-run
  python scripts/google_indexing.py --ping-only
  python scripts/google_indexing.py --all --credentials service_account.json
        """
    )

    parser.add_argument(
        "--url",
        type=str,
        help="Single URL to submit to Google Indexing API or ping"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Fetch all URLs from the journal sitemap and submit for indexing"
    )
    parser.add_argument(
        "--sitemap",
        type=str,
        default=DEFAULT_SITEMAP_URL,
        help=f"Sitemap URL (default: {DEFAULT_SITEMAP_URL})"
    )
    parser.add_argument(
        "--credentials",
        type=str,
        help="Path to Google Service Account JSON credentials file"
    )
    parser.add_argument(
        "--action",
        choices=["URL_UPDATED", "URL_DELETED"],
        default="URL_UPDATED",
        help="Notification type (default: URL_UPDATED)"
    )
    parser.add_argument(
        "--ping-only",
        action="store_true",
        help="Ping Google and Bing sitemaps only; do not call Indexing API"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview all operations and URLs without making mutating API requests"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of URLs to process from sitemap (e.g. 50)"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.1,
        help="Delay in seconds between API requests to avoid rate limits (default: 0.1s)"
    )

    args = parser.parse_args()

    print("=" * 65)
    print(" Ānvīkṣikī Journal — Automated Google Search Indexing")
    print("=" * 65)

    if args.dry_run:
        print("[INFO] DRY RUN MODE ACTIVE — No live mutations will be sent.")

    # 1. Ping-only mode
    if args.ping_only:
        ping_search_engines(args.sitemap, dry_run=args.dry_run)
        print("\n[+] Ping-only operation completed successfully.")
        return 0

    # 2. Determine target URLs
    urls: list[str] = []
    if args.url:
        urls = [args.url.strip()]
    elif args.all:
        if args.dry_run:
            # In dry-run mode, if network sitemap fetch fails (e.g. offline/mock environment),
            # provide sample canonical URLs so dry run demonstrates operation cleanly.
            sitemap_urls = fetch_sitemap_urls(args.sitemap)
            if not sitemap_urls:
                print("[~] Sitemap returned no URLs or network unavailable; simulating with canonical sample.")
                urls = [
                    f"https://{CANONICAL_DOMAIN}/articles/nyaya-epistemology-pramana-theory",
                    f"https://{CANONICAL_DOMAIN}/papers/advaita-vedanta-consciousness",
                    f"https://{CANONICAL_DOMAIN}/domains/darshana",
                    f"https://{CANONICAL_DOMAIN}/authors/xiyatosaanvi",
                ]
            else:
                urls = sitemap_urls
        else:
            urls = fetch_sitemap_urls(args.sitemap)
    else:
        print("[!] Please specify either --url <url>, --all, or --ping-only.", file=sys.stderr)
        parser.print_help()
        return 1

    if not urls:
        print("[!] No URLs found to process.", file=sys.stderr)
        return 1

    if args.limit and args.limit > 0:
        urls = urls[:args.limit]

    # Quota check & warning
    if len(urls) > DAILY_QUOTA_LIMIT:
        print(f"\n[WARNING] Total URLs to submit ({len(urls)}) exceeds Google's default daily quota of {DAILY_QUOTA_LIMIT}.")
        print("          Consider running with --limit or in batches to avoid 429 Rate Limit errors.\n")

    print(f"\n[*] Total URLs to process: {len(urls)}")
    print(f"[*] Action type: {args.action}")

    # 3. Acquire Google OAuth2 token if not dry run
    token = None
    if not args.dry_run:
        token = get_google_access_token(args.credentials)
        if not token:
            print("[~] No valid Google OAuth2 credentials found.")
            print("    Falling back to pinging search engine sitemaps...")
            ping_search_engines(args.sitemap, dry_run=False)
            print("\n[!] To enable direct Google Indexing API submission:")
            print("    1. Provide service account JSON with --credentials <path>")
            print("    2. Ensure 'google-auth' is installed: pip install google-auth")
            print("    3. Ensure client email has Owner permissions in Google Search Console.")
            return 0

    # 4. Process submissions
    submitted = 0
    failed = 0

    for i, url in enumerate(urls, start=1):
        success, message = submit_url_to_google(
            url,
            action=args.action,
            token=token,
            dry_run=args.dry_run
        )

        status_tag = "[OK]" if success else "[FAIL]"
        print(f"  [{i}/{len(urls)}] {status_tag} {url} -> {message}")

        if success:
            submitted += 1
        else:
            failed += 1

        if args.delay > 0 and i < len(urls):
            time.sleep(args.delay)

    # 5. Summary and Sitemap Ping
    print("\n" + "-" * 65)
    print(f"Summary: {submitted} submitted, {failed} failed (Total: {len(urls)})")
    print("-" * 65)

    # Trigger sitemap ping as supplementary coverage
    ping_search_engines(args.sitemap, dry_run=args.dry_run)

    print("\n[+] Indexing pipeline run finished.")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
