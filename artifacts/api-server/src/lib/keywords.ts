/**
 * Topic terms for Ānvīkṣikī pages.
 *
 * Every term that reaches a page's metadata or structured data must describe
 * that page. This module used to append a fixed list of "high-ranking" search
 * phrases ("Hindu article", "Vedic science", "Nyaya", "Vedanta", ...), whole
 * domain clusters and other articles' topics to every article, author, domain,
 * /about and /browse page, and labelled every author an "Indic scholar, Hindu
 * philosophy researcher, Vedic science contributor". Google's structured-data
 * policy requires markup to be a true representation of the visible content,
 * and meta keywords carry no ranking weight, so all of that is gone.
 *
 * What remains:
 *   - articleTopicTags(): a work's own tags, cleaned and de-duplicated. These
 *     are the only terms used for meta keywords, article:tag, citation_keywords
 *     and JSON-LD `keywords`.
 *   - extractArticleKeywords(): proposes tags from a work's own title and text
 *     when it is published without any (publication-sync, admin). It only
 *     returns words and phrases that occur in that text.
 */

/** A work's own tags, trimmed, de-duplicated case-insensitively, capped. */
export function articleTopicTags(tags: unknown, max = 15): string[] {
  const list = Array.isArray(tags)
    ? tags
    : typeof tags === "string"
      ? tags.split(/,\s*/)
      : [];

  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const tag = raw.replace(/\s+/g, " ").trim();
    const key = tag.toLowerCase();
    if (!tag || tag.length > 80 || seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length >= max) break;
  }
  return result;
}

const STOPWORDS = new Set([
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
]);

const INDIC_KNOWN_TERMS = new Set([
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
]);

function cleanText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#*`_~\[\]()\\\/]/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Automatically extracts the most relevant search keywords and multi-word phrases directly
 * out of the given article's body text, subtitle, and title.
 */
export function extractArticleKeywords(content: string, title: string = "", maxKeywords: number = 12): string[] {
  const cleanContent = cleanText(content);
  const cleanTitle = cleanText(title);
  if (!cleanContent && !cleanTitle) return [];

  const wordScores = new Map<string, number>();
  const phraseScores = new Map<string, number>();

  function addScore(map: Map<string, number>, term: string, score: number) {
    const key = term.trim();
    if (!key || key.length < 3) return;
    const lower = key.toLowerCase();
    if (STOPWORDS.has(lower)) return;
    map.set(key, (map.get(key) || 0) + score);
  }

  // 1. Process Title with high weight
  if (cleanTitle) {
    for (const term of INDIC_KNOWN_TERMS) {
      if (cleanTitle.toLowerCase().includes(term)) {
        addScore(phraseScores, term, 10);
      }
    }

    const titleWords = cleanTitle.split(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]+/);
    for (let i = 0; i < titleWords.length; i++) {
      const w = titleWords[i];
      if (w && w.length >= 3 && !STOPWORDS.has(w.toLowerCase())) {
        const boost = INDIC_KNOWN_TERMS.has(w.toLowerCase()) ? 7 : 4;
        addScore(wordScores, w, boost);
      }
      if (i < titleWords.length - 1) {
        const w2 = titleWords[i + 1];
        if (w2 && !STOPWORDS.has(w.toLowerCase()) && !STOPWORDS.has(w2.toLowerCase())) {
          const phrase = `${w} ${w2}`;
          addScore(phraseScores, phrase, 6);
        }
      }
    }
  }

  // 2. Scan for Known Multi-Word Indic & Domain Terms in Content
  const contentLower = cleanContent.toLowerCase();
  for (const term of INDIC_KNOWN_TERMS) {
    if (contentLower.includes(term)) {
      const matches = contentLower.match(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"));
      const count = matches ? matches.length : 0;
      if (count > 0) {
        addScore(phraseScores, term, 3 + count * 2);
      }
    }
  }

  // 3. Extract Capitalized Named Entities & Proper Noun Phrases
  const capitalizedPhraseRegex = /\b([A-Z\u00C0-\u024F\u1E00-\u1EFF][a-z\u00C0-\u024F\u1E00-\u1EFF]+(?:\s+[A-Z\u00C0-\u024F\u1E00-\u1EFF][a-z\u00C0-\u024F\u1E00-\u1EFF]+){1,2})\b/g;
  let match: RegExpExecArray | null;
  while ((match = capitalizedPhraseRegex.exec(cleanContent)) !== null) {
    const phrase = match[1].trim();
    const parts = phrase.split(/\s+/);
    if (parts.length >= 2 && parts.every((p) => !STOPWORDS.has(p.toLowerCase()) && p.length > 2)) {
      const boost = INDIC_KNOWN_TERMS.has(phrase.toLowerCase()) ? 5 : 2.5;
      addScore(phraseScores, phrase, boost);
    }
  }

  // 4. Tokenize Content Words with Position & Indic Weighting
  const words = cleanContent.split(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]+/);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!w || w.length < 3) continue;
    const lower = w.toLowerCase();
    if (STOPWORDS.has(lower)) continue;

    const positionWeight = i < 300 ? 1.5 : 1.0;
    const indicBoost = INDIC_KNOWN_TERMS.has(lower) ? 3.0 : 1.0;
    addScore(wordScores, w, positionWeight * indicBoost);
  }

  // 5. Combine and Rank Candidates
  const allCandidates = new Map<string, number>();

  for (const [phrase, score] of phraseScores.entries()) {
    allCandidates.set(phrase, score * 1.8);
  }

  for (const [word, score] of wordScores.entries()) {
    if (INDIC_KNOWN_TERMS.has(word.toLowerCase()) || score >= 3) {
      allCandidates.set(word, score);
    }
  }

  const sorted = Array.from(allCandidates.entries()).sort((a, b) => b[1] - a[1]);

  const results: string[] = [];
  const seenLower = new Set<string>();

  for (const [term] of sorted) {
    const lower = term.toLowerCase();
    if (seenLower.has(lower)) continue;

    const isSub = results.some(
      (existing) => existing.toLowerCase().includes(lower) && existing.length > lower.length + 3
    );
    if (isSub && !INDIC_KNOWN_TERMS.has(lower)) continue;

    const formatted = term
      .split(/\s+/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(" ");

    seenLower.add(lower);
    results.push(formatted);
    if (results.length >= maxKeywords) break;
  }

  return results;
}
