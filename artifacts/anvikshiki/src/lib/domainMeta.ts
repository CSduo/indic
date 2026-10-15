export type DomainKey =
  | "philosophy"
  | "history"
  | "psychology"
  | "sociology"
  | "science"
  | "geopolitics"
  | "papers"
  | "archive"
  | "civilization"
  | "civilizational-thought"
  | "aesthetics"
  | "sanskrit"
  | "sanskrit-studies"
  | "political-theory"
  | "translations"
  | "multimedia"
  | "community"
  | "submit";

export type DomainMeta = {
  label: string;
  /** Devanagari name shown above the English label on domain cards. */
  sanskritName?: string;
  color: string;
  description: string;
  route: string;
  countLabel?: string;
};

export const DOMAIN_META: Record<DomainKey, DomainMeta> = {
  philosophy: {
    label: "Philosophy",
    sanskritName: "दर्शन",
    color: "var(--domain-ink)",
    description: "Reality, reasoning, self, knowledge, and truth.",
    route: "/domains/philosophy",
    countLabel: "Essays",
  },
  history: {
    label: "History",
    sanskritName: "इतिहास",
    color: "var(--domain-ink)",
    description: "Civilizations, memory, events, eras, and inheritance.",
    route: "/domains/history",
    countLabel: "Essays",
  },
  psychology: {
    label: "Psychology",
    sanskritName: "मनोविज्ञान",
    color: "var(--domain-ink)",
    description: "Mind, behavior, consciousness, and inner landscapes.",
    route: "/domains/psychology",
    countLabel: "Essays",
  },
  sociology: {
    label: "Sociology",
    sanskritName: "समाजशास्त्र",
    color: "var(--domain-ink)",
    description: "Communities, institutions, cultures, and shared patterns.",
    route: "/domains/sociology",
    countLabel: "Essays",
  },
  science: {
    label: "Science",
    sanskritName: "विज्ञान",
    color: "var(--domain-ink)",
    description: "Observation, logic, nature, systems, and discovery.",
    route: "/domains/science",
    countLabel: "Essays",
  },
  geopolitics: {
    label: "Geopolitics",
    sanskritName: "भूराजनीति",
    color: "var(--domain-ink)",
    description: "Power, geography, statecraft, strategy, and place.",
    route: "/domains/geopolitics",
    countLabel: "Essays",
  },
  papers: {
    label: "Papers",
    sanskritName: "शोधपत्र",
    color: "var(--domain-ink)",
    description: "Research manuscripts, working papers, and scholarship.",
    route: "/papers",
    countLabel: "Papers",
  },
  archive: {
    label: "Archive",
    sanskritName: "अभिलेखागार",
    color: "var(--domain-ink)",
    description: "Texts, records, timelines, sources, and living memory.",
    route: "/archive",
    countLabel: "Items",
  },
  civilization: {
    label: "Civilization",
    sanskritName: "सभ्यता",
    color: "var(--domain-ink)",
    description: "Living traditions, long memory, and cultural worlds.",
    route: "/domains/civilization",
    countLabel: "Essays",
  },
  "civilizational-thought": {
    label: "Civilizational Thought",
    sanskritName: "सभ्यता-चिन्तन",
    color: "var(--domain-ink)",
    description: "Long-arc inquiry into culture, tradition, and society.",
    route: "/domains/civilizational-thought",
    countLabel: "Essays",
  },
  aesthetics: {
    label: "Aesthetics",
    sanskritName: "सौन्दर्यशास्त्र",
    color: "var(--domain-ink)",
    description: "Art, beauty, literature, music, symbol, and form.",
    route: "/domains/aesthetics",
    countLabel: "Essays",
  },
  sanskrit: {
    label: "Sanskrit Studies",
    sanskritName: "संस्कृत-अध्ययन",
    color: "var(--domain-ink)",
    description: "Language, shastra, grammar, and textual traditions.",
    route: "/domains/sanskrit-studies",
    countLabel: "Essays",
  },
  "sanskrit-studies": {
    label: "Sanskrit Studies",
    sanskritName: "संस्कृत-अध्ययन",
    color: "var(--domain-ink)",
    description: "Language, shastra, grammar, and textual traditions.",
    route: "/domains/sanskrit-studies",
    countLabel: "Essays",
  },
  "political-theory": {
    label: "Political Theory",
    sanskritName: "राजनीतिशास्त्र",
    color: "var(--domain-ink)",
    description: "State, order, sovereignty, justice, and power.",
    route: "/domains/political-theory",
    countLabel: "Essays",
  },
  translations: {
    label: "Translations",
    sanskritName: "अनुवाद",
    color: "var(--domain-ink)",
    description: "Texts moving between languages, worlds, and eras.",
    route: "/domains/translations",
    countLabel: "Texts",
  },
  multimedia: {
    label: "Multimedia",
    sanskritName: "दृश्य-श्रव्य",
    color: "var(--domain-ink)",
    description: "Visual stories, lectures, audio, and interactive work.",
    route: "/domains/multimedia",
    countLabel: "Items",
  },
  community: {
    label: "Community",
    color: "var(--domain-ink)",
    description: "Conversation, gathering, contribution, and shared inquiry.",
    route: "/community",
  },
  submit: {
    label: "Submit",
    color: "var(--domain-ink)",
    description: "Send your work into the living archive.",
    route: "/submit",
  },
};

export const DOMAIN_ORDER: DomainKey[] = [
  "philosophy",
  "history",
  "psychology",
  "sociology",
  "science",
  "geopolitics",
  "papers",
  "archive",
  "civilizational-thought",
  "aesthetics",
  "sanskrit-studies",
  "political-theory",
  "translations",
  "multimedia",
];

export function normalizeDomainKey(value?: string | null): DomainKey {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

  if (key in DOMAIN_META) return key as DomainKey;
  if (key === "civilizations" || key === "civilisation") return "civilizational-thought";
  if (key === "sanskrit-studies") return "sanskrit-studies";
  if (key === "research" || key === "paper") return "papers";
  if (key === "essay" || key === "essays" || key === "journal") return "philosophy";
  return "archive";
}

export function getDomainMeta(value?: string | null): DomainMeta & { key: DomainKey } {
  const key = normalizeDomainKey(value);
  return { key, ...DOMAIN_META[key] };
}
