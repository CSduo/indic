import { db } from "@workspace/db";
import {
  categoriesTable, authorsTable, tagsTable,
  articlesTable, papersTable, articleTagsTable, paperTagsTable,
  adminsTable, siteSettingsTable, newsletterSubscribersTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  // ── Categories ─────────────────────────────────────────────────────────
  const categoryRows = [
    { slug: "philosophy",  name: "Philosophy",    description: "Reason, metaphysics, epistemology, ethics, and the life of the mind.",     icon: "flame",   colorAccent: "#a87c2b", ordering: 1 },
    { slug: "history",     name: "History",       description: "Civilizational memory, archival inquiry, and the long arc of time.",        icon: "scroll",  colorAccent: "#7c4a2b", ordering: 2 },
    { slug: "psychology",  name: "Psychology",    description: "Mind, consciousness, behaviour, and the inner architecture of the self.",   icon: "brain",   colorAccent: "#6b3d8f", ordering: 3 },
    { slug: "sociology",   name: "Sociology",     description: "Society, caste, gender, modernity, and collective life.",                   icon: "users",   colorAccent: "#2b6e6e", ordering: 4 },
    { slug: "geopolitics", name: "Geopolitics",   description: "Power, statecraft, strategic thought, and civilizational contestation.",    icon: "globe",   colorAccent: "#2b4a7c", ordering: 5 },
    { slug: "science",     name: "Science",       description: "Natural knowledge, mathematics, cosmology, and the Indian scientific tradition.", icon: "atom", colorAccent: "#2b7c5e", ordering: 6 },
    { slug: "papers",      name: "Papers",        description: "Peer-reviewed research, working papers, and academic monographs.",          icon: "file-text", colorAccent: "#a93b5a", ordering: 7 },
    { slug: "archive",     name: "Archive",       description: "Rare documents, primary sources, and recovered texts.",                    icon: "archive", colorAccent: "#5e4a2b", ordering: 8 },
    { slug: "multimedia",  name: "Multimedia",    description: "Lectures, conversations, films, and audio essays.",                        icon: "play-circle", colorAccent: "#3b5e8f", ordering: 9 },
  ];

  for (const c of categoryRows) {
    await db.insert(categoriesTable).values(c).onConflictDoNothing();
  }
  console.log("  ✓ Categories");

  // ── Authors ────────────────────────────────────────────────────────────
  const authorRows = [
    { slug: "aarav-mehta",     name: "Aarav Mehta",     bio: "A philosopher of language and mind, writing on the intersections of Sanskrit epistemology and analytic philosophy.",                   title: "Research Fellow, Dept. of Philosophy" },
    { slug: "priya-krishnan",  name: "Priya Krishnan",  bio: "A historian of ideas specialising in colonial archives, the subaltern, and vernacular modernities.",                                   title: "Associate Professor, JNU" },
    { slug: "rohan-varma",     name: "Rohan Varma",     bio: "Political scientist and essayist. His work examines the grammar of power in postcolonial South Asia.",                                  title: "Independent Scholar" },
    { slug: "kavita-nair",     name: "Kavita Nair",     bio: "Sociologist and cultural critic. She writes on caste, intimacy, and the politics of everyday life.",                                  title: "Lecturer, Ambedkar University" },
    { slug: "vikram-das",      name: "Vikram Das",      bio: "Scientist and essayist who traces the lineage of Indian mathematics, astronomy, and the exact sciences.",                             title: "Professor, TIFR" },
    { slug: "editorial-board", name: "Editorial Board", bio: "The collective voice of Ānvīkṣikī on matters of scholarly policy, corrections, and editorial positions.",                            title: "Ānvīkṣikī Editorial Board" },
  ];

  for (const a of authorRows) {
    await db.insert(authorsTable).values(a).onConflictDoNothing();
  }
  console.log("  ✓ Authors");

  const getCat = async (slug: string) => {
    const [c] = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, slug));
    return c!;
  };
  const getAuthor = async (slug: string) => {
    const [a] = await db.select().from(authorsTable).where(eq(authorsTable.slug, slug));
    return a!;
  };

  // ── Tags ───────────────────────────────────────────────────────────────
  const tagNames = [
    "epistemology", "dharma", "colonial", "modernity", "vedanta", "nationalism",
    "memory", "sankhya", "cartography", "caste", "gender", "partition",
    "nyaya", "mathematics", "astronomy", "archive", "political-thought",
    "oral-traditions", "ecology", "consciousness",
  ];
  const tagMap = new Map<string, number>();
  for (const name of tagNames) {
    const slug = name;
    const [t] = await db.insert(tagsTable).values({ slug, name }).onConflictDoNothing().returning();
    if (t) tagMap.set(name, t.id);
    else {
      const [existing] = await db.select().from(tagsTable).where(eq(tagsTable.slug, slug));
      if (existing) tagMap.set(name, existing.id);
    }
  }
  console.log("  ✓ Tags");

  // ── Articles ───────────────────────────────────────────────────────────
  const phi = await getCat("philosophy");
  const hist = await getCat("history");
  const geo = await getCat("geopolitics");
  const soc = await getCat("sociology");
  const sci = await getCat("science");
  const arch = await getCat("archive");

  const aarav = await getAuthor("aarav-mehta");
  const priya = await getAuthor("priya-krishnan");
  const rohan = await getAuthor("rohan-varma");
  const kavita = await getAuthor("kavita-nair");
  const vikram = await getAuthor("vikram-das");

  const articleData = [
    {
      slug: "the-grammar-of-inference-nyaya-epistemology",
      title: "The Grammar of Inference",
      subtitle: "Nyāya Epistemology and the Limits of Reason",
      excerpt: "The Nyāya school of Indian philosophy developed one of the world's most rigorous theories of inference, anticipating many concerns of modern logic. This essay traces the structure of anumāna and asks what it still has to teach us.",
      content: `<p>The Nyāya school of Indian philosophy, founded in the Nyāyasūtras attributed to Akṣapāda Gautama, developed one of the most systematic epistemologies in the history of thought. At its centre is the theory of <em>anumāna</em> — inference — a structure of reasoning that anticipates, in striking ways, the later concerns of Frege, Peirce, and contemporary formal logic.</p>

<p>What distinguishes Nyāya inference from its Western counterparts is its attention to the epistemic conditions of the middle term, or <em>hetu</em>. For the Naiyāyikas, a valid inference is not merely a formally correct syllogism; it is a cognitive event grounded in <em>vyāpti</em>, the invariable concomitance between the mark and the inferred property.</p>

<p>The classic example — "There is fire on the mountain, because there is smoke, and wherever there is smoke, there is fire" — is deceptively simple. Behind it lies a theory of induction that recognises both the necessity of prior observations and the limits of their extension. Udyotkara's commentary on the Nyāyasūtras devotes considerable space to the conditions under which vyāpti may be legitimately claimed, anticipating the problem of induction that Hume would pose seventeen centuries later.</p>

<h2>The Five-Membered Syllogism</h2>

<p>Unlike the Aristotelian syllogism, Nyāya inference is presented as a five-membered argument (<em>pañcāvayava</em>): the thesis (<em>pratijñā</em>), the reason (<em>hetu</em>), the example (<em>udāharaṇa</em>), the application (<em>upanaya</em>), and the conclusion (<em>nigamana</em>). This structure is not merely pedagogical. The example serves as the empirical anchor of the inference, the site where the concomitance is first established.</p>

<p>Dignāga, the Buddhist logician, reduced this to a three-membered inference in his Pramāṇasamuccaya, arguing that the application and conclusion were superfluous. The Nyāya response, articulated most sharply by Udyotkara, was that Dignāga had misunderstood the cognitive function of these members. They are not redundant; they mark the movement of the mind from abstract principle to concrete judgment.</p>

<h2>What Nyāya Offers Today</h2>

<p>There is a tendency in contemporary philosophy of science to treat inductive logic as essentially a Western achievement, from Bacon through Carnap to Bayesian epistemology. The Nyāya tradition challenges this parochialism. Its theory of inference is not a curiosity or an anticipation of better things; it is a fully developed research programme with its own conceptual resources, problems, and solutions.</p>

<p>Among those resources, perhaps the most significant is the concept of <em>upādhi</em>, the counterfactual condition that can undermine an apparent vyāpti. If smoke is observed in the presence of wet fuel, the concomitance of smoke and fire holds only under certain conditions. The identification of upādhis is, in effect, a procedure for testing and refining inductive generalisations — precisely the procedure that Nelson Goodman described in his theory of projectible predicates, without, of course, any reference to the Naiyāyikas.</p>`,
      coverImage: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&q=80",
      categoryId: phi.id,
      authorId: aarav.id,
      status: "published",
      featured: true,
      readingTime: 18,
      keyTakeaways: [
        "Nyāya epistemology developed a rigorous theory of inference centuries before modern logic formalised similar concerns.",
        "The concept of vyāpti anticipates the problem of induction articulated by Hume.",
        "The five-membered syllogism serves a cognitive, not merely formal, purpose.",
        "The Nyāya notion of upādhi parallels Goodman's theory of projectible predicates.",
      ],
      referencesList: [
        "Akṣapāda Gautama. Nyāyasūtras. Trans. M. Gangopadhyaya. Calcutta, 1982.",
        "Udyotkara. Nyāyavārttika. Ed. Anantalal Thakur. Delhi: ICPR, 1997.",
        "Dignāga. Pramāṇasamuccaya. Trans. Masaaki Hattori. Cambridge: HOS, 1968.",
        "Goodman, Nelson. Fact, Fiction, and Forecast. Cambridge: Harvard UP, 1955.",
      ],
      publishedAt: new Date("2024-10-15"),
      tags: ["epistemology", "nyaya"],
    },
    {
      slug: "the-cartography-of-forgetting",
      title: "The Cartography of Forgetting",
      subtitle: "Colonial Archives and the Production of Indian Amnesia",
      excerpt: "The colonial archive was not merely a record of conquest; it was an instrument of epistemic reorganisation. This essay examines how British cartographic and administrative records rewrote Indian historical memory, and asks what a decolonial historiography might recover.",
      content: `<p>In 1784, when Sir William Jones founded the Asiatic Society of Bengal, he wrote that the Sanskrit language possessed "a wonderful structure; more perfect than the Greek, more copious than the Latin." This appreciation was genuine, but it came with a cost: Jones's philology would become the scaffolding on which a colonial understanding of India was built — one that privileged textual tradition over lived practice, the Brahminical over the subaltern, the archivable over the oral.</p>

<p>The production of colonial knowledge was also the production of colonial forgetting. As Bernard Cohn has shown in his essential study of the colonial state, the Survey of India, the census operations, and the codification of customary law were not merely administrative exercises; they were epistemological interventions that reshaped what could be known and said about the subcontinent.</p>

<h2>The Archive as Technology</h2>

<p>Michel-Rolph Trouillot's concept of "archival power" — the capacity of archives to silently constitute their own silences — is particularly useful for thinking about the Indian colonial record. The East India Company and the Raj generated enormous quantities of documents: survey reports, revenue records, census tables, district gazetteers. These were not neutral transcriptions of reality. They were selections, codifications, translations — each one encoding a particular regime of truth.</p>

<p>The village as an administrative unit, the caste as a bounded community, the "tribe" as a primitive social form: each of these categories entered the colonial archive and, through its administrative application, was partly made real. Nicholas Dirks's argument that caste was "colonised" — that the ethnographic obsession of colonial administrators transformed caste from a complex, contextual social relation into a rigid classificatory system — is the most sustained example of this argument.</p>`,
      coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80",
      categoryId: hist.id,
      authorId: priya.id,
      status: "published",
      featured: false,
      readingTime: 22,
      keyTakeaways: [
        "Colonial archives were not neutral records but instruments of epistemic reorganisation.",
        "The production of colonial knowledge was simultaneously the production of colonial forgetting.",
        "Categories like caste and tribe were transformed by their codification in administrative records.",
        "A decolonial historiography must attend to the silences of the archive as much as its contents.",
      ],
      referencesList: [
        "Cohn, Bernard. Colonialism and Its Forms of Knowledge. Princeton UP, 1996.",
        "Dirks, Nicholas. Castes of Mind. Princeton UP, 2001.",
        "Trouillot, Michel-Rolph. Silencing the Past. Boston: Beacon Press, 1995.",
        "Jones, William. 'Third Anniversary Discourse.' Asiatic Researches 1 (1788): 415–431.",
      ],
      publishedAt: new Date("2024-11-02"),
      tags: ["colonial", "archive", "memory"],
    },
    {
      slug: "the-long-defeat-geopolitics-of-the-indian-ocean",
      title: "The Long Defeat",
      subtitle: "Geopolitics of the Indian Ocean and the Indian Strategic Imagination",
      excerpt: "India's relationship with the Indian Ocean has oscillated between strategic clarity and civilisational ambivalence. This essay examines the historical and contemporary geography of Indian maritime thought.",
      content: `<p>Kautilya's <em>Arthaśāstra</em> is, among other things, a text about power in space. The concentric circles of the <em>maṇḍala</em> theory — in which the immediate neighbour is the natural enemy, the neighbour's neighbour the natural ally — presuppose a particular geometry of strategic interest. What Kautilya did not fully theorise, however, was the third dimension of this geometry: the sea.</p>

<p>This lacuna is revealing. The Indian strategic tradition has historically been more attentive to the continental northwest — the direction from which successive invasions arrived — than to the maritime south and east. The great port cities of the Chola empire, the trading networks of the Kalinga merchants, the diplomatic reach of the Vijayanagara kingdom across the Bay of Bengal: these are chapters in Indian history that have received less attention than they deserve, in part because they complicate the narrative of a civilisation perpetually on the defensive.</p>

<h2>The Indian Ocean as Strategic Space</h2>

<p>Robert Kaplan's The Monsoon offers a useful, if occasionally romanticised, account of the Indian Ocean as the defining strategic space of the twenty-first century. The observation is not new. Alfred Thayer Mahan, whose theory of sea power shaped American naval doctrine in the late nineteenth century, identified the Indian Ocean as one of the three great maritime theatres of the world. K.M. Panikkar, in his neglected masterpiece India and the Indian Ocean (1945), made the same argument for India specifically: that the subcontinent's strategic independence depended on its ability to project power into the waters that surrounded it.</p>`,
      coverImage: "https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=1200&q=80",
      categoryId: geo.id,
      authorId: rohan.id,
      status: "published",
      featured: false,
      readingTime: 16,
      keyTakeaways: [
        "The Indian strategic tradition has been more attentive to the continental northwest than to the maritime south and east.",
        "K.M. Panikkar's India and the Indian Ocean (1945) remains one of the most important works on Indian maritime strategy.",
        "The Chola empire's maritime reach deserves more attention in Indian strategic discourse.",
      ],
      referencesList: [
        "Kauṭilya. Arthaśāstra. Trans. L.N. Rangarajan. Penguin, 1992.",
        "Panikkar, K.M. India and the Indian Ocean. London: George Allen & Unwin, 1945.",
        "Kaplan, Robert D. Monsoon. New York: Random House, 2010.",
        "Mahan, Alfred Thayer. The Influence of Sea Power upon History. Boston, 1890.",
      ],
      publishedAt: new Date("2024-11-18"),
      tags: ["political-thought", "nationalism"],
    },
    {
      slug: "the-grammar-of-untouchability",
      title: "The Grammar of Untouchability",
      subtitle: "Caste, Space, and the Sociology of Exclusion",
      excerpt: "Untouchability is not merely a ritual prohibition; it is a spatial grammar that organises who may occupy which places, at which times, and under which conditions. This essay examines the sociology of caste exclusion through the lens of social space.",
      content: `<p>In Babasaheb Ambedkar's essay 'The Untouchables and the Pax Britannica', there is a passage that has not received the attention it deserves. Ambedkar observes that the untouchable is not merely a person of low social status; he is a person who is conceived as polluting — not by virtue of his moral character or his actions, but by virtue of his being. This is not a social hierarchy in the ordinary sense; it is a hierarchy of existence.</p>

<p>The spatial implications of this ontological degradation have been examined by sociologists from M.N. Srinivas to Gopal Guru, but they remain undertheorised relative to their importance. If untouchability is an ontological condition — a mode of being that is constitutively inferior — then it must be managed through space. The untouchable body cannot be present in certain places without contaminating them; it must be located, bounded, and segregated.</p>

<h2>Space as Social Grammar</h2>

<p>Henri Lefebvre's analysis of "the production of space" offers one framework for approaching this question. Lefebvre argues that space is not merely a backdrop against which social relations play out; it is itself produced by and constitutive of those relations. In the Indian context, the Dalit scholar Martin Macwan has documented in meticulous detail how the physical arrangement of the village — the location of the untouchable quarter, its distance from the well, the route required to reach the market — encodes and reproduces caste hierarchy with every step.</p>`,
      coverImage: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1200&q=80",
      categoryId: soc.id,
      authorId: kavita.id,
      status: "published",
      featured: false,
      readingTime: 20,
      keyTakeaways: [
        "Untouchability is an ontological condition expressed through spatial exclusion, not merely a ritual prohibition.",
        "The physical arrangement of the village encodes and reproduces caste hierarchy.",
        "Lefebvre's theory of the production of space offers a useful framework for understanding caste geography.",
        "Ambedkar's writing on untouchability contains spatial analyses that remain underappreciated.",
      ],
      referencesList: [
        "Ambedkar, B.R. 'The Untouchables and the Pax Britannica.' In Writings and Speeches, Vol. 5. Bombay, 1989.",
        "Lefebvre, Henri. The Production of Space. Trans. D. Nicholson-Smith. Blackwell, 1991.",
        "Guru, Gopal. Humiliation: Claims and Context. Oxford UP, 2009.",
        "Macwan, Martin. Dalit Villages in Gujarat. Ahmedabad: Navsarjan, 2003.",
      ],
      publishedAt: new Date("2024-12-05"),
      tags: ["caste", "sociology"],
    },
    {
      slug: "the-zero-and-the-infinite-indian-mathematics",
      title: "The Zero and the Infinite",
      subtitle: "On the Mathematical Genius of the Indian Subcontinent",
      excerpt: "The invention of zero and the place-value system transformed the history of human thought. This essay traces the development of Indian mathematics from the Vedic period to Brahmagupta, Bhāskara, and the Kerala school, arguing for a reassessment of India's contribution to world mathematics.",
      content: `<p>In 628 CE, Brahmagupta composed the Brāhmasphuṭasiddhānta, the first text in the history of mathematics to treat zero as a number in its own right and to define rules for arithmetic operations involving it. The statement that zero divided by zero equals zero was, as we now know, incorrect; but the project of formalising zero as a mathematical object was itself extraordinary — a conceptual leap that would not be matched in the West for a millennium.</p>

<p>The story of Indian mathematics is inseparable from the story of Indian astronomy. The great astronomical treatises — the Āryabhaṭīya of Āryabhaṭa (499 CE), the Pañcasiddhāntikā of Varāhamihira, the Sūryasiddhānta — required computations of extraordinary precision. The development of trigonometric functions, the calculation of planetary positions, the theory of epicycles: all of these demanded a mathematics that could handle large numbers efficiently. The place-value system, with its combination of the ten numerals and the positional notation, was the answer.</p>

<h2>The Kerala School</h2>

<p>Perhaps the most remarkable chapter in the history of Indian mathematics is the Kerala school, active between the fourteenth and sixteenth centuries. Mādhava of Saṅgamagrāma discovered the power series expansions for sine, cosine, and arctangent — results that would be rediscovered in Europe by Gregory, Leibniz, and Newton more than two centuries later. George Gheverghese Joseph's The Crest of the Peacock (1991) was the first major scholarly work to present the Kerala school's achievements to a general audience, and it sparked a debate about the possible transmission of these results to Europe through Jesuit missionary networks.</p>`,
      coverImage: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80",
      categoryId: sci.id,
      authorId: vikram.id,
      status: "published",
      featured: false,
      readingTime: 24,
      keyTakeaways: [
        "Brahmagupta's Brāhmasphuṭasiddhānta (628 CE) was the first text to treat zero as a mathematical object.",
        "The Kerala school discovered power series expansions for trigonometric functions two centuries before European mathematicians.",
        "Indian mathematics and astronomy were deeply intertwined from the Vedic period onwards.",
        "The possible transmission of Kerala mathematics to Europe through Jesuit networks remains an open historical question.",
      ],
      referencesList: [
        "Brahmagupta. Brāhmasphuṭasiddhānta. Trans. H.T. Colebrooke. London, 1817.",
        "Āryabhaṭa. Āryabhaṭīya. Trans. Walter Eugene Clark. Chicago: AOS, 1930.",
        "Joseph, George Gheverghese. The Crest of the Peacock. London: Penguin, 1991.",
        "Plofker, Kim. Mathematics in India. Princeton UP, 2009.",
      ],
      publishedAt: new Date("2025-01-10"),
      tags: ["mathematics", "astronomy"],
    },
    {
      slug: "toward-a-philosophy-of-dharma",
      title: "Toward a Philosophy of Dharma",
      subtitle: "Beyond Law, Beyond Morality",
      excerpt: "Dharma is not law, and it is not morality, though it encompasses both. This essay attempts to reconstruct a philosophy of dharma adequate to the complexity of its sources, moving between the Dharmaśāstras, the Mahābhārata, and contemporary moral philosophy.",
      content: `<p>The translation of dharma as 'law' or 'duty' or 'righteousness' has done more to obscure than to illuminate the concept. Each translation picks out a real feature of the Sanskrit term, but none captures the way in which dharma is simultaneously cosmological, social, and personal — simultaneously a description of how things are and a prescription for how they ought to be.</p>

<p>The most philosophically sophisticated attempt to grapple with this complexity in the Sanskrit tradition is the Mahābhārata, and in particular the Śāntiparvan — the Book of Peace. Here Yudhiṣṭhira, having survived the war, is brought before the dying Bhīṣma to receive instruction on the nature of dharma. The exchange that follows is one of the most remarkable conversations in the history of ethical thought: Yudhiṣṭhira asks whether dharma can be known, and Bhīṣma's answer is that it cannot be deduced from a single principle but must be discerned in particular situations by those who possess the proper virtues and knowledge.</p>

<h2>Dharma and Ṛta</h2>

<p>Before there was dharma, in its full Dharmaśāstric sense, there was ṛta — the cosmic order celebrated in the Ṛgveda. Ṛta is the principle that makes the sun rise, the seasons turn, the rains come. It is not a moral law in the modern sense; it is something closer to what the Greeks called logos — the rational structure of reality. Dharma emerges from ṛta as ṛta becomes socialised: as the order of things becomes the order that human communities must sustain through their practices and institutions.</p>`,
      coverImage: "https://images.unsplash.com/photo-1544785349-c4a5301826fd?w=1200&q=80",
      categoryId: phi.id,
      authorId: aarav.id,
      status: "published",
      featured: false,
      readingTime: 20,
      keyTakeaways: [
        "Translating dharma as 'law' or 'duty' obscures its simultaneously cosmological, social, and personal dimensions.",
        "The Mahābhārata's Śāntiparvan contains some of the most sophisticated ethical reasoning in Sanskrit literature.",
        "Dharma emerges from ṛta as cosmic order becomes socialised into human institutions.",
      ],
      referencesList: [
        "Mahābhārata. Trans. J.A.B. van Buitenen. Chicago UP, 1973–78.",
        "Olivelle, Patrick. Dharmasūtras. Oxford: OUP, 1999.",
        "Larivière, Richard. Dharmaśāstra, Custom, Real Law and Apocryphal Smṛtis. Journal of Indian Philosophy 32 (2004): 611–27.",
      ],
      publishedAt: new Date("2025-02-14"),
      tags: ["dharma", "epistemology"],
    },
  ];

  for (const { tags, ...data } of articleData) {
    const [existing] = await db.select().from(articlesTable).where(eq(articlesTable.slug, data.slug));
    let articleId: number;
    if (!existing) {
      const [a] = await db.insert(articlesTable).values(data).returning({ id: articlesTable.id });
      articleId = a!.id;
    } else {
      articleId = existing.id;
    }
    await db.delete(articleTagsTable).where(eq(articleTagsTable.articleId, articleId));
    for (const tagName of tags) {
      const tagId = tagMap.get(tagName);
      if (tagId) {
        await db.insert(articleTagsTable).values({ articleId, tagId }).onConflictDoNothing();
      }
    }
  }
  console.log("  ✓ Articles");

  // ── Papers ─────────────────────────────────────────────────────────────
  const papersData = [
    {
      slug: "consciousness-and-pure-experience-advaita-vedanta",
      title: "Consciousness and Pure Experience: A Critical Reading of Advaita Vedānta",
      abstract: "This paper examines Śaṅkara's concept of <em>cit</em> (pure consciousness) in relation to the philosophy of pure experience developed by Nishida Kitarō and William James. Drawing on primary Sanskrit sources and contemporary philosophy of mind, the paper argues that Advaita Vedānta offers a phenomenological theory of consciousness that deserves serious engagement in current debates about the hard problem.",
      categoryId: phi.id,
      authorId: aarav.id,
      status: "published" as const,
      peerReviewed: true,
      citationText: "Mehta, A. (2024). Consciousness and Pure Experience: A Critical Reading of Advaita Vedānta. Ānvīkṣikī: A Journal of Civilisational Inquiry, 1(2), 45–78.",
      publicationType: "research-article",
      publishedAt: new Date("2024-10-28"),
      tags: ["vedanta", "consciousness", "epistemology"],
    },
    {
      slug: "the-ecology-of-partition-rivers-borders-and-the-punjab",
      title: "The Ecology of Partition: Rivers, Borders, and the Punjab",
      abstract: "The 1947 partition of the Punjab severed not only communities but hydrological systems. This paper examines the ecological consequences of partition through the history of the five rivers that give the Punjab its name, arguing that environmental history offers a necessary complement to the social and political histories that have dominated partition scholarship.",
      categoryId: hist.id,
      authorId: priya.id,
      status: "published" as const,
      peerReviewed: true,
      citationText: "Krishnan, P. (2024). The Ecology of Partition: Rivers, Borders, and the Punjab. Ānvīkṣikī: A Journal of Civilisational Inquiry, 1(3), 102–134.",
      publicationType: "research-article",
      publishedAt: new Date("2024-11-15"),
      tags: ["ecology", "partition", "archive"],
    },
    {
      slug: "the-zero-sum-question-digital-sovereignty-india",
      title: "The Zero-Sum Question: Digital Sovereignty and the Indian Internet",
      abstract: "This working paper examines the concept of digital sovereignty as it has been articulated in Indian policy discourse since 2014, situating it within the broader contest between American platform capitalism, Chinese state-led internet governance, and emergent models of multilateral digital governance. It argues that India has the capacity and the interest to develop a distinctive model of digital sovereignty, but that this requires a clearer conceptual foundation than current policy provides.",
      categoryId: geo.id,
      authorId: rohan.id,
      status: "published" as const,
      peerReviewed: false,
      citationText: "Varma, R. (2025). The Zero-Sum Question: Digital Sovereignty and the Indian Internet. Ānvīkṣikī Working Paper, No. 7.",
      publicationType: "working-paper",
      publishedAt: new Date("2025-01-22"),
      tags: ["political-thought", "nationalism"],
    },
  ];

  for (const { tags, ...data } of papersData) {
    const [existing] = await db.select().from(papersTable).where(eq(papersTable.slug, data.slug));
    let paperId: number;
    if (!existing) {
      const [p] = await db.insert(papersTable).values(data).returning({ id: papersTable.id });
      paperId = p!.id;
    } else {
      paperId = existing.id;
    }
    await db.delete(paperTagsTable).where(eq(paperTagsTable.paperId, paperId));
    for (const tagName of tags) {
      const tagId = tagMap.get(tagName);
      if (tagId) {
        await db.insert(paperTagsTable).values({ paperId, tagId }).onConflictDoNothing();
      }
    }
  }
  console.log("  ✓ Papers");

  // ── Admin account ──────────────────────────────────────────────────────
  const adminEmail = "admin@anvikshiki.in";
  const [existingAdmin] = await db.select().from(adminsTable).where(eq(adminsTable.email, adminEmail));
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("anvikshiki2024", 12);
    await db.insert(adminsTable).values({ email: adminEmail, passwordHash, role: "owner" });
    console.log("  ✓ Admin account (admin@anvikshiki.in / anvikshiki2024)");
  } else {
    console.log("  ✓ Admin account already exists");
  }

  // ── Site settings ──────────────────────────────────────────────────────
  const [firstArticle] = await db.select().from(articlesTable).where(eq(articlesTable.slug, "the-grammar-of-inference-nyaya-epistemology"));
  const [existingSettings] = await db.select().from(siteSettingsTable);
  if (!existingSettings) {
    await db.insert(siteSettingsTable).values({
      id: 1,
      featuredArticleId: firstArticle?.id,
      siteTitle: "Ānvīkṣikī",
      siteDescription: "A civilisational intellectual journal for essays, papers, and serious inquiry.",
    });
  } else if (!existingSettings.featuredArticleId && firstArticle) {
    await db.update(siteSettingsTable).set({ featuredArticleId: firstArticle.id });
  }
  console.log("  ✓ Site settings");

  // ── Newsletter subscribers (sample) ────────────────────────────────────
  const sampleEmails = ["reader@example.com", "scholar@university.edu"];
  for (const email of sampleEmails) {
    await db.insert(newsletterSubscribersTable).values({ email }).onConflictDoNothing();
  }
  console.log("  ✓ Newsletter subscribers");

  console.log("\n✅ Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
