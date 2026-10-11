/**
 * Editorial layer for works already published, kept in code so it can be
 * maintained without editing the stored article. Values here are used only
 * where the database field is empty: anything an editor sets on the article
 * itself always wins.
 *
 * Every reference below was checked against its source (Crossref for the DOI,
 * the live Medium page, the publisher records). Tags must appear in the
 * essay's own text.
 */

export interface EditorialReference {
  title: string;
  url?: string;
  authors?: string;
  publisher?: string;
  year?: string;
  doi?: string;
  note?: string;
}

export interface EditorialOverride {
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
  references?: EditorialReference[];
  /** Short editor's note shown above the references, e.g. a credit statement. */
  sourcesNote?: string;
}

export const EDITORIAL_OVERRIDES: Record<string, EditorialOverride> = {
  "quantum-eternal": {
    seoTitle: "How Schrödinger Found Solace in the Upanishads",
    seoDescription:
      "How physicist Erwin Schrödinger turned to the Upanishads and Advaita Vedānta for his view of consciousness, identity and the self.",
    tags: ["Erwin Schrödinger", "Upanishads", "Vedanta", "Advaita Vedānta", "quantum", "consciousness"],
    sourcesNote:
      "Editor's note: this essay's account of Schrödinger's notebooks, his reading of Śaṅkara's Advaita Vedānta and his doctrine of identity draws on, and in places closely follows, Latten (2025). The line that Schrödinger read the Upanishads \"not as textbooks, but as companions\" is from Srivastava's essay on Medium.",
    references: [
      {
        authors: "Thijs M. K. Latten",
        year: "2025",
        title: "Schrödinger's Doctrine of Identity: On the Role of Advaita Vedānta in Erwin Schrödinger's Thought",
        publisher: "Berichte zur Wissenschaftsgeschichte 48 (1–2): 44–71. Wiley",
        doi: "10.1002/bewi.202400027",
        url: "https://doi.org/10.1002/bewi.202400027",
        note: "Source of the essay's discussion of Schrödinger's notebooks, Śaṅkara's Advaita Vedānta and the doctrine of identity.",
      },
      {
        authors: "Satvik Srivastava",
        title: "Did Schrödinger Take His Wave Equation from the Vedas?",
        publisher: "Medium",
        url: "https://medium.com/@satviksrivastava10/did-schr%C3%B6dinger-take-his-wave-equation-from-the-vedas-a9b9116483db",
        note: "Source of the line \"not as textbooks, but as companions\".",
      },
      {
        authors: "Erwin Schrödinger",
        year: "1964",
        title: "My View of the World",
        publisher: "Cambridge University Press (translation of Meine Weltansicht, 1961)",
        note: "Quoted in the essay.",
      },
      {
        authors: "Erwin Schrödinger",
        year: "1944",
        title: "What Is Life? The Physical Aspect of the Living Cell",
        publisher: "Cambridge University Press",
        note: "Quoted in the essay.",
      },
    ],
  },
  "beyond-angkor-why-is-vietnam-frequently-excluded-from-the-history-of-hindu-influence-in-southeast-asia-86ef8134": {
    seoTitle: "Champa and Hindu Influence in Vietnam: Beyond Angkor",
    seoDescription:
      "Why is Champa, the Hindu kingdom of central Vietnam, so often left out of the history of Hindu influence in Southeast Asia?",
    tags: ["Champa", "Vietnam", "Angkor", "Southeast Asia", "Hindu"],
  },
  "indo-fijians-overtook-indigenous-fijians-numerically-1940s": {
    seoTitle: "Why Indo-Fijians Became a Minority in Fiji",
    seoDescription:
      "Indo-Fijians outnumbered indigenous Fijians by 1946. Girmit, colonial policy, fertility, the coups and emigration explain why they are a minority today.",
    tags: ["Indo-Fijians", "Fiji", "Girmit", "Bavadra", "emigration", "demography"],
  },
  "arithmetic-betrayal": {
    seoTitle: "The Mandal Commission and India's New Caste Hierarchy",
    seoDescription:
      "How the Mandal Commission, OBC reservations and the Indra Sawhney judgment reshaped Indian politics and the balance of caste power.",
    tags: ["Mandal Commission", "OBC", "Indra Sawhney", "VP Singh", "caste", "Hindutva"],
  },
  "the-human-tapestry-of-the-slave-trade": {
    seoTitle: "The Human Tapestry of the Transatlantic Slave Trade",
    seoDescription:
      "How the transatlantic slave trade dismantled African societies, and how their peoples, beliefs and traditions survived across the Americas.",
    tags: ["slave trade", "transatlantic", "Yoruba", "Santería", "Africa"],
  },
  "triple-fragmentation": {
    seoTitle: "The Triple Fragmentation: India's Crisis of Coherence",
    seoDescription:
      "An essay on the crisis of coherence facing the project of building a modern Indian nation-state, and the fractures behind it.",
    tags: ["nation-state", "Indic", "civilizational", "coherence"],
  },
  "why-this-website-exists-0fc91e71": {
    seoTitle: "Why Ānvīkṣikī Exists: Our Mission",
    seoDescription:
      "Why Ānvīkṣikī was started: a serious research platform for Indic thought, culture, history, philosophy, politics and society.",
    tags: ["Indic", "research", "philosophy", "history"],
  },
};

export function editorialOverride(slug: string): EditorialOverride | undefined {
  return EDITORIAL_OVERRIDES[slug];
}
