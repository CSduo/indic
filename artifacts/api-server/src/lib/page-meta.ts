/**
 * Titles and descriptions of the fixed public pages.
 *
 * The SPA sets the same values when it navigates to these pages
 * (artifacts/anvikshiki/src/lib/pageMeta.ts). The two copies must stay
 * identical; page-meta.test.ts compares them.
 *
 * Every description states only what the page holds. The home description
 * reflects the essays published so far; update it when the mix of subjects
 * changes.
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
      "Every essay and paper published on Ānvīkṣikī, grouped by year, with its author, date, domain and a short summary of what it covers.",
  },
  domains: {
    title: "Domains — Ānvīkṣikī",
    description:
      "The subject areas Ānvīkṣikī files its essays under: what each one covers, how many works it holds and a summary of every essay in it.",
  },
  papers: {
    title: "Research Papers — Ānvīkṣikī",
    description: "Research papers published on Ānvīkṣikī, newest first.",
  },
  contact: {
    title: "Contact — Ānvīkṣikī",
    description:
      "How to reach the editor of Ānvīkṣikī by email about submissions, corrections to published essays and any other questions about the journal.",
  },
  privacy: {
    title: "Privacy Policy — Ānvīkṣikī",
    description:
      "What information Ānvīkṣikī collects from readers, members and authors, how it is used, how it is protected and where it is stored.",
  },
  terms: {
    title: "Terms of Service — Ānvīkṣikī",
    description:
      "The terms for reading Ānvīkṣikī, holding an account and submitting work for publication, including who owns the work that is published.",
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
      "What the Sanskrit word Ānvīkṣikī (आन्वीक्षिकी) means: its etymology, Kautilya's account of it in the Arthaśāstra and its place in Nyāya logic.",
  },
  browse: {
    title: "Browse Published Articles & Papers — Ānvīkṣikī",
    description:
      "Every article and paper published on Ānvīkṣikī, grouped by discipline: Indic philosophy, Sanskrit traditions, history and civilizational thought.",
  },
} as const;

export type PageMetaKey = keyof typeof PAGE_META;

/** The editorial address already published on the contact page. */
export const CONTACT_EMAIL = "xiyatosaanvi@gmail.com";
