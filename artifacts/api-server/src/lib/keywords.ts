/**
 * Dynamic Keyword Enrichment Engine for Ānvīkṣikī
 *
 * Automatically enriches articles, papers, author authority hubs, domain archives,
 * browse index, and about pages with high-ranking Google search keywords
 * (such as "Hindu article", "Hindu philosophy", "Indic research", "Sanatana Dharma scholarship", etc.)
 * and prepares structured metadata for Schema.org JSON-LD and crawlers.
 */

export interface EnrichedKeywords {
  keywordsStr: string;
  newsKeywordsStr: string;
  keywordsList: string[];
  aboutThings: Array<{ "@type": "Thing"; name: string }>;
}

export interface AuthorEnrichedKeywords {
  keywordsStr: string;
  newsKeywordsStr: string;
  keywordsList: string[];
  knowsAbout: string[];
}

/**
 * Universal search queries users use to discover Indic scholarship on Google.
 */
export const CORE_UNIVERSAL_TERMS: readonly string[] = [
  "Hindu article",
  "Hindu philosophy",
  "Indic research",
  "Sanatana Dharma scholarship",
  "ancient Indian history",
  "Vedic science",
  "Nyaya",
  "Vedanta",
] as const;

/**
 * Domain-specific keyword clusters for all 10 platform categories.
 */
export const DOMAIN_KEYWORD_CLUSTERS: Record<string, string[]> = {
  philosophy: [
    "Hindu philosophy",
    "Indian philosophy",
    "Darshana",
    "Nyaya epistemology",
    "Advaita Vedanta",
    "Vaisheshika ontology",
    "Samkhya metaphysics",
    "Purva Mimamsa",
    "Kashmir Shaivism",
    "pramana theory",
    "Hindu philosophical treatises",
    "classical Indian thought",
  ],
  history: [
    "ancient Indian history",
    "Indic historiography",
    "Itihasa",
    "Champa civilization",
    "Indian maritime history",
    "colonial deindustrialization",
    "Drain of Wealth theory",
    "Indo-Fijian history",
    "civilizational memory",
    "Greater India historiography",
  ],
  science: [
    "Vedic science",
    "Indian mathematics",
    "Kerala school of astronomy",
    "Sulba Sutras",
    "Ayurveda",
    "ancient Indian astronomy",
    "ancient Indian metallurgy",
    "Indian Knowledge Systems",
    "IKS research",
  ],
  "sanskrit-studies": [
    "Sanskrit studies",
    "Paninian grammar",
    "Ashtadhyayi",
    "Vedic Sanskrit",
    "Kavya literature",
    "Sanskrit philology",
    "Sanskrit epigraphy",
    "Sanskrit manuscripts",
    "Indic linguistics",
  ],
  "civilizational-thought": [
    "Sanatana Dharma scholarship",
    "Indian civilizational thought",
    "Dharmashastra",
    "civilizational continuity",
    "Indic worldviews",
    "Bharata",
    "decolonial Indic studies",
    "civilizational identity",
  ],
  aesthetics: [
    "Indian aesthetics",
    "Rasa theory",
    "Natya Shastra",
    "Abhinavagupta",
    "Dhvani theory",
    "Indian temple architecture",
    "Silpa Shastra",
    "classical Indian arts",
    "aesthetic experience in Hinduism",
  ],
  "political-theory": [
    "Indic political theory",
    "Arthashastra",
    "Kautilya",
    "Rajadharma",
    "ancient Indian statecraft",
    "mandala theory",
    "dharma and governance",
    "Indian strategic thought",
  ],
  sociology: [
    "Indian sociology",
    "Varna and Jati scholarship",
    "Ashrama dharma",
    "Indian social structures",
    "community traditions in India",
    "decolonial sociology",
    "Indic social thought",
  ],
  psychology: [
    "Indian psychology",
    "Yoga sutras of Patanjali",
    "consciousness studies",
    "antahkarana",
    "chitta vritti",
    "mind in Hindu thought",
    "mindfulness and dhyana",
    "Buddhist and Hindu psychology",
  ],
  geopolitics: [
    "Indic geopolitics",
    "Indian strategic traditions",
    "Indo-Pacific civilizational links",
    "South Asian geopolitics",
    "Indian Ocean trade routes",
    "mandala diplomacy",
    "Greater India geopolitics",
  ],
};

/**
 * Category aliases mapping legacy or shorthand slugs to canonical slugs.
 */
export const CATEGORY_ALIASES: Record<string, string> = {
  sanskrit: "sanskrit-studies",
  "indian-philosophy": "philosophy",
  "indic-civilization": "civilizational-thought",
  "indian-history": "history",
  "art-aesthetics": "aesthetics",
  iks: "science",
  "indian-knowledge-systems": "science",
  "political-science": "political-theory",
};

export function resolveCategory(rawSlug?: string): string {
  if (!rawSlug) return "philosophy";
  const slug = rawSlug.trim().toLowerCase();
  return CATEGORY_ALIASES[slug] || slug;
}

/**
 * Specific historical overrides for flagship articles.
 */
export const ARTICLE_SLUG_OVERRIDES: Record<string, string[]> = {
  "beyond-angkor-why-is-vietnam-frequently-excluded-from-the-history-of-hindu-influence-in-southeast-asia": [
    "Champa civilization",
    "Mỹ Sơn sanctuary",
    "Hinduism in Vietnam",
    "Southeast Asian Indic traditions",
    "Sanskrit inscriptions of Champa",
    "Śaivism in Champa",
    "Greater India historiography",
    "Indianized kingdoms",
  ],
  "beyond-angkor-why-is-vietnam-frequently-excluded-from-the-history-of-hindu-influence-in-southeast-asia-86ef8134": [
    "Champa civilization",
    "Mỹ Sơn sanctuary",
    "Hinduism in Vietnam",
    "Southeast Asian Indic traditions",
    "Sanskrit inscriptions of Champa",
    "Śaivism in Champa",
    "Greater India historiography",
    "Indianized kingdoms",
  ],
  "quantum-eternal": [
    "Quantum physics and Vedanta",
    "Indic philosophy and quantum mechanics",
    "Schrödinger and Upanishads",
    "Consciousness in Indian philosophy",
    "Brahman and quantum reality",
    "Eastern metaphysics",
  ],
  "arithmetic-betrayal": [
    "Indian economic history",
    "Colonial deindustrialization",
    "Drain of wealth theory",
    "Dadabhai Naoroji",
    "Indic civilization economics",
  ],
  "triple-fragmentation": [
    "Indic historiography",
    "Civilizational memory",
    "Colonial fragmentation of India",
    "Indian intellectual history",
  ],
  "indo-fijians-overtook-indigenous-fijians-numerically-1940s": [
    "Indo-Fijian history",
    "Girmitiya indenture system",
    "Indian diaspora in Fiji",
    "Colonial migration",
    "Fijian demographic history",
  ],
  "the-human-tapestry-of-the-slave-trade": [
    "Indian Ocean slave trade",
    "Historical slavery in South Asia",
    "Colonial servitude",
    "Maritime history of India",
  ],
  "why-this-website-exists-0fc91e71": [
    "Ānvīkṣikī journal",
    "Indic studies open access",
    "Classical Indian philosophy",
    "Sanskrit intellectual traditions",
    "Critical rational inquiry",
  ],
  "why-this-website-exists": [
    "Ānvīkṣikī journal",
    "Indic studies open access",
    "Classical Indian philosophy",
    "Sanskrit intellectual traditions",
    "Critical rational inquiry",
  ],
};

interface TopicDetectionRule {
  pattern: RegExp;
  terms: string[];
}

const CONTENT_TOPIC_RULES: TopicDetectionRule[] = [
  {
    pattern: /\b(champa|my\s+son|vietnam|southeast\s+asia|angkor|hinduism\s+in\s+vietnam|saivism\s+in\s+champa)\b/i,
    terms: [
      "Champa civilization",
      "Mỹ Sơn sanctuary",
      "Hinduism in Vietnam",
      "Southeast Asian Indic traditions",
      "Sanskrit inscriptions of Champa",
      "Greater India historiography",
    ],
  },
  {
    pattern: /\b(quantum|schrodinger|heisenberg|physics|quantum\s+reality)\b/i,
    terms: [
      "Quantum physics and Vedanta",
      "Indic philosophy and quantum mechanics",
      "Schrödinger and Upanishads",
      "Brahman and quantum reality",
      "Eastern metaphysics",
    ],
  },
  {
    pattern: /\b(fiji|girmitiya|indenture|indo-fijian)\b/i,
    terms: [
      "Indo-Fijian history",
      "Girmitiya indenture system",
      "Indian diaspora in Fiji",
      "Colonial migration",
    ],
  },
  {
    pattern: /\b(slave\s+trade|slavery|maritime\s+history)\b/i,
    terms: [
      "Indian Ocean slave trade",
      "Historical slavery in South Asia",
      "Colonial servitude",
      "Maritime history of India",
    ],
  },
  {
    pattern: /\b(drain\s+of\s+wealth|naoroji|deindustrialization|colonial\s+economy)\b/i,
    terms: [
      "Indian economic history",
      "Colonial deindustrialization",
      "Drain of wealth theory",
      "Dadabhai Naoroji",
    ],
  },
  {
    pattern: /\b(nyaya|pramana|epistemolog|vatsyayana|gautama|tarka|hetu|anumana)\b/i,
    terms: [
      "Nyaya epistemology",
      "Pramana theory",
      "Indian logic",
      "classical Indian epistemological debate",
    ],
  },
  {
    pattern: /\b(vedanta|upanishad|shankara|advaita|brahman|atman|maya)\b/i,
    terms: [
      "Advaita Vedanta",
      "Upanishadic philosophy",
      "Shankara",
      "Brahman and Atman",
    ],
  },
  {
    pattern: /\b(samkhya|purusha|prakriti|ishvarakrishna|gunas)\b/i,
    terms: [
      "Samkhya metaphysics",
      "Purusha and Prakriti",
      "dualism in Indian philosophy",
    ],
  },
  {
    pattern: /\b(yoga|patanjali|dhyana|samadhi|pranayama|chitta)\b/i,
    terms: [
      "Classical Yoga",
      "Patanjali Yoga Sutras",
      "mind and meditation in Indian thought",
    ],
  },
  {
    pattern: /\b(mimamsa|jaimini|shabara|kumarila|yajna|vedic\s+ritual)\b/i,
    terms: [
      "Purva Mimamsa",
      "Vedic hermeneutics",
      "Jaimini Sutras",
    ],
  },
  {
    pattern: /\b(kautilya|arthashastra|rajadharma|mandala\s+theory|statecraft)\b/i,
    terms: [
      "Kautilya Arthashastra",
      "ancient Indian statecraft",
      "Rajadharma",
      "Indic political theory",
    ],
  },
  {
    pattern: /\b(ayurveda|charaka|sushruta|dosha|rasayana)\b/i,
    terms: [
      "Ayurveda",
      "ancient Indian medicine",
      "Charaka Samhita",
    ],
  },
  {
    pattern: /\b(panini|ashtadhyayi|vyakarana|dhatupatha|sanskrit\s+grammar)\b/i,
    terms: [
      "Paninian grammar",
      "Ashtadhyayi",
      "Sanskrit linguistics",
    ],
  },
  {
    pattern: /\b(rasa|natyashastra|abhinavagupta|dhvani|anandavardhana)\b/i,
    terms: [
      "Rasa theory",
      "Natya Shastra",
      "Abhinavagupta",
      "Indian aesthetics",
    ],
  },
  {
    pattern: /\b(astronomy|mathematics|aryabhata|madhava|sulba\s+sutras|sine\s+series)\b/i,
    terms: [
      "Indian mathematics",
      "ancient Indian astronomy",
      "Kerala school of astronomy",
    ],
  },
];

/**
 * Extract content-aware keywords based on text rules.
 */
export function extractContentKeywords(text: string): string[] {
  if (!text) return [];
  const detected: string[] = [];
  for (const rule of CONTENT_TOPIC_RULES) {
    if (rule.pattern.test(text)) {
      detected.push(...rule.terms);
    }
  }
  return detected;
}

export interface EnrichKeywordsOptions {
  title?: string;
  slug?: string;
  categorySlug?: string;
  dbTags?: string[] | string;
  content?: string;
}

/**
 * Dynamic keyword enrichment for articles and research papers.
 * Combines core universal search terms, domain clusters, slug overrides,
 * database tags, and content-derived concepts.
 */
export function enrichKeywords({
  title = "",
  slug = "",
  categorySlug = "",
  dbTags,
  content = "",
}: EnrichKeywordsOptions): EnrichedKeywords {
  const cleanSlug = slug.replace(/-[a-f0-9]{4,8}$/, "");
  const canonicalCategory = resolveCategory(categorySlug);

  // 1. Normalized database tags
  const parsedDbTags: string[] = Array.isArray(dbTags)
    ? dbTags.filter(Boolean)
    : typeof dbTags === "string"
    ? dbTags.split(/,\s*/).map((s) => s.trim()).filter(Boolean)
    : [];

  // 2. Slug overrides
  const slugOverrideTerms = ARTICLE_SLUG_OVERRIDES[slug] || ARTICLE_SLUG_OVERRIDES[cleanSlug] || [];

  // 3. Content & title detection
  const combinedText = `${title} ${slug} ${content}`;
  const contentTerms = extractContentKeywords(combinedText);

  // 4. Domain-specific cluster
  const domainCluster = DOMAIN_KEYWORD_CLUSTERS[canonicalCategory] || DOMAIN_KEYWORD_CLUSTERS.philosophy;

  // 5. Universal Indic search terms
  // "Hindu article", "Hindu philosophy", "Indic research", "Sanatana Dharma scholarship", etc.
  const universalTerms = [...CORE_UNIVERSAL_TERMS];

  // 6. Assemble in order of priority:
  // - Specific slug overrides / detected specific terms
  // - Specific database tags
  // - Domain cluster
  // - Universal search terms
  const rawList: string[] = [
    ...slugOverrideTerms,
    ...contentTerms,
    ...parsedDbTags,
    ...domainCluster,
    ...universalTerms,
  ];

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const keywordsList: string[] = [];
  for (const term of rawList) {
    const trimmed = term.trim();
    const lower = trimmed.toLowerCase();
    if (trimmed && !seen.has(lower)) {
      seen.add(lower);
      keywordsList.push(trimmed);
    }
  }

  // Google News keywords: top 8-10 highly relevant search terms
  // Must prioritize: "Hindu article", "Hindu philosophy", primary topic keywords
  const newsTermsCandidates = [
    "Hindu article",
    "Hindu philosophy",
    "Indic research",
    ...slugOverrideTerms,
    ...contentTerms.slice(0, 3),
    ...parsedDbTags.slice(0, 2),
    ...domainCluster.slice(0, 2),
    "Sanatana Dharma scholarship",
    "ancient Indian history",
    "Vedic science",
  ];

  const newsSeen = new Set<string>();
  const newsKeywordsList: string[] = [];
  for (const term of newsTermsCandidates) {
    const trimmed = term.trim();
    const lower = trimmed.toLowerCase();
    if (trimmed && !newsSeen.has(lower)) {
      newsSeen.add(lower);
      newsKeywordsList.push(trimmed);
    }
    if (newsKeywordsList.length >= 10) break;
  }

  const keywordsStr = keywordsList.join(", ");
  const newsKeywordsStr = newsKeywordsList.join(", ");
  const aboutThings = keywordsList.map((name) => ({
    "@type": "Thing" as const,
    name,
  }));

  return {
    keywordsStr,
    newsKeywordsStr,
    keywordsList,
    aboutThings,
  };
}

/**
 * Enriches author keywords with scholar discovery terms and subject domains.
 */
export function enrichAuthorKeywords({
  name = "",
  bio = "",
  institution,
  publicationTags = [],
  publicationCategories = [],
}: {
  name?: string;
  bio?: string;
  institution?: string | null;
  publicationTags?: string[];
  publicationCategories?: string[];
}): AuthorEnrichedKeywords {
  const scholarDiscoveryTerms = [
    "Indic scholar",
    "Hindu philosophy researcher",
    "Sanatana Dharma scholarship",
    "ancient Indian history researcher",
    "Indian intellectual traditions",
    "Vedic science contributor",
    "Ānvīkṣikī author",
  ];

  const resolvedCategories = publicationCategories
    .map(resolveCategory)
    .flatMap((cat) => DOMAIN_KEYWORD_CLUSTERS[cat] || []);

  const rawList: string[] = [
    ...scholarDiscoveryTerms,
    ...publicationTags,
    ...resolvedCategories.slice(0, 6),
    ...(institution ? [institution] : []),
    ...CORE_UNIVERSAL_TERMS,
  ];

  const seen = new Set<string>();
  const keywordsList: string[] = [];
  for (const item of rawList) {
    const trimmed = item.trim();
    const lower = trimmed.toLowerCase();
    if (trimmed && !seen.has(lower)) {
      seen.add(lower);
      keywordsList.push(trimmed);
    }
  }

  const knowsAbout = Array.from(new Set([
    "Hindu philosophy",
    "Indic studies",
    "Indian intellectual traditions",
    ...publicationCategories.map(resolveCategory),
    ...publicationTags.slice(0, 10),
  ]));

  const newsKeywordsList = [
    "Indic scholar",
    "Hindu philosophy researcher",
    "Sanatana Dharma scholarship",
    "Indic research",
    ...publicationTags.slice(0, 4),
  ].slice(0, 8);

  return {
    keywordsStr: keywordsList.join(", "),
    newsKeywordsStr: newsKeywordsList.join(", "),
    keywordsList,
    knowsAbout,
  };
}

/**
 * Enriches domain archive keywords with domain-specific clusters and universal queries.
 */
export function enrichDomainKeywords(
  categorySlug: string,
  categoryName?: string
): EnrichedKeywords {
  const canonicalSlug = resolveCategory(categorySlug);
  const cluster = DOMAIN_KEYWORD_CLUSTERS[canonicalSlug] || DOMAIN_KEYWORD_CLUSTERS.philosophy;
  const displayName = categoryName || canonicalSlug.replace(/-/g, " ");

  const rawList: string[] = [
    `${displayName} archive`,
    `${displayName} research`,
    ...cluster,
    ...CORE_UNIVERSAL_TERMS,
    "Ānvīkṣikī journal",
    "Indic studies archive",
  ];

  const seen = new Set<string>();
  const keywordsList: string[] = [];
  for (const item of rawList) {
    const trimmed = item.trim();
    const lower = trimmed.toLowerCase();
    if (trimmed && !seen.has(lower)) {
      seen.add(lower);
      keywordsList.push(trimmed);
    }
  }

  const newsKeywordsList = [
    "Hindu article",
    "Hindu philosophy",
    `${displayName} research`,
    ...cluster.slice(0, 5),
    "Indic research",
  ].slice(0, 8);

  return {
    keywordsStr: keywordsList.join(", "),
    newsKeywordsStr: newsKeywordsList.join(", "),
    keywordsList,
    aboutThings: keywordsList.map((name) => ({
      "@type": "Thing" as const,
      name,
    })),
  };
}

/**
 * Pre-configured keywords for /about and /browse pages.
 */
export const ABOUT_PAGE_KEYWORDS = {
  keywordsStr:
    "Ānvīkṣikī, Hindu article, Hindu philosophy, Indic research, Sanatana Dharma scholarship, ancient Indian history, Vedic science, Nyaya, Vedanta, Sanskrit studies, Indian civilizational thought, open access journal, peer-reviewed Indic research",
  newsKeywordsStr:
    "Hindu article, Hindu philosophy, Indic research, Sanatana Dharma scholarship, ancient Indian history, Vedic science, Indian intellectual heritage",
};

export const BROWSE_PAGE_KEYWORDS = {
  keywordsStr:
    "Browse Indic research, Hindu article, Hindu philosophy, research papers, Indic scholarship, ancient Indian history, Vedic science, Nyaya, Vedanta, Sanskrit studies, civilizational thought, Ānvīkṣikī archives",
  newsKeywordsStr:
    "Hindu article, Hindu philosophy, Indic research, research papers, Indic scholarship, ancient Indian history",
};
