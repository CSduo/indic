import { vi } from "vitest";

export interface FixtureArticle {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  body: string;
  categorySlug: string;
  tags: string[];
  authorName: string;
  readingMinutes?: number | null;
  heroImageUrl?: string | null;
  heroImageAlt?: string | null;
  audioUrl?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt: Date | string | null;
  keyTakeaways?: string[];
  references?: any[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  doi?: string | null;
}

export interface FixturePaper {
  id: string;
  slug: string;
  title: string;
  abstract?: string | null;
  body: string;
  categorySlug: string;
  tags: string[];
  authorName: string;
  institution?: string | null;
  readingMinutes?: number | null;
  pdfUrl?: string | null;
  coverImageUrl?: string | null;
  citationText?: string | null;
  references?: any[];
  peerReviewed?: boolean;
  paperType?: string;
  year?: number | null;
  doi?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt: Date | string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface FixtureAuthor {
  id: string;
  handle: string;
  name: string;
  bio?: string | null;
  institution?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface FixtureCategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
}

export const FIXTURE_ARTICLES: FixtureArticle[] = [
  {
    id: "art-1",
    slug: "nyaya-epistemology-pramana-theory",
    title: "Nyāya Epistemology: A Critical Analysis of Pramāṇa Theory",
    subtitle: "Exploring perception, inference, analogy, and testimony in classical Indian epistemology",
    excerpt: "An exhaustive investigation into Akṣapāda Gautama's foundational pramāṇa-vāda and its defense against Buddhist nominalism.",
    body: "The Nyāya philosophical school establishes four valid means of knowledge (pramāṇa): pratyakṣa (perception), anumāna (inference), upamāna (comparison), and śabda (verbal testimony). Gautama Nyāyasūtra begins with the proposition that ultimate liberation (apavarga) is attained through true knowledge of the sixteen epistemic categories (padārtha).",
    categorySlug: "philosophy",
    tags: ["Nyaya", "Epistemology", "Pramana", "Indian Philosophy", "Sanskrit Logic"],
    authorName: "Dr. Arya Ambadi",
    readingMinutes: 14,
    heroImageUrl: "https://anvikshikijournal.in/images/nyaya-hero.jpg",
    heroImageAlt: "Manuscript of Nyaya Sutras with commentaries",
    status: "PUBLISHED",
    publishedAt: new Date("2026-03-15T10:00:00Z"),
    createdAt: new Date("2026-03-10T10:00:00Z"),
    updatedAt: new Date("2026-03-16T14:30:00Z"),
    deletedAt: null,
    seoTitle: "Nyāya Epistemology: Pramāṇa Theory Explained — Ānvīkṣikī",
    seoDescription: "An exhaustive investigation into Akṣapāda Gautama's foundational pramāṇa-vāda and its defense against Buddhist nominalism.",
  },
  {
    id: "art-2",
    slug: "samkhya-purusa-prakrti-सङ्ख्य-दर्शने",
    title: "साङ्ख्यदर्शने पुरुष-प्रकृति-विवेकः — Dualism in Classical Sāṅkhya",
    subtitle: "The ontology of consciousness and primordial nature in Īśvarakṛṣṇa's Kārikā",
    excerpt: "साङ्ख्यशास्त्रे पुरुषस्य चैतन्यरूपत्वं प्रकृतेश्च त्रिगुणात्मकत्वं सम्यक् प्रतिपादितम्। A study on dualistic metaphysics.",
    body: "Classical Sāṅkhya posits two eternal, uncreated principles: Puruṣa (pure consciousness, non-agent, seer) and Prakṛti (unmanifest material cause, matrix of three guṇas: sattva, rajas, tamas).",
    categorySlug: "darshana",
    tags: ["Samkhya", "Puruṣa", "Prakṛti", "Sanskrit", "Metaphysics"],
    authorName: "Vidwan Ramanatha Sastry",
    readingMinutes: 18,
    heroImageUrl: null, // Test fallback 1200x630 social card
    heroImageAlt: null,
    status: "PUBLISHED",
    publishedAt: new Date("2026-04-01T08:00:00Z"),
    createdAt: new Date("2026-03-28T08:00:00Z"),
    updatedAt: new Date("2026-04-02T12:00:00Z"),
    deletedAt: null,
    seoTitle: "साङ्ख्यदर्शने पुरुष-प्रकृति-विवेकः — Ānvīkṣikī",
    seoDescription: "साङ्ख्यशास्त्रे पुरुषस्य चैतन्यरूपत्वं प्रकृतेश्च त्रिगुणात्मकत्वं सम्यक् प्रतिपादितम्।",
  },
  {
    id: "art-3-draft",
    slug: "draft-kashmir-shaivism-pratyabhijna",
    title: "The Recognition of Consciousness: Pratyabhijñā Philosophy (Draft)",
    subtitle: "Utpaladeva and Abhinavagupta on Non-dual Tantric Epistemology",
    excerpt: "Draft paper under editorial review on Kashmir Shaivism.",
    body: "Work in progress body.",
    categorySlug: "philosophy",
    tags: ["Shaivism", "Pratyabhijna"],
    authorName: "Dr. Arya Ambadi",
    status: "DRAFT",
    publishedAt: null,
    createdAt: new Date("2026-05-01T10:00:00Z"),
    updatedAt: new Date("2026-05-02T10:00:00Z"),
    deletedAt: null,
  },
  {
    id: "art-4-deleted",
    slug: "withdrawn-article-on-astronomy",
    title: "Withdrawn: Historical Inaccuracies in Siddhanta Calculations",
    subtitle: "Withdrawn document",
    excerpt: "This document has been removed by editorial board.",
    body: "Deleted body.",
    categorySlug: "history",
    tags: ["Astronomy"],
    authorName: "Former Contributor",
    status: "ARCHIVED",
    publishedAt: new Date("2025-01-01T00:00:00Z"),
    createdAt: new Date("2024-12-01T00:00:00Z"),
    updatedAt: new Date("2025-02-01T00:00:00Z"),
    deletedAt: new Date("2025-02-01T00:00:00Z"),
  },
];

export const FIXTURE_PAPERS: FixturePaper[] = [
  {
    id: "paper-1",
    slug: "kavya-alamkara-computational-poetics",
    title: "Computational Analysis of Alaṅkāra in Classical Sanskrit Poetics",
    abstract: "This paper presents a computational model for the formal classification of upamā (simile), rūpaka (metaphor), and śleṣa (pun) in Bhāmaha's Kāvyālaṅkāra and Daṇḍin's Kāvyādarśa. We evaluate structural features against 1,200 verse annotations with 94.2% precision.",
    body: "Sanskrit poetics (Alaṅkāra-śāstra) represents one of the world's most rigorous formal traditions of rhetorical and aesthetic theory. Starting with Bharata's Nāṭyaśāstra and formalised systematically by Bhāmaha, the figures of speech (alaṅkāra) are classified into śabdālaṅkāra (verbal embellishments) and arthālaṅkāra (semantic embellishments).",
    categorySlug: "linguistics",
    tags: ["Sanskrit Poetics", "Alankara", "Computational Linguistics", "Bhamaha", "Dandin"],
    authorName: "Dr. Ananya Sharma, Prof. Raghavan Sastri",
    institution: "Centre for Indic Knowledge Systems, National Institute of Advanced Studies",
    readingMinutes: 25,
    pdfUrl: "https://anvikshikijournal.in/manuscripts/kavya-alamkara-2026.pdf",
    coverImageUrl: "https://anvikshikijournal.in/images/kavya-cover.jpg",
    citationText: "Sharma, A., & Sastri, R. (2026). Computational Analysis of Alaṅkāra in Classical Sanskrit Poetics. Ānvīkṣikī Journal of Indic Studies, 3(1), 45-78.",
    peerReviewed: true,
    paperType: "RESEARCH_PAPER",
    year: 2026,
    doi: "10.5281/zenodo.anvikshiki.2026.0142",
    status: "PUBLISHED",
    publishedAt: new Date("2026-02-20T10:00:00Z"),
    createdAt: new Date("2026-02-01T10:00:00Z"),
    updatedAt: new Date("2026-02-21T16:00:00Z"),
    deletedAt: null,
    seoTitle: "Computational Analysis of Alaṅkāra in Sanskrit Poetics — Research Paper",
    seoDescription: "Formal classification of upamā, rūpaka, and śleṣa in Bhāmaha and Daṇḍin with computational validation.",
  },
  {
    id: "paper-2-no-cover",
    slug: "sulba-sutras-geometric-algebra",
    title: "Geometric Algebra in the Baudhāyana Śulba Sūtras: Rigour and Proof",
    abstract: "A mathematical reconstructive analysis of the theorem of the diagonal (Pythagorean proposition) and circle-squaring algorithms in Baudhāyana, Āpastamba, and Kātyāyana Śulba Sūtras.",
    body: "The Śulba Sūtras represent the Vedic corpus of altar geometry and constructive algebra.",
    categorySlug: "mathematics",
    tags: ["Mathematics", "Sulba Sutras", "Geometry", "History of Science"],
    authorName: "Prof. K. V. Sarma",
    institution: "Department of Sanskrit & Mathematical Sciences, Kerala",
    readingMinutes: 30,
    pdfUrl: "https://anvikshikijournal.in/manuscripts/sulba-sutras-proofs.pdf",
    coverImageUrl: null, // Missing cover image -> tests fallback 1200x630
    peerReviewed: true,
    paperType: "RESEARCH_PAPER",
    year: 2026,
    doi: "10.5281/zenodo.anvikshiki.2026.0199",
    status: "PUBLISHED",
    publishedAt: new Date("2026-03-01T10:00:00Z"),
    createdAt: new Date("2026-02-15T10:00:00Z"),
    updatedAt: new Date("2026-03-02T10:00:00Z"),
    deletedAt: null,
  }
];

export const FIXTURE_AUTHORS: FixtureAuthor[] = [
  {
    id: "user-arya",
    handle: "arya-ambadi",
    name: "Dr. Arya Ambadi",
    bio: "Senior Fellow in Indian Epistemology & Sanskrit Philosophy. Specialising in Nyāya-Vaiśeṣika logic, Navya-Nyāya technical dialectics, and cognitive epistemology.",
    institution: "Department of Philosophy, Sanskrit University",
    location: "Kerala, India",
    avatarUrl: "https://anvikshikijournal.in/avatars/arya-ambadi.jpg",
    createdAt: new Date("2025-01-10T00:00:00Z"),
    updatedAt: new Date("2026-01-10T00:00:00Z"),
  },
  {
    id: "user-ananya",
    handle: "ananya-sharma",
    name: "Dr. Ananya Sharma",
    bio: "Researcher in Computational Linguistics, Poetics, and Sanskrit Grammatical Systems.",
    institution: "Centre for Indic Knowledge Systems",
    location: "Bengaluru, India",
    avatarUrl: "https://anvikshikijournal.in/avatars/ananya-sharma.jpg",
    createdAt: new Date("2025-02-15T00:00:00Z"),
    updatedAt: new Date("2026-02-20T00:00:00Z"),
  }
];

export const FIXTURE_CATEGORIES: FixtureCategory[] = [
  {
    id: "cat-philosophy",
    slug: "philosophy",
    name: "Philosophy & Epistemology",
    description: "Classical and modern inquiries into Pramāṇa-śāstra, metaphysics, consciousness, and Indian dialectical traditions.",
    icon: "book-open",
  },
  {
    id: "cat-darshana",
    slug: "darshana",
    name: "Darśana & Metaphysics",
    description: "The six classical schools (Ṣaḍ-darśana) and non-Vedic traditions of Indian thought.",
    icon: "compass",
  },
  {
    id: "cat-linguistics",
    slug: "linguistics",
    name: "Linguistics & Poetics",
    description: "Vyākaraṇa, Alaṅkāra-śāstra, hermeneutics, semantic theory, and computational poetics.",
    icon: "feather",
  },
  {
    id: "cat-mathematics",
    slug: "mathematics",
    name: "Mathematics & Astronomy",
    description: "Ganita, Jyotisa, Sulba Sutras, Kerala School of Mathematics, and algorithmic astronomy.",
    icon: "binary",
  }
];
