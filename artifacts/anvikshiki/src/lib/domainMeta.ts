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
  animal: string;
  color: string;
  description: string;
  route: string;
  countLabel?: string;
};

export const DOMAIN_META: Record<DomainKey, DomainMeta> = {
  philosophy: {
    label: "Philosophy",
    animal: "Serpent",
    color: "var(--terracotta)",
    description: "Reality, reasoning, self, knowledge, and truth.",
    route: "/domains/philosophy",
    countLabel: "Essays",
  },
  history: {
    label: "History",
    animal: "Ram",
    color: "var(--gold)",
    description: "Civilizations, memory, events, eras, and inheritance.",
    route: "/domains/history",
    countLabel: "Essays",
  },
  psychology: {
    label: "Psychology",
    animal: "Monkey",
    color: "var(--dusty-rose)",
    description: "Mind, behavior, consciousness, and inner landscapes.",
    route: "/domains/psychology",
    countLabel: "Essays",
  },
  sociology: {
    label: "Sociology",
    animal: "Crane",
    color: "var(--aged-jade)",
    description: "Communities, institutions, cultures, and shared patterns.",
    route: "/domains/sociology",
    countLabel: "Essays",
  },
  science: {
    label: "Science",
    animal: "Spider",
    color: "var(--manuscript-blue)",
    description: "Observation, logic, nature, systems, and discovery.",
    route: "/domains/science",
    countLabel: "Essays",
  },
  geopolitics: {
    label: "Geopolitics",
    animal: "Elephant",
    color: "var(--olive)",
    description: "Power, geography, statecraft, strategy, and place.",
    route: "/domains/geopolitics",
    countLabel: "Essays",
  },
  papers: {
    label: "Papers",
    animal: "Leopard",
    color: "var(--saffron-muted)",
    description: "Research manuscripts, working papers, and scholarship.",
    route: "/papers",
    countLabel: "Papers",
  },
  archive: {
    label: "Archive",
    animal: "Bull",
    color: "var(--gold)",
    description: "Texts, records, timelines, sources, and living memory.",
    route: "/archive",
    countLabel: "Items",
  },
  civilization: {
    label: "Civilization",
    animal: "Peacock",
    color: "var(--aged-jade)",
    description: "Living traditions, long memory, and cultural worlds.",
    route: "/domains/civilization",
    countLabel: "Essays",
  },
  "civilizational-thought": {
    label: "Civilizational Thought",
    animal: "Peacock",
    color: "var(--aged-jade)",
    description: "Long-arc inquiry into culture, tradition, and society.",
    route: "/domains/civilizational-thought",
    countLabel: "Essays",
  },
  aesthetics: {
    label: "Aesthetics",
    animal: "Peacock Lotus",
    color: "var(--dusty-rose)",
    description: "Art, beauty, literature, music, symbol, and form.",
    route: "/domains/aesthetics",
    countLabel: "Essays",
  },
  sanskrit: {
    label: "Sanskrit Studies",
    animal: "Crane Pen",
    color: "var(--gold)",
    description: "Language, shastra, grammar, and textual traditions.",
    route: "/domains/sanskrit-studies",
    countLabel: "Essays",
  },
  "sanskrit-studies": {
    label: "Sanskrit Studies",
    animal: "Crane Pen",
    color: "var(--gold)",
    description: "Language, shastra, grammar, and textual traditions.",
    route: "/domains/sanskrit-studies",
    countLabel: "Essays",
  },
  "political-theory": {
    label: "Political Theory",
    animal: "Lion",
    color: "var(--terracotta)",
    description: "State, order, sovereignty, justice, and power.",
    route: "/domains/political-theory",
    countLabel: "Essays",
  },
  translations: {
    label: "Translations",
    animal: "Two Birds",
    color: "var(--manuscript-blue)",
    description: "Texts moving between languages, worlds, and eras.",
    route: "/domains/translations",
    countLabel: "Texts",
  },
  multimedia: {
    label: "Multimedia",
    animal: "Bird",
    color: "var(--saffron-muted)",
    description: "Visual stories, lectures, audio, and interactive work.",
    route: "/domains/multimedia",
    countLabel: "Items",
  },
  community: {
    label: "Community",
    animal: "Crane Pair",
    color: "var(--aged-jade)",
    description: "Conversation, gathering, contribution, and shared inquiry.",
    route: "/community",
  },
  submit: {
    label: "Submit",
    animal: "Leopard Scroll",
    color: "var(--terracotta)",
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
