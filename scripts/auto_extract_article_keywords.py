#!/usr/bin/env python3
"""
scripts/auto_extract_article_keywords.py

Automated Keyword Extraction & Google SEO Indexer for Ānvīkṣikī Journal.
Automatically analyzes article body text, extracts high-ranking search terms
and Indic domain concepts, updates SEO metadata, and triggers Google search indexing.

Usage Examples:
  # Extract keywords from a text sample or file:
  python scripts/auto_extract_article_keywords.py --text "In Southeast Asian historiography, the kingdom of Champa..." --title "Beyond Angkor"

  # Extract keywords for a specific published article by slug:
  python scripts/auto_extract_article_keywords.py --slug beyond-angkor-why-is-vietnam-frequently-excluded-from-the-history-of-hindu-influence-in-southeast-asia

  # Run extraction and Google indexing across all published articles:
  python scripts/auto_extract_article_keywords.py --all --index

  # Dry run preview without making mutating network calls:
  python scripts/auto_extract_article_keywords.py --all --dry-run
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

CANONICAL_DOMAIN = "anvikshikijournal.in"
API_BASE_URL = os.environ.get("API_BASE_URL", f"https://{CANONICAL_DOMAIN}")
DEFAULT_USER_AGENT = "AnvikshikiJournal-KeywordExtractor/1.0"

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can",
    "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't",
    "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have",
    "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him",
    "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't",
    "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor",
    "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out",
    "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some",
    "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
    "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to",
    "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's",
    "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've",
    "your", "yours", "yourself", "yourselves", "also", "however", "therefore", "thus", "hence", "furthermore",
    "moreover", "although", "though", "nevertheless", "nonetheless", "rather", "instead", "whereas", "while",
    "meanwhile", "first", "second", "third", "one", "two", "three", "many", "much", "several", "often", "always",
    "sometimes", "perhaps", "maybe", "quite", "indeed", "especially", "particularly", "specifically",
    "overall", "finally", "since", "within", "without", "between", "among", "across", "along", "behind",
    "beyond", "upon", "towards", "toward", "whether", "either", "neither", "whose", "whom", "will", "shall",
    "may", "might", "must", "well", "like", "even", "still", "yet", "just", "now", "then", "here", "there",
    "article", "essay", "paper", "journal", "study", "research", "examines", "author", "published", "section",
    "frequently", "frequent", "excluded", "exclude", "including", "included", "include", "represents", "represent",
    "examines", "examine", "demonstrates", "demonstrate", "discusses", "discuss", "shows", "show", "centers",
    "center", "dedicated", "dedicate", "makes", "make", "finds", "find", "century", "modern", "contemporary",
    "broader", "magnificent", "profound", "sophisticated"
}

INDIC_KNOWN_TERMS = {
    "nyaya", "vaisheshika", "samkhya", "yoga", "mimamsa", "vedanta", "advaita", "vishishtadvaita", "dvaita",
    "pramana", "pratyaksha", "anumana", "upamana", "shabda", "tarka", "hetu", "vyapti", "dharma", "artha",
    "kama", "moksha", "brahman", "atman", "maya", "karma", "samsara", "upanishad", "vedas", "rigveda",
    "yajurveda", "samaveda", "atharvaveda", "panini", "ashtadhyayi", "vyakarana", "dhatupatha", "kautilya",
    "arthashastra", "rajadharma", "natyashastra", "rasa", "dhvani", "abhinavagupta", "charaka", "sushruta",
    "ayurveda", "aryabhata", "brahmagupta", "madhava", "bhaskara", "sulba sutras", "champa", "angkor",
    "khmer", "majapahit", "srivijaya", "my son", "mỹ sơn", "chola", "pallava", "gupta", "maurya", "kushan", "harappan",
    "indus valley", "sarasvati", "itihasa", "puranas", "mahabharata", "ramayana", "bhagavad gita", "dhyana",
    "samadhi", "pranayama", "chitta", "antahkarana", "purusha", "prakriti", "gunas", "sattva", "rajas", "tamas",
    "sanatana dharma", "hindu", "indic", "sanskrit", "prakrit", "pali", "epigraphy", "shastra", "darshana",
    "saivism", "śaivism", "vaishnavism", "shaktism", "tantra", "paninian grammar", "kavya", "temple architecture",
    "southeast asia", "hindu influence", "khmer empire"
}

UNIVERSAL_CORE_TERMS = [
    "Hindu article",
    "Hindu philosophy",
    "Indic research",
    "Sanatana Dharma scholarship",
    "ancient Indian history",
    "Vedic science",
    "Nyaya",
    "Vedanta",
]


def clean_text(raw: str) -> str:
    if not raw:
        return ""
    text = re.sub(r"<[^>]+>", " ", raw)
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"[#*`_~\[\]()\\/]", " ", text)
    text = re.sub(r"&[a-z]+;", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_keywords_from_article(content: str, title: str = "", max_keywords: int = 12) -> list[str]:
    """
    Extracts the highest-ranking search terms directly out of article content and title.
    """
    clean_c = clean_text(content)
    clean_t = clean_text(title)
    if not clean_c and not clean_t:
        return []

    word_scores: dict[str, float] = {}
    phrase_scores: dict[str, float] = {}

    def add_score(d: dict[str, float], term: str, score: float):
        k = term.strip()
        if not k or len(k) < 3:
            return
        if k.lower() in STOPWORDS:
            return
        d[k] = d.get(k, 0.0) + score

    # 1. Title processing
    if clean_t:
        for term in INDIC_KNOWN_TERMS:
            if term in clean_t.lower():
                add_score(phrase_scores, term, 10.0)

        title_words = re.findall(r"[\w\u00C0-\u024F\u1E00-\u1EFF]+", clean_t)
        for i, w in enumerate(title_words):
            if len(w) >= 3 and w.lower() not in STOPWORDS:
                boost = 7.0 if w.lower() in INDIC_KNOWN_TERMS else 4.0
                add_score(word_scores, w, boost)
            if i < len(title_words) - 1:
                w2 = title_words[i + 1]
                if w.lower() not in STOPWORDS and w2.lower() not in STOPWORDS:
                    add_score(phrase_scores, f"{w} {w2}", 6.0)

    # 2. Known Indic multi-word terms in content
    content_lower = clean_c.lower()
    for term in INDIC_KNOWN_TERMS:
        if term in content_lower:
            pattern = r"\b" + re.escape(term) + r"\b"
            matches = re.findall(pattern, content_lower)
            if matches:
                add_score(phrase_scores, term, 3.0 + len(matches) * 2.0)

    # 3. Capitalized Named Entities
    cap_matches = re.findall(r"\b([A-Z\u00C0-\u024F\u1E00-\u1EFF][a-z\u00C0-\u024F\u1E00-\u1EFF]+(?:\s+[A-Z\u00C0-\u024F\u1E00-\u1EFF][a-z\u00C0-\u024F\u1E00-\u1EFF]+){1,2})\b", clean_c)
    for phrase in cap_matches:
        parts = phrase.split()
        if len(parts) >= 2 and all(p.lower() not in STOPWORDS and len(p) > 2 for p in parts):
            boost = 5.0 if phrase.lower() in INDIC_KNOWN_TERMS else 2.5
            add_score(phrase_scores, phrase, boost)

    # 4. Content words tokenization with position & Indic weighting
    words = re.findall(r"[\w\u00C0-\u024F\u1E00-\u1EFF]+", clean_c)
    for i, w in enumerate(words):
        if len(w) < 3:
            continue
        w_low = w.lower()
        if w_low in STOPWORDS:
            continue
        pos_weight = 1.5 if i < 300 else 1.0
        indic_boost = 3.0 if w_low in INDIC_KNOWN_TERMS else 1.0
        add_score(word_scores, w, pos_weight * indic_boost)

    # 5. Combine and Rank
    all_candidates: dict[str, float] = {}
    for phrase, score in phrase_scores.items():
        all_candidates[phrase] = score * 1.8
    for word, score in word_scores.items():
        if word.lower() in INDIC_KNOWN_TERMS or score >= 3.0:
            all_candidates[word] = score

    sorted_candidates = sorted(all_candidates.items(), key=lambda x: x[1], reverse=True)

    results: list[str] = []
    seen_lower: set[str] = set()

    for term, _ in sorted_candidates:
        t_low = term.lower()
        if t_low in seen_lower:
            continue

        # Redundancy check
        is_sub = any(existing.lower() in t_low or (t_low in existing.lower() and len(existing) > len(t_low) + 3) for existing in results)
        if is_sub and t_low not in INDIC_KNOWN_TERMS:
            continue

        # Format Title Case
        formatted = " ".join(p.capitalize() for p in term.split())
        seen_lower.add(t_low)
        results.append(formatted)
        if len(results) >= max_keywords:
            break

    return results


def enrich_article_seo_metadata(title: str, content: str, slug: str = "", category: str = "philosophy") -> dict:
    """
    Enriches article with dynamically extracted keywords, universal search terms,
    and Google News search tags.
    """
    extracted = extract_keywords_from_article(content, title, max_keywords=10)

    # Blend with universal core terms ("Hindu article", "Hindu philosophy", etc.)
    all_keywords = []
    seen = set()

    # Priority order:
    # 1. Extracted article keywords
    # 2. Universal core terms (ensuring "Hindu article" is always present)
    # 3. Category
    for k in extracted + UNIVERSAL_CORE_TERMS + [category.replace("-", " ").title()]:
        k_clean = k.strip()
        k_low = k_clean.lower()
        if k_clean and k_low not in seen:
            seen.add(k_low)
            all_keywords.append(k_clean)

    # News keywords (top 8 focused queries)
    news_keywords = ["Hindu article", "Hindu philosophy"] + [k for k in extracted[:6] if k.lower() not in {"hindu article", "hindu philosophy"}]

    return {
        "title": title,
        "slug": slug,
        "extracted_keywords": extracted,
        "keywords_meta_string": ", ".join(all_keywords),
        "news_keywords_meta_string": ", ".join(news_keywords[:8]),
        "total_keywords_count": len(all_keywords),
    }


def fetch_articles_from_api(base_url: str) -> list[dict]:
    url = f"{base_url}/api/articles"
    req = urllib.request.Request(url, headers={"User-Agent": DEFAULT_USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if isinstance(data, dict) and "articles" in data:
                return data["articles"]
            if isinstance(data, list):
                return data
    except Exception as e:
        print(f"[!] Warning: Could not fetch from {url}: {e}", file=sys.stderr)
    return []


def ping_google_and_bing(canonical_url: str):
    """
    Notifies Google and Bing of the updated page or sitemap.
    """
    sitemap = f"https://{CANONICAL_DOMAIN}/sitemap.xml"
    encoded = urllib.parse.quote(sitemap, safe="")
    targets = [
        ("Google", f"https://www.google.com/ping?sitemap={encoded}"),
        ("Bing", f"https://www.bing.com/ping?sitemap={encoded}"),
    ]
    for engine, ping_url in targets:
        try:
            req = urllib.request.Request(ping_url, headers={"User-Agent": DEFAULT_USER_AGENT})
            with urllib.request.urlopen(req, timeout=8) as resp:
                print(f"    [+] {engine} sitemap ping: HTTP {resp.status}")
        except Exception as e:
            print(f"    [~] {engine} ping notice: {e}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Ānvīkṣikī Journal - Automatic Keyword Extractor & Google Indexer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--text", type=str, help="Raw article content to extract keywords from")
    parser.add_argument("--title", type=str, default="", help="Article title")
    parser.add_argument("--slug", type=str, help="Fetch a published article by slug from API")
    parser.add_argument("--all", action="store_true", help="Process all published articles from journal API")
    parser.add_argument("--index", action="store_true", help="Trigger Google and Bing search indexing pings")
    parser.add_argument("--dry-run", action="store_true", help="Dry run simulation only")

    args = parser.parse_args()

    print("=" * 68)
    print(" Ānvīkṣikī Journal — Automatic Keyword Extraction & SEO Indexing")
    print("=" * 68)

    if args.text:
        res = enrich_article_seo_metadata(args.title, args.text)
        print(f"\nTitle: {args.title or '(Untitled)'}")
        print("\nExtracted Keywords:")
        for i, k in enumerate(res["extracted_keywords"], 1):
            print(f"  {i:2d}. {k}")
        print(f"\nMeta Keywords Tag ({res['total_keywords_count']} terms):")
        print(f"  <meta name=\"keywords\" content=\"{res['keywords_meta_string']}\" />")
        print("\nGoogle News Keywords Tag:")
        print(f"  <meta name=\"news_keywords\" content=\"{res['news_keywords_meta_string']}\" />")
        return 0

    if args.slug:
        article_url = f"{API_BASE_URL}/api/articles/{args.slug}"
        print(f"[*] Fetching article from: {article_url}")
        try:
            req = urllib.request.Request(article_url, headers={"User-Agent": DEFAULT_USER_AGENT})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                article = data.get("article", data)
        except Exception as e:
            print(f"[!] Error: {e}", file=sys.stderr)
            return 1

        title = article.get("title", "")
        content = f"{article.get('subtitle', '')} {article.get('excerpt', '')} {article.get('body', '')}"
        res = enrich_article_seo_metadata(title, content, slug=args.slug, category=article.get("categorySlug", "philosophy"))

        print(f"\n[+] Article: {title}")
        print(f"    URL: https://{CANONICAL_DOMAIN}/articles/{args.slug}")
        print("\n    Extracted Keywords:")
        for k in res["extracted_keywords"]:
            print(f"      • {k}")

        print(f"\n    Google SEO Tag:")
        print(f"      {res['keywords_meta_string']}")

        if args.index and not args.dry_run:
            print("\n[*] Triggering Search Engine Indexing:")
            ping_google_and_bing(f"https://{CANONICAL_DOMAIN}/articles/{args.slug}")

        return 0

    if args.all:
        articles = fetch_articles_from_api(API_BASE_URL)
        if not articles:
            print("[~] No articles returned from API (or network unreachable). Demonstrating on sample dataset:")
            articles = [
                {
                    "title": "Beyond Angkor: Why is Vietnam Frequently Excluded from the History of Hindu Influence in Southeast Asia?",
                    "slug": "beyond-angkor-why-is-vietnam-frequently-excluded-from-the-history-of-hindu-influence-in-southeast-asia",
                    "categorySlug": "history",
                    "body": "In Southeast Asian historiography, the kingdom of Champa in modern central and southern Vietnam represents one of the most profound examples of Hindu and Indic cultural synthesis. From the 4th to the 15th century, Cham rulers dedicated brick sanctuaries at Mỹ Sơn to Śiva Bhadreśvara. The Sanskrit inscriptions of Champa demonstrate a command of Paninian grammar and Kavya poetics.",
                },
                {
                    "title": "The Quantum Eternal: Vedanta and Modern Physics",
                    "slug": "quantum-eternal",
                    "categorySlug": "philosophy",
                    "body": "Erwin Schrödinger, Werner Heisenberg, and Niels Bohr were profoundly influenced by classical Upanishadic philosophy. Schrödinger explicitly credited Vedanta in 'My View of the World', noting that the multiplicity of minds is only an illusion (maya) and that Brahman represents the unified ground of consciousness.",
                }
            ]

        print(f"\n[*] Processing {len(articles)} articles...")
        for i, art in enumerate(articles, 1):
            title = art.get("title", "")
            slug = art.get("slug", "")
            body = art.get("body", "") or art.get("content", "") or ""
            res = enrich_article_seo_metadata(title, body, slug=slug, category=art.get("categorySlug", "philosophy"))

            print(f"\n[{i}/{len(articles)}] {title}")
            print(f"      Slug: {slug}")
            print(f"      Dynamic Keywords: {', '.join(res['extracted_keywords'][:6])}")
            print(f"      News Keywords: {res['news_keywords_meta_string']}")

            if args.index and not args.dry_run:
                ping_google_and_bing(f"https://{CANONICAL_DOMAIN}/articles/{slug}")

        print("\n" + "=" * 68)
        print(f"[+] Processed {len(articles)} articles. All keywords dynamically extracted and structured for Google SEO!")
        print("=" * 68)
        return 0

    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
