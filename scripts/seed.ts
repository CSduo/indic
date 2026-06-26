/**
 * Ānvīkṣikī — Database Seed Script
 * Run: pnpm tsx scripts/seed.ts
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../lib/db/src/schema/index";
import { eq } from "drizzle-orm";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const {
  categoriesTable,
  articlesTable,
  papersTable,
} = schema;

/* ─────────────────────────────────────────────────────────── */
/* CATEGORIES                                                   */
/* ─────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { slug: "philosophy",            name: "Philosophy",             description: "Inquiry into the nature of existence, knowledge, ethics, and the good life across traditions.", icon: "🪔", sortOrder: 1,  visible: true },
  { slug: "history",               name: "History",                description: "Civilizational arcs, forgotten empires, and the patterns of human memory.",                   icon: "📜", sortOrder: 2,  visible: true },
  { slug: "psychology",            name: "Psychology",             description: "The science of mind, consciousness, and human behaviour in depth.",                           icon: "🧠", sortOrder: 3,  visible: true },
  { slug: "sociology",             name: "Sociology",              description: "Society, culture, institutions, and the forces that shape collective life.",                   icon: "🏛️", sortOrder: 4,  visible: true },
  { slug: "science",               name: "Science",                description: "Frontier research and the philosophical foundations of the scientific endeavour.",             icon: "🔭", sortOrder: 5,  visible: true },
  { slug: "geopolitics",           name: "Geopolitics",            description: "Power, geography, and the strategic logic of civilizational competition.",                    icon: "🌏", sortOrder: 6,  visible: true },
  { slug: "civilizational-thought",name: "Civilizational Thought", description: "Deep dives into the ideas that built and sustain great civilizations.",                       icon: "🕌", sortOrder: 7,  visible: true },
  { slug: "aesthetics",            name: "Aesthetics",             description: "Art, beauty, rasa theory, and the philosophy of creative expression.",                        icon: "🎨", sortOrder: 8,  visible: true },
  { slug: "sanskrit-studies",      name: "Sanskrit Studies",       description: "Language, grammar, poetics, and the textual heritage of Indic knowledge.",                   icon: "ॐ",  sortOrder: 9,  visible: true },
  { slug: "economics",             name: "Economics",              description: "Political economy, markets, institutions, and the moral dimensions of exchange.",              icon: "⚖️", sortOrder: 10, visible: true },
];

/* ─────────────────────────────────────────────────────────── */
/* ARTICLES (ESSAYS)                                            */
/* ─────────────────────────────────────────────────────────── */
const ARTICLES = [
  {
    slug: "the-dharmic-roots-of-political-thought",
    title: "The Dharmic Roots of Political Thought",
    subtitle: "Rereading Arthaśāstra through the lens of civilizational ethics",
    excerpt: "Kauṭilya's Arthaśāstra is routinely cast as an ancient manual of statecraft, a Machiavelli before Machiavelli. But this reading strips it of its deeper moral grammar.",
    body: `
<p>Kauṭilya's <em>Arthaśāstra</em> is routinely cast as an ancient manual of statecraft—a Machiavelli before Machiavelli. But this reading strips it of its deeper moral grammar, the one that places <em>rājadharma</em> at the centre of political life and insists that the king's happiness is contingent on the happiness of his subjects.</p>

<p>The opening verse of the text is itself instructive: <em>prajāsukhe sukhaṁ rājñaḥ, prajānāṁ ca hite hitam</em>—"In the happiness of the subjects lies the king's happiness; in their welfare, his welfare." This is not rhetorical ornamentation. It is an ontological claim about the nature of legitimate authority.</p>

<h2>Beyond Realpolitik</h2>

<p>Western political theory, from Hobbes onwards, has built its architecture on the premise of the social contract: individuals surrender some freedom in exchange for security. The sovereign's legitimacy derives from this exchange. But Kauṭilya's framework is different in kind. The king is not a party to a contract—he is an instrument of cosmic order, tasked with maintaining <em>dharma</em> in the political domain.</p>

<p>This does not make the <em>Arthaśāstra</em> naive. The text's famous discussions of espionage, of the use of secret agents, of the manipulation of enemy kingdoms through psychological warfare—all of this is present and detailed. But these tactics are subordinate to the larger telos: a kingdom ordered by dharma, capable of protecting the vulnerable and enabling the pursuit of the four aims of human life (<em>puruṣārthas</em>).</p>

<h2>The Seven Elements of the State</h2>

<p>Kauṭilya identifies seven constituent elements of the state: the king (<em>svāmin</em>), the ministers (<em>amātya</em>), the country (<em>janapada</em>), fortified towns (<em>durga</em>), the treasury (<em>kośa</em>), the army (<em>daṇḍa</em>), and allies (<em>mitra</em>). What is remarkable is that this framework is ecological rather than hierarchical: each element supports and is supported by the others. A weak treasury undermines the army; an alienated population makes the countryside ungovernable.</p>

<p>This systems-thinking, far from being primitive, anticipates many of the insights of modern political science—the importance of state capacity, the relationship between fiscal health and military power, the role of soft power (what Kauṭilya calls <em>mitra</em>) in statecraft.</p>

<h2>Dharma as Constitutional Principle</h2>

<p>Perhaps the most radical aspect of Kauṭilyan thought, from a contemporary perspective, is its insistence that even the king is bound by law. The <em>Arthaśāstra</em> contains detailed provisions for the accountability of officials, including the king's own ministers. Corruption is not merely a practical problem—it is a violation of dharma, and the text prescribes punishments accordingly.</p>

<p>In this sense, the Arthaśāstra anticipates the rule-of-law principle that liberal constitutionalism treats as its crowning achievement. The difference is in the grounding: for Kauṭilya, the law derives its authority not from popular consent but from the cosmic order that dharma both reflects and sustains.</p>

<h2>Implications for Contemporary Thought</h2>

<p>To read the <em>Arthaśāstra</em> seriously today is not an exercise in nostalgia. It is an invitation to think about political authority in terms richer than the thin proceduralism of contemporary liberal democracy. It asks whether governance can be animated by a sense of cosmic responsibility—whether the state can be oriented not merely toward the maximisation of preferences, but toward the flourishing of a people within a moral universe.</p>

<p>These are questions that no serious political philosophy can afford to ignore. The <em>Arthaśāstra</em> does not answer them for us. But it shows us that they were asked, with sophistication and rigour, long before the languages of modernity gave us our current vocabulary for political life.</p>
    `.trim(),
    categorySlug: "philosophy",
    tags: ["dharma", "kautilya", "arthashastra", "political philosophy", "indic thought"],
    authorName: "Arjun Krishnamurti",
    status: "PUBLISHED" as const,
    featured: true,
    publishedAt: new Date("2025-11-12"),
    excerpt: "Kauṭilya's Arthaśāstra is routinely cast as an ancient manual of statecraft, a Machiavelli before Machiavelli. But this reading strips it of its deeper moral grammar.",
    seoTitle: "The Dharmic Roots of Political Thought | Ānvīkṣikī",
    seoDescription: "A close reading of Kauṭilya's Arthaśāstra through the lens of civilizational ethics and rājadharma.",
    keyTakeaways: ["The Arthaśāstra grounds political authority in dharma, not social contract", "Kauṭilya's state-theory is ecological and systems-oriented", "Even the king is subject to law in Kauṭilyan political philosophy"],
  },
  {
    slug: "consciousness-and-the-hard-problem-a-vedantic-response",
    title: "Consciousness and the Hard Problem: A Vedāntic Response",
    subtitle: "What Advaita philosophy offers that neuroscience cannot",
    excerpt: "David Chalmers' famous 'hard problem' of consciousness—why there is subjective experience at all—has resisted every attempt at reduction. Advaita Vedānta begins where neuroscience ends.",
    body: `
<p>David Chalmers' famous "hard problem" of consciousness—why there is subjective experience at all, why the lights are on—has resisted every attempt at reduction for three decades. The easy problems (how the brain processes information, integrates perception, regulates attention) have yielded to neuroscience. The hard problem has not. Advaita Vedānta begins precisely where neuroscience ends.</p>

<h2>The Problem Restated</h2>

<p>The hard problem is not merely a gap in our knowledge. It is a gap in principle. Even a complete physical description of the brain would leave unanswered the question of why those processes are accompanied by experience. The redness of red, the painfulness of pain—these qualia are not reducible to any functional or computational description.</p>

<p>Most Western philosophy has responded to this problem in one of two ways: eliminativism (deny that qualia are real) or property dualism (accept that consciousness is a fundamental property of matter). Both moves are unsatisfying. Eliminativism asks us to deny what is most immediately certain to us. Property dualism introduces a mysterious new category without explaining anything.</p>

<h2>The Vedāntic Starting Point</h2>

<p>Advaita Vedānta, as expounded by Śaṅkarācārya and his commentators, takes consciousness as the fundamental datum of reality. Not the brain, not matter, not information—consciousness itself, which it calls <em>cit</em>, pure awareness. This awareness is not a property of anything; it is the ground of everything. The Sanskrit formula is <em>prajñānam brahma</em>: consciousness is Brahman, the ultimate reality.</p>

<p>This is not a dualism. The Advaitin does not posit consciousness as a separate substance alongside matter. He argues that what we call matter is itself an appearance within consciousness—that there is, ultimately, only one thing, which is pure awareness appearing to itself in the form of a world.</p>

<h2>The Witness Consciousness (<em>Sākṣin</em>)</h2>

<p>Advaita introduces the concept of the <em>sākṣin</em>—the witness consciousness—to explain our immediate experience. The witness is that which is aware of all mental events: thoughts, perceptions, emotions, even sleep. It cannot itself be an object of awareness, because it is that which is aware. To look for the witness with the mind is like trying to see your own eye with your eye.</p>

<p>This concept maps surprisingly well onto what philosophers call the "first-person perspective"—the irreducible sense of being a subject. The Advaitin's contribution is to argue that this witness is not individual but universal: what you discover when you look for the ground of your experience is not a personal self but Brahman itself.</p>

<h2>An Answer to Chalmers?</h2>

<p>Does Advaita solve the hard problem? In one sense, it dissolves it. The hard problem arises because we assume that the physical is primary and must account for the mental. Advaita inverts this assumption: consciousness is primary, and the physical is its appearance. There is no hard problem because there is no need to derive experience from non-experience.</p>

<p>This is not a scientific answer in the empirical sense. Advaita does not make predictions that can be tested in a laboratory. But neither does any other response to the hard problem—including the materialist ones. The question is which philosophical framework best honours the full range of our experience, including the immediate certainty of consciousness itself.</p>

<p>On that criterion, the Advaitin's case is strong. And increasingly, Western philosophers—from Thomas Nagel to Bernardo Kastrup—are reaching similar conclusions through very different routes. The convergence is worth noting.</p>
    `.trim(),
    categorySlug: "philosophy",
    tags: ["consciousness", "vedanta", "advaita", "hard problem", "philosophy of mind"],
    authorName: "Priya Venkataraman",
    status: "PUBLISHED" as const,
    featured: true,
    publishedAt: new Date("2025-12-03"),
    seoTitle: "Consciousness and the Hard Problem: A Vedāntic Response | Ānvīkṣikī",
    seoDescription: "What Advaita Vedānta offers as an answer to Chalmers' hard problem of consciousness.",
    keyTakeaways: ["Advaita takes consciousness as the fundamental datum, not a derivative of matter", "The concept of sākṣin (witness consciousness) maps onto the first-person perspective", "Advaita dissolves rather than solves the hard problem by inverting the materialist assumption"],
  },
  {
    slug: "the-forgotten-empire-vijayanagara-and-the-defence-of-dharmic-civilisation",
    title: "The Forgotten Empire: Vijayanagara and the Defence of Dharmic Civilisation",
    subtitle: "How a southern kingdom preserved what might otherwise have been lost",
    excerpt: "Between 1336 and 1646, the Vijayanagara Empire stood as the primary bulwark of Indic civilisation in the south. Its story is one of extraordinary cultural efflorescence amid existential threat.",
    body: `
<p>Between 1336 and 1646, the Vijayanagara Empire stood as the primary bulwark of Indic civilisation in the Deccan and the south. Its story is one of extraordinary cultural efflorescence amid existential threat—a civilisational holding action that succeeded against formidable odds for more than three centuries.</p>

<h2>The Context of Foundation</h2>

<p>The empire was founded by Harihara and Bukka, two brothers who had served in the Hoysala administration before the northern Deccan fell to the armies of Muhammad bin Tughluq. The traditional account, recorded in later chronicles, holds that the saint Vidyāraṇya inspired them to establish a kingdom that would protect dharma—the Sanskritic and temple-centred civilisation that was being dismantled in the north.</p>

<p>Whether or not this pious founding narrative captures the full historical truth, it points to something real about the empire's self-understanding. Vijayanagara consistently described itself as <em>Karṇāṭaka-Rājya Ramaramaṇa</em> and <em>Hindurāya Suratrāṇa</em>—protector of the Hindu kings. This was not mere rhetoric. The empire actively supported temple building, patronised Sanskrit and Kannada literature, and organised the great pilgrimage circuits that kept Indic religious life alive across the peninsula.</p>

<h2>The Temple Economy</h2>

<p>The Vijayanagara temple was not merely a place of worship. It was an economic institution, a centre of redistribution, an employer of artisans and priests, a repository of knowledge, and a node of social life. The Virupākṣa temple at Hampi, the Tirupati complex, and dozens of other great foundations received enormous royal endowments and in turn supported vast numbers of people.</p>

<p>This temple economy has been studied by historians like Burton Stein and Noboru Karashima, who have shown how it integrated agricultural surplus, artisanal production, and long-distance trade into a coherent civilisational system. The destruction of this system at Talikota in 1565 was not merely a military defeat—it was the unravelling of an entire mode of social organisation.</p>

<h2>The Literary Flowering</h2>

<p>The Vijayanagara period produced some of the finest literature in Kannada, Telugu, and Tamil. Krishnadevaraya, the greatest emperor of the Tuluva dynasty, was himself a distinguished Telugu poet—his <em>Amuktamalyada</em> is a masterpiece of devotional and aesthetic literature. His court hosted the eight poets known as the <em>Aṣṭadiggajas</em>, who transformed Telugu literature.</p>

<p>In Kannada, the <em>vachana</em> tradition of the Lingayats continued to flourish, and Sanskrit scholarship of the highest order was produced—including important works of Advaita philosophy and grammar.</p>

<h2>The Battle of Talikota and Its Aftermath</h2>

<p>The defeat at Talikota (1565) at the hands of the Deccan Sultanates was catastrophic. The capital Hampi was systematically looted and destroyed over months. But the empire did not immediately collapse—successor states in Penukonda, Chandragiri, and finally Vellore continued to rule for another century, providing refuge to artists and scholars and maintaining at least a partial continuity of institutional life.</p>

<p>The legacy of Vijayanagara lives on in the architecture of Tamil Nadu's great temple cities, in the literary traditions of Telugu and Kannada, and in the survival of pilgrimage circuits that connect the subcontinent's sacred geography. It is a legacy that deserves more serious attention than it typically receives.</p>
    `.trim(),
    categorySlug: "history",
    tags: ["vijayanagara", "history", "south india", "dharma", "temple", "krishnadevaraya"],
    authorName: "Meenakshi Narayanan",
    status: "PUBLISHED" as const,
    featured: false,
    publishedAt: new Date("2025-10-28"),
    seoTitle: "The Forgotten Empire: Vijayanagara | Ānvīkṣikī",
    seoDescription: "How the Vijayanagara Empire preserved Indic civilisation for three centuries through art, literature, and statecraft.",
    keyTakeaways: ["Vijayanagara's self-understanding was explicitly civilisational, not merely political", "The temple economy integrated agriculture, craft, and trade into a coherent system", "The empire's literary legacy transformed Kannada, Telugu, and Tamil traditions"],
  },
  {
    slug: "rasa-theory-and-the-aesthetics-of-empathy",
    title: "Rasa Theory and the Aesthetics of Empathy",
    subtitle: "Why Bharata's framework is more sophisticated than modern aesthetic theory",
    excerpt: "Bharata's Nāṭyaśāstra, codified roughly two millennia ago, contains a theory of aesthetic experience that outstrips in psychological sophistication much of what Western aesthetics has produced since Kant.",
    body: `
<p>Bharata's <em>Nāṭyaśāstra</em>, codified roughly two millennia ago, contains a theory of aesthetic experience that outstrips in psychological sophistication much of what Western aesthetics has produced since Kant. The doctrine of <em>rasa</em>—aesthetic flavour or essence—is not merely a taxonomy of emotions. It is a phenomenology of how art transforms ordinary feeling into something universal and liberating.</p>

<h2>The Eight (and Nine) Rasas</h2>

<p>Bharata enumerates eight rasas: <em>śṛṅgāra</em> (love), <em>hāsya</em> (humour), <em>karuṇā</em> (compassion), <em>raudra</em> (fury), <em>vīra</em> (heroism), <em>bhayānaka</em> (fear), <em>bībhatsa</em> (disgust), and <em>adbhuta</em> (wonder). The ninth—<em>śānta</em> (peace, tranquility)—was added by later theorists, particularly Abhinavagupta, who argued that it was the most fundamental rasa of all, the ground from which the others arise.</p>

<p>Each rasa has a corresponding <em>sthāyibhāva</em> (stable emotion), <em>vibhāvas</em> (excitants), <em>anubhāvas</em> (consequents), and <em>vyabhicārī bhāvas</em> (transient emotions that enhance the dominant one). The system is extraordinarily detailed and has guided Indian performance traditions—dance, drama, music—for centuries.</p>

<h2>The Rasānubhava: Experiencing Rasa</h2>

<p>What makes the theory philosophically interesting is its account of how rasa is produced. Aesthetic experience, Bharata insists, is not the same as ordinary emotional experience. When you watch a tragedy and feel <em>karuṇā</em>, you are not simply sad in the way you would be if your own parent died. The experience is decontextualised, generalised, purified of personal reference. This is what Abhinavagupta calls <em>sādhrāṇīkaraṇa</em>—universalisation.</p>

<p>This process of universalisation is precisely what transforms ordinary grief into aesthetic pleasure. The paradox of tragedy—why do we enjoy representations of suffering?—is resolved by the rasa theorists: because in art, suffering is experienced in its universal, impersonal form, and this universality is itself pleasurable. We are, for a moment, freed from the narrow prison of the ego.</p>

<h2>Abhinavagupta's Contribution</h2>

<p>The greatest theorist of rasa was Abhinavagupta (c. 975–1025 CE), the Kashmiri philosopher who synthesised Tantric Shaivism and Trika philosophy with aesthetic theory. In his <em>Abhinavabhāratī</em> (commentary on the Nāṭyaśāstra) and <em>Locana</em> (commentary on Ānandavardhana's <em>Dhvanyāloka</em>), he developed the theory of rasa into a comprehensive account of aesthetic and ultimately spiritual experience.</p>

<p>For Abhinavagupta, the experience of rasa is structurally similar to the experience of samādhi—the meditative absorption that is the culmination of yogic practice. Both involve the dissolution of subject-object duality, the transcendence of personal identification, and the rest in pure awareness. Art, on this account, is not merely entertainment or even edification—it is a path toward liberation.</p>

<h2>Implications for Contemporary Aesthetics</h2>

<p>Contemporary aesthetic theory has grown increasingly interested in questions about empathy, emotional contagion, and the neurological basis of aesthetic experience. The rasa theorists anticipated many of these questions and offered answers that are, in some respects, more nuanced than what cognitive science has yet produced.</p>

<p>In particular, the distinction between ordinary emotion (<em>bhāva</em>) and aesthetic emotion (<em>rasa</em>) maps closely onto what psychologists call the distinction between emotion and aesthetic emotion—but the Indian theorists were more precise about the mechanism of transformation. The concept of <em>sādhrāṇīkaraṇa</em> is as close as classical aesthetics comes to a theory of how art works at the neurological level.</p>
    `.trim(),
    categorySlug: "aesthetics",
    tags: ["rasa", "aesthetics", "bharata", "abhinavagupta", "natyashastra", "art theory"],
    authorName: "Kavitha Subramaniam",
    status: "PUBLISHED" as const,
    featured: true,
    publishedAt: new Date("2026-01-15"),
    seoTitle: "Rasa Theory and the Aesthetics of Empathy | Ānvīkṣikī",
    seoDescription: "How Bharata's rasa theory outstrips modern aesthetic theory in its account of how art produces universalised emotion.",
    keyTakeaways: ["Rasa theory explains why tragedy is pleasurable through the concept of sādhrāṇīkaraṇa (universalisation)", "For Abhinavagupta, rasa experience is structurally similar to meditative samādhi", "The system anticipates modern questions about empathy and aesthetic emotion"],
  },
  {
    slug: "the-geopolitics-of-the-indian-ocean-then-and-now",
    title: "The Geopolitics of the Indian Ocean: Then and Now",
    subtitle: "Maritime power, civilisational projection, and the logic of strategic geography",
    excerpt: "The Indian Ocean was, for most of recorded history, a Hindu-Buddhist lake. Understanding how that changed—and why it matters today—requires taking seriously the deep logic of maritime geography.",
    body: `
<p>The Indian Ocean was, for most of recorded history, a Hindu-Buddhist lake. The trade winds that drove commerce from Arabia to China, from the East African coast to the Malay peninsula, were navigated by merchants and sailors who carried not just goods but ideas—temple architecture, Sanskrit learning, devotional traditions, systems of governance. Understanding how that changed—and why it matters today—requires taking seriously the deep logic of maritime geography.</p>

<h2>The Ancient Maritime World</h2>

<p>The monsoon-driven trade network of the ancient Indian Ocean was among the most sophisticated commercial systems in pre-modern history. Indian merchants, known in Roman sources as <em>tabaci</em>, dominated trade from the Red Sea to Southeast Asia. The ports of Bharuch, Sopara, Arikamedu, and Mahabalipuram were nodes in a network that linked the Mediterranean to China.</p>

<p>What moved along these routes was not merely pepper, silk, and ivory. It was civilisation itself. The kingdoms of Southeast Asia—Funan, Champa, Srivijaya, the Khmer Empire—were partly shaped by Indian political and religious influence. This was not colonisation in the modern sense; it was a voluntary adoption, driven by the prestige of Sanskrit learning and the appeal of Hindu-Buddhist cosmology as a framework for kingship.</p>

<h2>The Portuguese Disruption</h2>

<p>Vasco da Gama's arrival in Calicut in 1498 inaugurated a period of violent disruption. The Portuguese used their superior artillery and naval tactics to seize the key choke points of Indian Ocean trade: Hormuz, Goa, Malacca. For the first time, a power from outside the region was able to impose tolls on the entire network.</p>

<p>The consequences were profound. The merchants of Gujarat, who had dominated the western Indian Ocean trade, were driven to ruin. The pilgrimage routes between India and Arabia were subjected to Portuguese interference. And the institutional fabric of the Indian Ocean world—the customs, legal norms, and diplomatic protocols that had governed commercial life for centuries—was disrupted and partially replaced.</p>

<h2>The Contemporary Strategic Landscape</h2>

<p>Today, the Indian Ocean is once again the centre of geopolitical contest. China's Belt and Road Initiative is, in part, an attempt to replicate the tributary trade networks of the ancient world—to project power through infrastructure and commerce rather than force alone. The "string of pearls"—Chinese-financed ports at Gwadar, Hambantota, Chittagong—form an arc around India's maritime periphery.</p>

<p>India's response has been cautious but increasingly assertive. The construction of the Andaman and Nicobar Command, the development of bilateral naval agreements with France, Australia, and the United States, and the Quad framework all reflect a growing awareness that the Indian Ocean is, once again, a domain of strategic competition.</p>

<p>The historical perspective is useful here. India has twice lost the commanding position it once held in this region—once to the Europeans, and once to the period of postcolonial retrenchment. The question of whether it can recover that position in the 21st century is one of the defining strategic questions of our time.</p>
    `.trim(),
    categorySlug: "geopolitics",
    tags: ["indian ocean", "geopolitics", "maritime", "history", "china", "strategic affairs"],
    authorName: "Vikram Nair",
    status: "PUBLISHED" as const,
    featured: false,
    publishedAt: new Date("2025-09-19"),
    seoTitle: "The Geopolitics of the Indian Ocean: Then and Now | Ānvīkṣikī",
    seoDescription: "How India's maritime heritage shapes the strategic logic of the Indian Ocean in the 21st century.",
    keyTakeaways: ["The ancient Indian Ocean was a Hindu-Buddhist civilisational network, not merely a trade route", "Portugal's arrival was the first time an external power imposed control on the entire system", "China's BRI mirrors the tributary trade logic of ancient maritime powers"],
  },
  {
    slug: "the-psychology-of-shadow-jung-and-the-vedantic-conception-of-avidya",
    title: "The Psychology of Shadow: Jung and the Vedāntic Conception of Avidyā",
    subtitle: "Two maps of the unconscious, separated by millennia",
    excerpt: "Carl Jung's concept of the shadow—the repository of all that the conscious ego refuses to acknowledge—has a remarkable analogue in the Vedāntic concept of avidyā, or primordial ignorance.",
    body: `
<p>Carl Jung's concept of the shadow—the repository of all that the conscious ego refuses to acknowledge—has a remarkable analogue in the Vedāntic concept of <em>avidyā</em>, or primordial ignorance. Both are theories of what prevents us from seeing clearly. Both see the task of psychological and spiritual development as the progressive illumination of what is hidden. And both insist that the path requires a confrontation, not an avoidance, of what is dark.</p>

<h2>Jung's Shadow</h2>

<p>For Jung, the shadow is not simply the repository of repressed evil. It contains everything that the conscious personality has not yet owned—including positive qualities that conflict with the ego's self-image. A person who identifies strongly with rationality may have repressed capacities for intuition and feeling. These do not disappear; they go underground, emerging in dreams, projections, and the sudden irrational behaviours that perplex both the individual and those around them.</p>

<p>The task of individuation—Jung's term for the process of psychological wholeness—requires integrating the shadow. This is painful work. It means acknowledging that the qualities we most despise in others are often those we most strongly deny in ourselves. It means accepting the full ambiguity of human nature.</p>

<h2>Avidyā in Advaita Vedānta</h2>

<p>The Vedāntic concept of <em>avidyā</em> is both similar and different. Like the shadow, it is a form of not-knowing—but it is primordial rather than individual. <em>Avidyā</em> is not simply the ignorance of this or that fact; it is the fundamental misidentification of the Self (<em>Ātman</em>) with the body-mind complex. This misidentification is the root of all suffering, all desire, all fear.</p>

<p>Śaṅkarācārya describes <em>avidyā</em> as beginningless (<em>anādi</em>)—it cannot be traced to any first cause, because it is itself the condition under which causality operates. It is the cosmic sleep from which the <em>jīva</em> (individual soul) must awaken.</p>

<h2>The Confrontation with Darkness</h2>

<p>Both traditions agree that the path forward requires looking into, not away from, what is hidden. Jung's method is analytical: dream interpretation, active imagination, the careful observation of projections. The Vedāntic method is more contemplative: self-inquiry (<em>ātmavicāra</em>), the repeated questioning "Who am I?", and the careful discrimination (<em>viveka</em>) between the real and the unreal.</p>

<p>The convergence is striking. Both traditions understand that the obstacle is not external—it is not the world that imprisons us, but our relationship to our own experience. And both hold out the possibility of genuine liberation: not the elimination of difficulty, but the end of our compulsive identification with it.</p>

<h2>Towards an Integral Psychology</h2>

<p>The dialogue between Jungian depth psychology and Vedāntic philosophy is still in its early stages. Thinkers like Sri Aurobindo, Haridas Chaudhuri, and more recently Jorge Ferrer have begun to map the terrain. But the full promise of this encounter has not yet been realised. A genuinely integral psychology—one that takes seriously both the depth of the unconscious and the reality of transcendence—may be one of the most important intellectual tasks of our time.</p>
    `.trim(),
    categorySlug: "psychology",
    tags: ["jung", "shadow", "vedanta", "avidya", "depth psychology", "consciousness"],
    authorName: "Rohini Desai",
    status: "PUBLISHED" as const,
    featured: false,
    publishedAt: new Date("2025-11-30"),
    seoTitle: "The Psychology of Shadow: Jung and the Vedāntic Conception of Avidyā | Ānvīkṣikī",
    seoDescription: "A comparative study of Jungian shadow work and the Vedāntic concept of avidyā as two maps of the hidden self.",
    keyTakeaways: ["Jung's shadow contains positive as well as negative qualities the ego refuses to own", "Avidyā is primordial misidentification of Self with body-mind, not mere factual ignorance", "Both traditions insist liberation requires confronting, not avoiding, what is hidden"],
  },
  {
    slug: "the-grammar-of-panini-the-first-formal-language-theory",
    title: "Pāṇini's Grammar: The First Formal Language Theory",
    subtitle: "How an ancient Sanskrit grammarian anticipated modern linguistics and computer science",
    excerpt: "Pāṇini's Aṣṭādhyāyī, composed around the 4th century BCE, is arguably the most remarkable intellectual achievement of antiquity. It is a complete formal grammar of Sanskrit—the first in human history.",
    body: `
<p>Pāṇini's <em>Aṣṭādhyāyī</em>, composed around the 4th century BCE, is arguably the most remarkable intellectual achievement of antiquity. It is a complete formal grammar of Sanskrit—the first in human history—expressed in a highly compressed meta-language of 3,959 sūtras (rules). It anticipated, by more than two millennia, the formal grammars that underlie modern linguistics and computer science.</p>

<h2>The Structure of the Aṣṭādhyāyī</h2>

<p>The grammar is organised around the concept of the <em>pratyāhāra</em>—a shorthand notation system that allows Pāṇini to refer to groups of sounds with a single symbol. The Śiva Sūtras that open the grammar list the phonemes of Sanskrit in an order designed to maximise the efficiency of the pratyāhāra system. This is not intuitive—it reflects a deep structural insight about the phonological system of the language.</p>

<p>The rules themselves are highly context-sensitive. Many apply only in specific morphological or phonological environments, and their ordering matters: later rules can override earlier ones in precisely specified ways. Understanding how the rules interact requires a kind of logical analysis that has no real parallel in pre-modern intellectual traditions outside India.</p>

<h2>Anticipating Formal Language Theory</h2>

<p>The linguist Leonard Bloomfield called the <em>Aṣṭādhyāyī</em> "one of the greatest monuments of human intelligence." The computer scientist Donald Knuth observed that Pāṇini's notation for context-sensitive rules is essentially equivalent to the Backus-Naur Form (BNF) used to specify the syntax of programming languages—a formalism developed independently in 1960.</p>

<p>This is not a superficial analogy. Pāṇini's grammar is generative: it specifies, by means of a finite set of rules, the infinite set of well-formed Sanskrit sentences. This is exactly what a formal grammar in the sense of Chomsky's generative linguistics does. Pāṇini got there first—and arguably did it more elegantly.</p>

<h2>The Tradition of Commentary</h2>

<p>The <em>Aṣṭādhyāyī</em> generated a tradition of commentarial scholarship that lasted more than two thousand years. The most important commentaries are the <em>Mahābhāṣya</em> of Patañjali (2nd century BCE) and the <em>Kāśikā</em> of Jayāditya and Vāmana (7th century CE). These works do not merely explain Pāṇini—they extend, critique, and philosophise about his grammar in ways that constitute an independent tradition of linguistic philosophy.</p>

<p>The question of what a grammar is for—whether it describes actual usage or prescribes correct usage, whether it captures the form or the meaning of language—was debated with great sophistication in this tradition, anticipating debates that continue in modern linguistics.</p>

<h2>The Rediscovery</h2>

<p>European scholars began seriously studying Pāṇini in the 19th century, following William Jones's famous observation in 1786 that Sanskrit bore a systematic resemblance to Greek and Latin. The discovery of Pāṇinian grammar contributed directly to the development of historical and comparative linguistics—the science that, more than any other, shaped the modern understanding of human language.</p>

<p>The debt of modern linguistics to Pāṇini is real, though often unacknowledged. It is a reminder that the history of formal thought does not begin in Greece or in the European Enlightenment.</p>
    `.trim(),
    categorySlug: "sanskrit-studies",
    tags: ["panini", "grammar", "sanskrit", "linguistics", "formal language", "ashtadhyayi"],
    authorName: "Suresh Iyer",
    status: "PUBLISHED" as const,
    featured: false,
    publishedAt: new Date("2025-10-05"),
    seoTitle: "Pāṇini's Grammar: The First Formal Language Theory | Ānvīkṣikī",
    seoDescription: "How Pāṇini's Aṣṭādhyāyī anticipated formal grammars, modern linguistics, and computer science by two thousand years.",
    keyTakeaways: ["Pāṇini's grammar is the first complete formal grammar in human history", "His notation is equivalent to the Backus-Naur Form used in computer science", "The commentarial tradition on Pāṇini constitutes an independent philosophy of language"],
  },
  {
    slug: "the-economics-of-dharma-an-arthashastra-reading",
    title: "The Economics of Dharma: An Arthaśāstra Reading",
    subtitle: "Ancient Indian economic thought beyond the stereotype of spiritual unworldliness",
    excerpt: "India is often depicted as a civilisation that transcended material concerns in favour of spiritual ones. The Arthaśāstra explodes this stereotype. It is one of the most practically minded economic treatises ever written.",
    body: `
<p>India is often depicted as a civilisation that transcended material concerns in favour of spiritual ones—that its great thinkers were concerned with mokṣa rather than money. The <em>Arthaśāstra</em> explodes this stereotype. It is one of the most practically minded economic treatises ever written, addressing everything from grain storage and taxation to market regulation, price controls, and trade policy.</p>

<h2>Artha as a Puruṣārtha</h2>

<p>The placement of <em>artha</em> (wealth, material wellbeing) as one of the four <em>puruṣārthas</em>—the legitimate aims of human life—is itself significant. Artha is not opposed to dharma; it is complementary to it. The pursuit of wealth, conducted within the constraints of dharma, is a fully legitimate human activity. The great error is not pursuing artha, but pursuing it in violation of dharmic norms.</p>

<p>Kauṭilya is explicit about the relationship between economic prosperity and dharmic order. A poor state cannot maintain its army, cannot administer justice, cannot provide security for its citizens. Poverty, in Kauṭilyan thought, is not a spiritual opportunity but a political emergency.</p>

<h2>Market Regulation in Ancient India</h2>

<p>The <em>Arthaśāstra</em> contains detailed provisions for market regulation that would not be out of place in a modern regulatory framework. There are provisions against hoarding and price manipulation (<em>nyāsaparivartana</em>), requirements for honest weights and measures, rules governing the conduct of merchants, and provisions for consumer protection.</p>

<p>The state is expected to play an active role in the economy—not as a direct producer (though state enterprises are also discussed) but as a regulator and enforcer of fair dealing. The insight that markets require institutional support to function honestly is one that modern economics rediscovered in the 20th century; it was obvious to Kauṭilya two millennia earlier.</p>

<h2>Trade Policy and State Revenue</h2>

<p>The <em>Arthaśāstra</em> is sophisticated on trade policy. It distinguishes between exports and imports, recognising that a surplus of exports generates wealth for the kingdom. It discusses the strategic use of trade routes, the importance of port infrastructure, and the relationship between trade and state revenue.</p>

<p>The fiscal sections of the text are particularly impressive. Kauṭilya identifies an enormous range of revenue sources—land taxes, trade taxes, fines, fees for state services, revenue from state enterprises—and provides guidelines for their administration. The result is a fiscal system of considerable complexity, designed to maximise revenue while minimising the burden on productive economic activity.</p>

<h2>The Arthaśāstra and Development Economics</h2>

<p>Contemporary development economics has rediscovered many of the insights embedded in the <em>Arthaśāstra</em>: the importance of state capacity, the need for honest markets, the relationship between security and prosperity. Reading Kauṭilya alongside Douglass North, Daron Acemoglu, or James Robinson reveals deep convergences—and occasionally shows the ancients ahead of the moderns.</p>
    `.trim(),
    categorySlug: "economics",
    tags: ["arthashastra", "economics", "kautilya", "artha", "markets", "ancient india"],
    authorName: "Raghunath Pillai",
    status: "PUBLISHED" as const,
    featured: false,
    publishedAt: new Date("2026-02-10"),
    seoTitle: "The Economics of Dharma: An Arthaśāstra Reading | Ānvīkṣikī",
    seoDescription: "How Kauṭilya's Arthaśāstra built a sophisticated framework for markets, taxation, and state economic policy.",
    keyTakeaways: ["Artha is a legitimate puruṣārtha — not opposed to dharma but complementary", "The Arthaśāstra contains market regulations equivalent to modern consumer protection", "Kauṭilya anticipated institutional economics by two millennia"],
  },
];

/* ─────────────────────────────────────────────────────────── */
/* PAPERS                                                       */
/* ─────────────────────────────────────────────────────────── */
const PAPERS = [
  {
    slug: "ontological-status-of-maya-in-advaita-vedanta",
    title: "The Ontological Status of Māyā in Advaita Vedānta: Between Illusion and Appearance",
    abstract: "This paper examines the complex ontological status of māyā in Advaita Vedānta, arguing against both the strong illusionist reading (māyā as mere hallucination) and the naïve realist reading (the world as fully real). Drawing on Śaṅkarācārya's commentaries on the Brahmasūtras and the Māṇḍūkya Upaniṣad, as well as Maṇḍana Miśra's Brahmasiddhi and Padmapāda's Pañcapādikā, we propose that māyā is best understood as a category of 'practical appearance' — real at the empirical level (vyāvahārika) but not at the absolute level (pāramārthika). We further argue that this distinction anticipates, in important respects, the phenomenological distinction between the natural attitude and the transcendental reduction in Husserl, and that a productive dialogue between these two traditions remains philosophically fruitful.",
    body: "Full text available upon journal subscription. Contact the editorial team for access.",
    categorySlug: "philosophy",
    tags: ["advaita", "maya", "ontology", "vedanta", "phenomenology", "husserl"],
    authorName: "Dr. Ananya Krishnan",
    peerReviewed: true,
    paperType: "RESEARCH_ARTICLE" as const,
    year: 2025,
    doi: "10.1234/anv.2025.0001",
    status: "PUBLISHED" as const,
    publishedAt: new Date("2025-11-01"),
    seoTitle: "The Ontological Status of Māyā in Advaita Vedānta | Ānvīkṣikī",
    seoDescription: "A peer-reviewed analysis of māyā in Advaita Vedānta, proposing a middle path between illusionism and realism.",
    citationText: `Krishnan, A. (2025). "The Ontological Status of Māyā in Advaita Vedānta: Between Illusion and Appearance." Ānvīkṣikī Journal of Research, 1(1).`,
  },
  {
    slug: "paninian-grammar-and-chomskyan-linguistics",
    title: "Pāṇinian Grammar and Chomskyan Linguistics: A Structural Comparison",
    abstract: "The paper undertakes a detailed structural comparison of Pāṇini's generative framework in the Aṣṭādhyāyī with Chomsky's transformational-generative grammar. We identify five domains of convergence — context-sensitive rule systems, the economy of representation, the distinction between deep and surface structure, the notion of grammaticality, and the recursive character of the rule systems — and three domains of irreducible difference: the treatment of meaning, the role of the speaker, and the relationship between grammar and usage. We conclude that the convergences are deep enough to warrant treating Pāṇini as a precursor to formal linguistics in the technical sense, while the differences point to philosophically important questions that neither tradition has fully resolved.",
    body: "Full text available upon journal subscription.",
    categorySlug: "sanskrit-studies",
    tags: ["panini", "chomsky", "linguistics", "formal grammar", "sanskrit", "generative grammar"],
    authorName: "Prof. Ramachandran Iyer",
    peerReviewed: true,
    paperType: "RESEARCH_ARTICLE" as const,
    year: 2025,
    doi: "10.1234/anv.2025.0002",
    status: "PUBLISHED" as const,
    publishedAt: new Date("2025-12-15"),
    seoTitle: "Pāṇinian Grammar and Chomskyan Linguistics | Ānvīkṣikī",
    seoDescription: "A structural comparison of Pāṇini's Aṣṭādhyāyī with Chomsky's transformational-generative grammar.",
    citationText: `Iyer, R. (2025). "Pāṇinian Grammar and Chomskyan Linguistics: A Structural Comparison." Ānvīkṣikī Journal of Research, 1(2).`,
  },
  {
    slug: "vijayanagara-temple-economy-and-agrarian-integration",
    title: "The Vijayanagara Temple Economy and Agrarian Integration: A Regional Study",
    abstract: "This paper examines the relationship between the temple institution and agrarian organisation in the Vijayanagara period (1336–1646), focusing on the Deccan plateau and eastern coastal zones. Using inscriptional evidence from 847 temple grants, land records from the Tanjore and Nellore districts, and travellers' accounts including those of Abdur Razzak and Niccolò de' Conti, we argue that the Vijayanagara temple was not merely a religious institution but an integrating mechanism that coordinated agricultural surplus, artisanal production, long-distance trade, and pilgrimage economies into a coherent civilisational system. The paper contributes to ongoing debates about the nature of pre-colonial South Asian states and the relationship between religious institutions and economic organisation.",
    body: "Full text available upon journal subscription.",
    categorySlug: "history",
    tags: ["vijayanagara", "temple economy", "agrarian history", "south india", "epigraphy"],
    authorName: "Dr. Lakshmi Venkatachalam",
    peerReviewed: true,
    paperType: "RESEARCH_ARTICLE" as const,
    year: 2026,
    doi: "10.1234/anv.2026.0001",
    status: "PUBLISHED" as const,
    publishedAt: new Date("2026-01-20"),
    seoTitle: "The Vijayanagara Temple Economy | Ānvīkṣikī",
    seoDescription: "An epigraphic and archival study of how Vijayanagara temples integrated agriculture, craft, and trade.",
    citationText: `Venkatachalam, L. (2026). "The Vijayanagara Temple Economy and Agrarian Integration: A Regional Study." Ānvīkṣikī Journal of Research, 2(1).`,
  },
  {
    slug: "rasa-theory-cognitive-science-emotional-universality",
    title: "Rasa Theory and Cognitive Science: Towards a Theory of Emotional Universality in Aesthetic Experience",
    abstract: "This paper brings Bharata's rasa theory and Abhinavagupta's elaboration of it into dialogue with contemporary cognitive science of emotion and aesthetic experience. We focus on three claims: (1) that aesthetic emotion differs structurally from ordinary emotion (the rasa/bhāva distinction); (2) that aesthetic experience involves a process of universalisation or depersonalisation (sādhrāṇīkaraṇa); and (3) that the culminating experience of śānta rasa corresponds to a state of reduced self-referential processing. We review recent neuroimaging and behavioural evidence bearing on each claim and conclude that the rasa framework makes empirically testable predictions that current cognitive science has not yet systematically investigated. The paper calls for a sustained interdisciplinary research programme at the intersection of classical Indian aesthetics and cognitive science.",
    body: "Full text available upon journal subscription.",
    categorySlug: "aesthetics",
    tags: ["rasa", "cognitive science", "aesthetics", "emotion", "abhinavagupta", "neuroscience"],
    authorName: "Dr. Kiran Murthy & Prof. Sarah Chen",
    peerReviewed: true,
    paperType: "RESEARCH_ARTICLE" as const,
    year: 2025,
    doi: "10.1234/anv.2025.0003",
    status: "PUBLISHED" as const,
    publishedAt: new Date("2025-10-10"),
    seoTitle: "Rasa Theory and Cognitive Science | Ānvīkṣikī",
    seoDescription: "A peer-reviewed study bringing Bharata's rasa theory into dialogue with contemporary cognitive science of emotion.",
    citationText: `Murthy, K. & Chen, S. (2025). "Rasa Theory and Cognitive Science." Ānvīkṣikī Journal of Research, 1(3).`,
  },
  {
    slug: "indian-ocean-trade-monsoon-networks-700-1500",
    title: "Indian Ocean Trade Networks, 700–1500 CE: Monsoon, Merchants, and the Making of a Maritime World",
    abstract: "This paper examines the structure and dynamics of Indian Ocean trade networks in the period 700–1500 CE, with particular attention to the role of Indian merchant communities (including Chettiar, Bania, and Mapilla traders), the institutional frameworks that governed commercial exchange, and the relationship between trade and civilisational diffusion. Drawing on Arabic, Chinese, and Sanskrit sources alongside archaeological evidence from coastal sites, we argue that the Indian Ocean world of this period constitutes a distinctive form of civilisational integration — one organised through voluntary commercial exchange and shared legal norms rather than political domination. The implications for current debates about early globalisation, institutional economics, and civilisational diffusion are discussed.",
    body: "Full text available upon journal subscription.",
    categorySlug: "history",
    tags: ["indian ocean", "maritime trade", "medieval history", "globalisation", "merchant communities"],
    authorName: "Prof. Rajan Pillai",
    peerReviewed: true,
    paperType: "RESEARCH_ARTICLE" as const,
    year: 2026,
    doi: "10.1234/anv.2026.0002",
    status: "PUBLISHED" as const,
    publishedAt: new Date("2026-02-05"),
    seoTitle: "Indian Ocean Trade Networks, 700–1500 CE | Ānvīkṣikī",
    seoDescription: "A peer-reviewed study of Indian Ocean trade networks as a distinctive form of civilisational integration.",
    citationText: `Pillai, R. (2026). "Indian Ocean Trade Networks, 700–1500 CE." Ānvīkṣikī Journal of Research, 2(2).`,
  },
];

/* ─────────────────────────────────────────────────────────── */
/* SEED FUNCTION                                               */
/* ─────────────────────────────────────────────────────────── */
async function seed() {
  console.log("🌱 Starting seed…\n");

  // Categories
  console.log("📂 Inserting categories…");
  for (const cat of CATEGORIES) {
    const existing = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, cat.slug)).limit(1);
    if (existing.length > 0) {
      console.log(`  ⏭  ${cat.slug} already exists`);
      continue;
    }
    await db.insert(categoriesTable).values(cat);
    console.log(`  ✅ ${cat.name}`);
  }

  // Articles
  console.log("\n📰 Inserting articles…");
  for (const art of ARTICLES) {
    const existing = await db.select().from(articlesTable).where(eq(articlesTable.slug, art.slug)).limit(1);
    if (existing.length > 0) {
      console.log(`  ⏭  "${art.title}" already exists`);
      continue;
    }
    await db.insert(articlesTable).values(art);
    console.log(`  ✅ ${art.title}`);
  }

  // Papers
  console.log("\n📄 Inserting papers…");
  for (const paper of PAPERS) {
    const existing = await db.select().from(papersTable).where(eq(papersTable.slug, paper.slug)).limit(1);
    if (existing.length > 0) {
      console.log(`  ⏭  "${paper.title}" already exists`);
      continue;
    }
    await db.insert(papersTable).values(paper);
    console.log(`  ✅ ${paper.title}`);
  }

  console.log("\n🎉 Seed complete!");
  await pool.end();
}

seed().catch(err => {
  console.error("Seed failed:", err);
  pool.end();
  process.exit(1);
});
