/**
 * Topic terms for a work, taken from the work's own words.
 *
 * Every term that reaches a page's metadata (JSON-LD keywords/about,
 * article:tag, RSS <category>, the visible Topics row) must describe that page
 * and occur in it. Google's structured-data policy requires markup to be a true
 * representation of the visible content, so nothing generic is ever added.
 *
 *   - articleTopicTags(): an editor's own tags, cleaned and de-duplicated.
 *   - deriveSeoTerms(): proposes 6–8 terms from the title, headings, summary
 *     and body. Candidates are multi-word proper nouns ("Mandal Commission"),
 *     proper nouns and acronyms used repeatedly ("Schrödinger", "OBC"), and
 *     entries of a curated lexicon of Indic, history, philosophy and religion
 *     terms. A lexicon entry is used only when one of its spellings literally
 *     occurs in the text, and the term is always shown the way the text spells
 *     it. Title and headings weigh more than the body. When the text names
 *     fewer than six topics often enough to stand out, names it mentions only
 *     once or twice fill the list, then broad subject words it uses
 *     ("philosophy", "history"). Deterministic: the same text always gives the
 *     same terms.
 *
 * Which terms a page uses (the editor's tags, the editorial layer, or these
 * derived terms) is decided in lib/effective-seo.ts. The client never derives
 * terms itself: the server sends them with the work (`seo.topics`).
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

export const SEO_TERMS_MAX = 8;
/** Below this many specific terms, broad subject words from the text fill the list. */
export const SEO_TERMS_MIN = 6;

export interface SeoTermSource {
  title?: unknown;
  subtitle?: unknown;
  /** Excerpt or abstract. */
  summary?: unknown;
  /** Body HTML (or plain text). */
  body?: unknown;
}

/** Words that never make a term on their own and are trimmed from the ends of phrases. */
const STOPWORDS = new Set(`
a about above across after afterwards again against all almost alone along already also although always am among amongst an and another any anyone anything anyway anywhere are around as at back be became because become becomes been before beforehand behind being below beside besides between beyond both but by can cannot could did do does doing done down during each either else elsewhere enough even ever every everyone everything everywhere except few first for former formerly from further had has have having he hence her here hereby herein hers herself him himself his how however i if in indeed instead into is it its itself just last latter least less let like made many may me meanwhile might mine more moreover most mostly much must my myself namely neither never nevertheless next no nobody none nor not nothing now nowhere of off often on once one only onto or other others otherwise our ours ourselves out over own per perhaps rather re same second several she should since so some somehow someone something sometime sometimes somewhere still such than that the their theirs them themselves then thence there thereafter thereby therefore therein these they third this those though through throughout thus to together too toward towards under until up upon us very via was we well were what whatever when whence whenever where whereas whereby wherever whether which while whither who whoever whole whom whose why will with within without would yet you your yours yourself yourselves
yes oh ok okay unlike despite amid amidst beneath onto unto whilst
`.trim().split(/\s+/));

/** Words too generic to describe a work: document furniture, roles, time words, numbers. */
const GENERIC = new Set(`
introduction conclusion conclusions chapter chapters figure figures fig table tables page pages part parts section sections abstract summary references reference sources source notes note appendix preface epilogue prologue foreword afterword contents key takeaways takeaway image images photo photograph photographs chart charts map maps caption credit credits essay essays article articles paper papers journal study studies research author authors editor editors volume issue edition
today yesterday tomorrow now then later earlier ago year years decade decades century centuries era age period time times day days week weeks month months
monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december
mr mrs ms dr prof professor sir madam lord lady king queen prince princess emperor empress saint st president prime minister ministers chief justice governor general lieutenant colonel captain commander secretary chairman leader leaders member members
new old modern ancient early late great small large big high low long short good bad true false real whole same other another
one two three four five six seven eight nine ten hundred thousand million billion
i ii iii iv v vi vii viii ix x xi xii
yet still also why what how who where when which whose this that these those here there
god gods
`.trim().split(/\s+/));

/** The journal's own name describes every page equally, so it is never a topic. */
const SITE_WORDS = new Set(["anvikshiki", "anviksiki"]);

/**
 * Nouns that name a kind of institution rather than a topic. They are fine
 * inside a name ("Mandal Commission", "Supreme Court") but never alone.
 */
const INSTITUTIONAL = new Set(`
commission commissions committee committees court courts government governments party parties act acts report reports survey surveys council councils state states nation nations country countries people peoples society societies community communities group groups system systems policy policies law laws question questions problem problems crisis board ministry department office university institute institution institutions archive archives museum library centre center
`.trim().split(/\s+/));

/**
 * Curated lexicon of Indic, history, philosophy and religion terms. Each entry
 * lists spellings (diacritics are folded when matching, so "Upaniṣads" matches
 * "upanisads"). An entry is only used when one of its spellings occurs in the
 * work, and the term is displayed as the work spells it.
 */
const LEXICON: string[][] = [
  // Darśanas, texts and concepts
  ["nyaya"], ["vaisheshika", "vaisesika"], ["samkhya", "sankhya"], ["mimamsa"], ["vedanta"],
  ["advaita vedanta"], ["advaita"], ["dvaita"], ["vishishtadvaita", "visistadvaita"],
  ["upanishads", "upanishad", "upanisads", "upanisad"], ["chandogya upanishad", "chandogya upanisad"],
  ["vedas", "veda"], ["vedic"], ["rigveda", "rig veda", "rgveda"], ["bhagavad gita", "gita"],
  ["mahabharata"], ["ramayana"], ["ramakien"], ["puranas"], ["arthashastra", "arthasastra"],
  ["natyashastra", "natyasastra"], ["dharmashastra", "dharmasastra"], ["brahman"], ["atman"],
  ["brahman atman"], ["tat tvam asi"], ["maya"], ["moksha", "moksa"], ["samsara"], ["karma"],
  ["dharma"], ["pramana", "pramanas"], ["darshana", "darsana"], ["tarka"], ["ahimsa"],
  ["shankara", "sankara", "adi shankara", "shankaracharya", "sankaracarya"], ["ramanuja"],
  ["madhva"], ["panini"], ["kautilya"], ["chanakya"], ["abhinavagupta"], ["nagarjuna"],
  ["sanskrit"], ["pali"], ["prakrit"], ["tamil"], ["indic"], ["hindu"], ["hindus"], ["hinduism"],
  ["sanatana dharma"], ["buddhism"], ["buddhist"], ["jainism"], ["jain"], ["sikhism"],
  ["tantra"], ["shaivism", "saivism"], ["vaishnavism", "vaisnavism"], ["shaktism"], ["bhakti"],
  ["shiva", "siva"], ["vishnu", "visnu"], ["brahmin", "brahmins"], ["yoga"], ["ayurveda"],
  ["mount meru", "meru"], ["lingam", "linga"],
  // Philosophy and science
  ["metaphysics"], ["epistemology"], ["ontology"], ["consciousness"], ["mysticism"],
  ["quantum mechanics"], ["wave mechanics"], ["quantum physics"], ["physics"], ["philosophy of mind"],
  ["monism"], ["dualism"], ["nondualism", "non dualism"],
  // Southeast Asia and history
  ["champa"], ["cham"], ["angkor wat"], ["angkor"], ["khmer"], ["funan"],
  ["dai viet"], ["srivijaya"], ["majapahit"], ["southeast asia"], ["indianization", "indianisation"],
  ["temple architecture"], ["inscriptions"], ["epigraphy"], ["chola", "cholas"], ["pallava", "pallavas"],
  ["maurya", "mauryan"], ["gupta"], ["mughal", "mughals"], ["vijayanagara"], ["harappan"],
  ["indus valley"], ["colonialism"], ["colonial rule"], ["british raj"], ["east india company"],
  ["partition"], ["independence"], ["westphalia"], ["ottoman"], ["millet system"],
  ["nation state"], ["nationalism"], ["secularism"], ["civilizational", "civilisational"],
  // Indian politics and society
  ["caste"], ["caste system"], ["jati"], ["varna"], ["mandal commission"], ["mandal"],
  ["rohini commission"], ["reservation", "reservations"], ["affirmative action"],
  ["other backward classes"], ["obc", "obcs"], ["dalit", "dalits"], ["scheduled castes"],
  ["scheduled tribes"], ["indra sawhney"], ["sub categorisation", "sub categorization"],
  ["social justice"], ["census"], ["caste census"],
  // Indian diaspora and indenture
  ["girmit"], ["girmitiya", "girmitiyas"], ["indenture"], ["indentured labour", "indentured labor"],
  ["indentured"], ["indo fijian", "indo fijians"], ["fiji"], ["fijian", "fijians"], ["diaspora"],
  ["family planning"], ["fertility"], ["demography"], ["coup"],
  // Atlantic world and religion
  ["slave trade"], ["transatlantic slave trade"], ["slavery"], ["santeria"], ["yoruba"],
  ["mandinka"], ["orisha", "orishas", "orisa"], ["syncretism"], ["abrahamic"], ["christianity"],
  ["islam"], ["monotheism"], ["polytheism"], ["catholic", "catholicism"], ["cuba"], ["caribbean"],
];

/**
 * Broad subject words. They are too general to compete with the terms above,
 * so they are used only to fill a short list (an editorial note, a brief
 * essay), and only when the text itself uses the word.
 */
const SUBJECTS = [
  "philosophy", "history", "culture", "politics", "society", "religion", "ethics", "literature",
  "linguistics", "archaeology", "anthropology", "economics", "law", "art", "music", "science",
  "mathematics", "astronomy", "medicine", "theology", "sociology", "psychology", "geopolitics",
  "aesthetics", "education", "language", "spirituality", "ecology",
];

/** Lower case with diacritics removed and Vietnamese đ folded, so spellings compare equal. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

function plainText(value: unknown): string {
  return String(value ?? "")
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|h[1-6]|li|ul|ol|blockquote|figure|figcaption|table|tr|td|th|section|article|header|footer)[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/=+\s*Page\s+\d+\s*=+/gi, "\n");
}

interface Token {
  surface: string;
  /** Lower case, diacritics kept: what stop-word checks see ("mỹ" is not "my"). */
  lower: string;
  /** Lower case, diacritics folded, hyphens as spaces: what matching sees. */
  norm: string;
  /** First word of a sentence or block, where capitals carry no information. */
  initial: boolean;
  /** Text between this token and the previous one contains punctuation. */
  breakBefore: boolean;
}

const WORD = /[\p{L}\p{M}][\p{L}\p{M}\p{N}'’-]*/gu;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  let sentenceStart = true;
  WORD.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WORD.exec(text)) !== null) {
    const gap = text.slice(last, match.index);
    if (/[.!?…:;\n]/.test(gap)) sentenceStart = true;
    let surface = match[0].replace(/['’]s$/u, "").replace(/['’-]+$/u, "");
    last = match.index + match[0].length;
    if (!surface) continue;
    tokens.push({
      surface,
      lower: surface.toLowerCase().replace(/['’]/g, ""),
      norm: fold(surface).replace(/['’]/g, "").replace(/-/g, " "),
      initial: sentenceStart || /["“(\[]\s*$/.test(gap),
      breakBefore: tokens.length === 0 || /[^\s]/.test(gap.replace(/["“”‘’']/g, "")),
    });
    sentenceStart = false;
  }
  return tokens;
}

/** Hyphenated tokens ("Indo-Fijian") count as their parts when matching phrases. */
function normWords(tokens: Token[]): string[] {
  return tokens.flatMap(t => t.norm.split(" ").filter(Boolean));
}


const isCapitalised = (surface: string) => /^\p{Lu}/u.test(surface);
const isAllCaps = (surface: string) => /^[\p{Lu}\p{N}'’-]+$/u.test(surface) && /\p{Lu}.*\p{Lu}/u.test(surface);
const CONNECTORS = new Set(["of", "de", "la", "al", "el", "van", "von", "bin", "da", "du"]);


/** Text written in capitals ("THE ARITHMETIC OF BETRAYAL") carries no proper-noun signal. */
function isShouting(tokens: Token[]): boolean {
  const letters = tokens.filter(t => t.surface.length > 1);
  if (letters.length < 2) return false;
  return letters.filter(t => isAllCaps(t.surface)).length / letters.length > 0.6;
}

interface Zone {
  weight: number;
  tokens: Token[];
  /** Normalised words; a hyphenated token contributes one word per part. */
  words: string[];
  /** For each word, the index of the token that holds it. */
  wordToken: number[];
  /** Word -> positions, for fast phrase counting. */
  index: Map<string, number[]>;
  /** Not written in capitals: lexicon spellings are taken from here. */
  cased: boolean;
  /** Sentence case: capitals mark proper nouns, so proper nouns are discovered here. */
  prose: boolean;
}

interface Candidate {
  key: string;
  phrase: string[];
  surfaces: Map<string, number>;
  lexicon: boolean;
  acronym: boolean;
  multi: boolean;
  /** Some occurrence starts mid-sentence, so its first capital is a name's and not a sentence's. */
  anchored: boolean;
}

function addSurface(candidates: Map<string, Candidate>, phraseTokens: Token[], extra: Partial<Candidate> = {}) {
  const phrase = normWords(phraseTokens);
  const key = phrase.join(" ");
  if (!key) return;
  const surface = phraseTokens.map(t => t.surface).join(" ");
  let candidate = candidates.get(key);
  if (!candidate) {
    candidate = { key, phrase, surfaces: new Map(), lexicon: false, acronym: false, multi: phrase.length > 1, anchored: false, ...extra };
    candidates.set(key, candidate);
  }
  if (extra.lexicon) candidate.lexicon = true;
  if (extra.acronym) candidate.acronym = true;
  if (extra.anchored) candidate.anchored = true;
  candidate.surfaces.set(surface, (candidate.surfaces.get(surface) || 0) + 1);
}

/** Blocks of at most a dozen words without closing punctuation act as headings. */
function splitBody(body: unknown): { headings: string[]; prose: string[] } {
  const html = String(body ?? "");
  const headings: string[] = [];
  const withoutHeadings = html.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]\s*>/gi, (_m, inner: string) => {
    headings.push(plainText(inner));
    return "\n";
  });
  const prose: string[] = [];
  for (const block of plainText(withoutHeadings).split(/\n+/)) {
    const text = block.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const words = text.split(" ").length;
    if (words <= 12 && !/[.!?…"”)]$/.test(text)) headings.push(text);
    else prose.push(text);
  }
  return { headings, prose };
}

/** Headings and titles in Title Case capitalise every word, so capitals say nothing there. */
function isTitleCase(tokens: Token[]): boolean {
  const content = tokens.filter(t => !STOPWORDS.has(t.lower) && !CONNECTORS.has(t.lower));
  if (content.length < 2) return false;
  return content.filter(t => isCapitalised(t.surface)).length / content.length >= 0.6;
}

function zone(text: string, weight: number): Zone {
  const tokens = tokenize(text);
  const words: string[] = [];
  const wordToken: number[] = [];
  const index = new Map<string, number[]>();
  tokens.forEach((t, ti) => {
    for (const w of t.norm.split(" ")) {
      if (!w) continue;
      const positions = index.get(w);
      if (positions) positions.push(words.length);
      else index.set(w, [words.length]);
      words.push(w);
      wordToken.push(ti);
    }
  });
  const cased = !isShouting(tokens);
  return { weight, tokens, words, wordToken, index, cased, prose: cased && !isTitleCase(tokens) };
}

/** Occurrences of a phrase in a zone. */
function countIn(z: Zone, phrase: string[]): number {
  const positions = z.index.get(phrase[0]);
  if (!positions) return 0;
  let count = 0;
  outer: for (const i of positions) {
    if (i + phrase.length > z.words.length) continue;
    for (let k = 1; k < phrase.length; k++) if (z.words[i + k] !== phrase[k]) continue outer;
    count++;
  }
  return count;
}

/** The tokens covering a phrase match at word `start`, or null when it covers part of a hyphenated token. */
function matchTokens(z: Zone, start: number, length: number): Token[] | null {
  const first = z.wordToken[start];
  const last = z.wordToken[start + length - 1];
  if (start > 0 && z.wordToken[start - 1] === first) return null;
  if (start + length < z.words.length && z.wordToken[start + length] === last) return null;
  return z.tokens.slice(first, last + 1);
}

const LEXICON_BY_FIRST_WORD: Map<string, string[][]> = (() => {
  const map = new Map<string, string[][]>();
  for (const spellings of LEXICON) {
    for (const spelling of spellings) {
      const phrase = spelling.split(" ");
      const list = map.get(phrase[0]);
      if (list) list.push(phrase);
      else map.set(phrase[0], [phrase]);
    }
  }
  return map;
})();

/** Leading words that belong to a name ("Saint Barbara", "Mount Meru") and are kept. */
const NAME_PREFIXES = new Set(["saint", "st", "mount", "lake", "fort", "cape", "port"]);

/** Words trimmed from the ends of a capitalised run ("The", "Prime Minister", "In 1990"). */
function isTrimmable(lower: string): boolean {
  return lower.split(/[\s-]+/).filter(Boolean).every(w => STOPWORDS.has(w) || GENERIC.has(w) || SITE_WORDS.has(fold(w)) || /^\d+$/.test(w));
}

/** A word that cannot be a topic on its own: filler, or a generic institution noun. */
function isGenericWord(norm: string): boolean {
  return STOPWORDS.has(norm) || GENERIC.has(norm) || INSTITUTIONAL.has(norm) || SITE_WORDS.has(norm) || /^\d+$/.test(norm);
}

/**
 * What the capitalised first word of a sentence is, when more capitalised
 * words follow it: "name" when the text capitalises it mid-sentence too
 * ("Dara" in "Dara Shikoh"), "word" when the text writes it in lower case
 * mid-sentence, or it is a sentence adverb or a gerund ("Historically",
 * "Answering"), and "unknown" otherwise ("Consider").
 */
function openerKind(token: Token, caps: Map<string, { upper: number; lower: number }>): "name" | "word" | "unknown" {
  const c = caps.get(token.norm);
  if (c && c.upper > 0 && c.upper / (c.upper + c.lower) >= 0.75) return "name";
  if (c && c.lower > 0) return "word";
  if (/^\p{L}{5,}ly$/u.test(token.surface) || /^\p{L}{4,}ing$/u.test(token.surface)) return "word";
  return "unknown";
}

/** True when `inner` occurs as a run of words inside `outer`. */
function containsPhrase(outer: string[], inner: string[]): boolean {
  outer: for (let i = 0; i + inner.length <= outer.length; i++) {
    for (let k = 0; k < inner.length; k++) if (outer[i + k] !== inner[k]) continue outer;
    return true;
  }
  return false;
}

/**
 * Up to `max` topic terms that occur in the work, most characteristic first.
 */
export function deriveSeoTerms(source: SeoTermSource, max = SEO_TERMS_MAX): string[] {
  const { headings, prose } = splitBody(source.body);
  const zones: Zone[] = [
    zone(plainText(source.title), 6),
    zone(plainText(source.subtitle), 3),
    ...headings.map(text => zone(text, 3)),
    zone(plainText(source.summary), 2),
    ...prose.map(text => zone(text, 1)),
  ].filter(z => z.tokens.length > 0);
  if (!zones.length) return [];

  const candidates = new Map<string, Candidate>();
  /** How often each word is capitalised, or not, away from the start of a sentence. */
  const caps = new Map<string, { upper: number; lower: number }>();

  // 1. Proper-noun phrases, single proper nouns and acronyms from sentence-case text.
  for (const z of zones) {
    if (!z.prose) continue;
    for (const t of z.tokens) {
      if (t.initial) continue;
      const entry = caps.get(t.norm) || { upper: 0, lower: 0 };
      if (isCapitalised(t.surface)) entry.upper++;
      else entry.lower++;
      caps.set(t.norm, entry);
    }
  }
  for (const z of zones) {
    if (!z.prose) continue;
    const tokens = z.tokens;
    let i = 0;
    while (i < tokens.length) {
      if (!isCapitalised(tokens[i].surface)) { i++; continue; }
      const run: Token[] = [tokens[i]];
      let j = i + 1;
      while (j < tokens.length && !tokens[j].breakBefore) {
        const t = tokens[j];
        if (isCapitalised(t.surface)) { run.push(t); j++; continue; }
        if (CONNECTORS.has(t.lower) && j + 1 < tokens.length && !tokens[j + 1].breakBefore && isCapitalised(tokens[j + 1].surface)) {
          run.push(t); j++; continue;
        }
        break;
      }
      // Trim filler from both ends ("The", "Prime Minister", "However").
      let start = 0;
      let end = run.length;
      while (start < end && !(NAME_PREFIXES.has(run[start].lower) && end - start > 1) && (isTrimmable(run[start].lower) || CONNECTORS.has(run[start].lower))) start++;
      while (end > start && (isTrimmable(run[end - 1].lower) || CONNECTORS.has(run[end - 1].lower))) end--;
      let core = run.slice(start, end);
      // A sentence opens with a capital, so the first word of a run there may
      // not belong to the name after it ("Historically Akbar", "Reading Ambedkar").
      const opener = core.length >= 2 && core[0].initial ? openerKind(core[0], caps) : "name";
      if (opener === "word") core = core.slice(1);
      if (core.length >= 2 && core.length <= 5) {
        addSurface(candidates, core, { anchored: opener !== "unknown" });
      } else if (core.length === 1) {
        const t = core[0];
        const letters = t.norm.replace(/[^a-z]/g, "");
        if (isAllCaps(t.surface)) {
          if (letters.length >= 3 && letters.length <= 7) addSurface(candidates, [t], { acronym: true });
        } else if (!t.initial) {
          addSurface(candidates, [t]);
        }
      }
      i = Math.max(j, i + 1);
    }
  }

  // 2. Lexicon entries, wherever the text spells them (any case).
  for (const z of zones) {
    if (!z.cased) continue;
    for (let i = 0; i < z.words.length; i++) {
      const phrases = LEXICON_BY_FIRST_WORD.get(z.words[i]);
      if (!phrases) continue;
      outer: for (const phrase of phrases) {
        if (i + phrase.length > z.words.length) continue;
        for (let k = 1; k < phrase.length; k++) if (z.words[i + k] !== phrase[k]) continue outer;
        const surfaceTokens = matchTokens(z, i, phrase.length);
        if (surfaceTokens) addSurface(candidates, surfaceTokens, { lexicon: true });
      }
    }
  }

  // 3. Score: occurrences weighted by zone, counted case-insensitively. A
  // term the text uses too seldom to stand out is kept aside as `rare`: it is
  // only used to fill a short list (step 6).
  type Scored = { candidate: Candidate; score: number; total: number; display: string; rare: boolean; firstAt: number };
  const scored: Scored[] = [];
  for (const candidate of candidates.values()) {
    if (candidate.phrase.every(isGenericWord)) continue;
    const letters = candidate.key.replace(/[^a-z]/g, "");
    if (letters.length < 3) continue;

    let score = 0;
    let total = 0;
    let prominent = false;
    let firstAt = Number.MAX_SAFE_INTEGER;
    zones.forEach((z, zi) => {
      const n = countIn(z, candidate.phrase);
      if (!n) return;
      score += n * z.weight;
      total += n;
      if (z.weight >= 3) prominent = true;
      firstAt = Math.min(firstAt, zi);
    });

    let rare = false;
    if (!candidate.multi && !candidate.lexicon && !candidate.acronym) {
      // A proper noun is capitalised mid-sentence nearly every time it appears.
      const c = caps.get(candidate.key);
      if (!c || c.upper === 0 || c.upper / (c.upper + c.lower) < 0.75) continue;
      if (total < 3 && !prominent) rare = true;
    }
    if (total < 2 && !prominent) rare = true;

    if (candidate.multi) score *= 1.5;
    if (candidate.lexicon) score *= 1.4;
    if (candidate.acronym) score *= 0.9;

    const display = [...candidate.surfaces.entries()]
      .sort((a, b) => b[1] - a[1] || (isCapitalised(b[0]) ? 1 : 0) - (isCapitalised(a[0]) ? 1 : 0) || a[0].localeCompare(b[0]))[0][0];
    scored.push({ candidate, score, total, display, rare, firstAt });
  }

  // 4. Merge plural/singular spellings into the stronger one.
  const byKey = new Map(scored.map(s => [s.candidate.key, s]));
  for (const s of scored) {
    const key = s.candidate.key;
    if (!key.endsWith("s")) continue;
    const singular = byKey.get(key.slice(0, -1));
    if (!singular || singular.score < 0 || s.score < 0) continue;
    const [keep, drop] = singular.score >= s.score ? [singular, s] : [s, singular];
    keep.score += drop.score;
    keep.total += drop.total;
    drop.score = -1;
  }

  const ranked = scored
    .filter(s => s.score > 0 && !s.rare)
    .sort((a, b) => b.score - a.score || b.total - a.total || a.candidate.key.localeCompare(b.candidate.key));

  // 5. Pick greedily. A term that contains, or is contained in, a stronger pick
  // is skipped, except that a name replaces its single word when it accounts
  // for a good share of that word's uses ("Mandal Commission" over "Mandal").
  const picked: Scored[] = [];
  for (const s of ranked) {
    const words = s.candidate.phrase;
    const clashes = picked.filter(p => containsPhrase(p.candidate.phrase, words) || containsPhrase(words, p.candidate.phrase));
    if (clashes.length === 0) {
      if (picked.length < max) picked.push(s);
      continue;
    }
    const p = clashes[0];
    if (clashes.length === 1 && s.candidate.multi && !p.candidate.multi && containsPhrase(words, p.candidate.phrase) && s.total >= p.total * 0.4) {
      picked[picked.indexOf(p)] = s;
    }
  }

  // 6. A short list is filled first with names the text mentions only once or
  // twice: a new essay often names many people and places a single time each
  // ("Sher Shah Suri", "Chandragupta Maurya"). Names of several words and
  // lexicon entries come first, then single proper nouns; within each, the
  // weightier and then the earlier. A run of capitals seen only at the start
  // of a sentence is not used, as its first word may not be part of a name
  // ("Consider Shivaji").
  const floor = Math.min(SEO_TERMS_MIN, max);
  if (picked.length < floor) {
    const rare = scored
      .filter(s => s.rare && s.score > 0 && (!s.candidate.multi || s.candidate.lexicon || s.candidate.anchored))
      .sort((a, b) =>
        Number(b.candidate.multi || b.candidate.lexicon) - Number(a.candidate.multi || a.candidate.lexicon) ||
        b.score - a.score ||
        a.firstAt - b.firstAt ||
        a.candidate.key.localeCompare(b.candidate.key));
    for (const s of rare) {
      if (picked.length >= floor) break;
      const words = s.candidate.phrase;
      if (picked.some(p => containsPhrase(p.candidate.phrase, words) || containsPhrase(words, p.candidate.phrase))) continue;
      picked.push(s);
    }
  }

  const terms = picked.map(s => {
    const display = s.display.replace(/\s+/g, " ").trim();
    return /^\p{Ll}/u.test(display) ? display.charAt(0).toUpperCase() + display.slice(1) : display;
  });

  // 7. A list still short is filled with broad subject words the text uses,
  // most frequent first ("Philosophy", "History"), never one a pick already holds.
  if (terms.length < floor) {
    const held = new Set(picked.flatMap(s => s.candidate.phrase));
    const subjects = SUBJECTS
      .filter(word => !held.has(word))
      .map(word => ({ word, score: zones.reduce((sum, z) => sum + countIn(z, [word]) * z.weight, 0) }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
    for (const { word } of subjects) {
      if (terms.length >= floor) break;
      terms.push(word.charAt(0).toUpperCase() + word.slice(1));
    }
  }
  return terms;
}

export interface TopicSource {
  title?: unknown;
  subtitle?: unknown;
  excerpt?: unknown;
  abstract?: unknown;
  body?: unknown;
}

/** Terms derived from an article or paper record (excerpt, or abstract for a paper, as the summary). */
export function deriveWorkTerms(work: TopicSource, max = SEO_TERMS_MAX): string[] {
  return deriveSeoTerms({
    title: work.title,
    subtitle: work.subtitle,
    summary: work.excerpt ?? work.abstract,
    body: work.body,
  }, max);
}
