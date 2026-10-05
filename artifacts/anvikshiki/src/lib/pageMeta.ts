/**
 * Titles and descriptions of the fixed public pages, used when the SPA
 * navigates to them. The server renders the same values into the HTML
 * (artifacts/api-server/src/lib/page-meta.ts); the two copies must stay
 * identical, and an api-server test compares them.
 */
export const PAGE_META = {
  home: {
    title: "Ānvīkṣikī — Essays on History, Philosophy and Politics",
    description:
      "Essays in English on history, philosophy and politics, mostly about India and the wider Indic world. Every essay is free to read.",
  },
  archive: {
    title: "Archive of Published Essays — Ānvīkṣikī",
    description:
      "Every essay and paper published on Ānvīkṣikī, newest first, with its author, date and domain.",
  },
  domains: {
    title: "Domains — Ānvīkṣikī",
    description:
      "The subject areas Ānvīkṣikī files its essays under, with the number of published works in each.",
  },
  papers: {
    title: "Research Papers — Ānvīkṣikī",
    description: "Research papers published on Ānvīkṣikī, newest first.",
  },
  contact: {
    title: "Contact — Ānvīkṣikī",
    description:
      "How to reach the editor of Ānvīkṣikī about submissions, corrections to published essays and other questions.",
  },
  privacy: {
    title: "Privacy Policy — Ānvīkṣikī",
    description: "What information Ānvīkṣikī collects, how it is used and where it is stored.",
  },
  terms: {
    title: "Terms of Service — Ānvīkṣikī",
    description: "The terms for using Ānvīkṣikī, holding an account and submitting work for publication.",
  },
  community: {
    title: "Community — Ānvīkṣikī",
    description: "Member profiles, discussions and events for readers and contributors of Ānvīkṣikī.",
  },
  submit: {
    title: "Submit Your Work — Ānvīkṣikī",
    description:
      "How to submit an essay, review, translation or research paper to Ānvīkṣikī, what to include and what happens after you submit.",
  },
  about: {
    title: "About Ānvīkṣikī: An Open Journal of Indic Philosophy & Civilizational Thought",
    description:
      "Ānvīkṣikī is a free-to-read online journal of essays on history, philosophy and politics. Its aims, what it accepts and how to submit work.",
  },
  aboutAnvikshiki: {
    title: "Meaning of Ānvīkṣikī: Etymology, Philosophy & Classical Heritage — Ānvīkṣikī",
    description:
      "Explore the profound meaning of Ānvīkṣikī (आन्वीक्षिकी): the Sanskrit etymology, Kautilya's Arthaśāstra doctrine of the foundational science, and Nyāya rational inquiry.",
  },
  browse: {
    title: "Browse Published Articles & Papers — Ānvīkṣikī",
    description:
      "Every article and paper published on Ānvīkṣikī, grouped by discipline: Indic philosophy, Sanskrit traditions, history and civilizational thought.",
  },
} as const;

export type PageMetaKey = keyof typeof PAGE_META;
