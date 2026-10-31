// All mock data lives here, shaped like the JSON the Flask backend should send.
// src/api.js is the only file that imports it. To go live, change src/api.js and delete this file.
//
// Dates are made relative to "now" so the demo always looks current.
// Nothing here stores a total: the app computes due counts, mastery and accuracy from the cards.

const DAY = 24 * 60 * 60 * 1000
const now = Date.now()
const daysAgo = (n) => new Date(now - n * DAY).toISOString()
const daysFromNow = (n) => new Date(now + n * DAY).toISOString()
const noonDaysAgo = (n) => {
  const d = new Date(now - n * DAY)
  d.setHours(12, 0, 0, 0)
  return d.toISOString()
}
const dayKey = (iso) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// A card's memory state (the spaced-repetition schedule). Shorthand:
// null = never studied, or [intervalDays, reviewedDaysAgo, reps, lapses, lastResult]
function review(r) {
  if (!r) return { reps: 0, lapses: 0, intervalDays: 0, lastReviewedAt: null, dueAt: null, lastResult: null }
  const [intervalDays, ago, reps, lapses = 0, lastResult = 'right'] = r
  return { reps, lapses, intervalDays, lastReviewedAt: daysAgo(ago), dueAt: daysAgo(ago - intervalDays), lastResult }
}

// A multiple-choice card. Write the correct option first; it gets moved to a
// different position per card so correctIndex isn't always 0.
function mc(deckId, n, { topic, difficulty, question, options, explanation, snippet, state = null }) {
  const shift = n % 4
  const rotated = options.map((_, i) => options[(i - shift + 4) % 4])
  return {
    id: `${deckId}_c${n}`,
    deckId,
    type: 'mc',
    question,
    answer: options[0],
    options: rotated,
    correctIndex: shift,
    explanation,
    difficulty, // 'easy' | 'medium' | 'hard'
    topic,
    sourceSnippet: snippet,
    review: review(state),
  }
}

/* ——— Decks ——— */

const decks = [
  {
    id: 'dck_chem2210_mech',
    color: 'tangerine',
    createdAt: daysAgo(24),
    title: 'Reaction mechanisms',
    course: { code: 'CHEM 2210', name: 'Organic Chemistry II' },
    lastStudiedAt: daysAgo(1),
    exam: { label: 'Midterm', at: daysFromNow(5) },
    source: { type: 'pdf', fileName: 'CHEM2210_Lecture09_SN1_SN2.pdf' },
  },
  {
    id: 'dck_biol2010_signal',
    color: 'lagoon',
    createdAt: daysAgo(17),
    title: 'Cell signalling pathways',
    course: { code: 'BIOL 2010', name: 'Cell Biology' },
    lastStudiedAt: daysAgo(2),
    exam: null,
    source: { type: 'pdf', fileName: 'BIOL2010_Week6_Signalling.pdf' },
  },
  {
    id: 'dck_econ1101_markets',
    color: 'sun',
    createdAt: daysAgo(20),
    title: 'Market structures',
    course: { code: 'ECON 1101', name: 'Microeconomics' },
    lastStudiedAt: daysAgo(1),
    exam: null,
    source: { type: 'pdf', fileName: 'ECON1101_Ch10_Monopoly_Oligopoly.pdf' },
  },
  {
    id: 'dck_comp2521_bigo',
    color: 'sky',
    createdAt: daysAgo(11),
    title: 'Big-O and recursion',
    course: { code: 'COMP 2521', name: 'Data Structures & Algorithms' },
    lastStudiedAt: daysAgo(1),
    exam: null,
    source: { type: 'manual' },
  },
  {
    id: 'dck_psyc1001_bias',
    color: 'rose',
    createdAt: daysAgo(33),
    title: 'Cognitive biases',
    course: { code: 'PSYC 1001', name: 'Introduction to Psychology' },
    lastStudiedAt: daysAgo(3),
    exam: null,
    source: { type: 'pdf', fileName: 'PSYC1001_Lecture05_Heuristics.pdf' },
  },
  {
    id: 'dck_hist1203_revolution',
    color: 'lime',
    createdAt: daysAgo(2),
    title: 'The French Revolution',
    course: { code: 'HIST 1203', name: 'Modern European History' },
    lastStudiedAt: null,
    exam: null,
    source: { type: 'pdf', fileName: 'HIST1203_Week3_Revolution.pdf' },
  },
]

/* ——— Cards (5 per deck) ——— */

const chem = 'dck_chem2210_mech'
const biol = 'dck_biol2010_signal'
const econ = 'dck_econ1101_markets'
const comp = 'dck_comp2521_bigo'
const psyc = 'dck_psyc1001_bias'
const hist = 'dck_hist1203_revolution'

const cards = [
  // Organic Chemistry II: midterm in 5 days, 4 cards due
  mc(chem, 1, {
    topic: 'SN1',
    difficulty: 'medium',
    question: 'Why does an SN1 reaction at a chiral carbon give a racemic mixture?',
    options: [
      'The carbocation is planar, so the nucleophile can attack either face',
      'The nucleophile always attacks from the back side',
      'The leaving group comes back and swaps sides',
      'SN1 only happens at achiral carbons',
    ],
    explanation: 'SN1 goes through a flat (sp²) carbocation. The nucleophile can arrive from above or below with equal chance, so both mirror-image products form.',
    snippet: 'Because the carbocation is trigonal planar, nucleophilic attack occurs from either face, giving racemisation.',
    state: [2, 3, 3, 1],
  }),
  mc(chem, 2, {
    topic: 'SN2',
    difficulty: 'easy',
    question: 'Which substrate reacts fastest in an SN2 reaction?',
    options: ['Methyl bromide', 'tert-Butyl bromide', 'Isopropyl bromide', 'Neopentyl bromide'],
    explanation: 'SN2 needs the nucleophile to reach the back of the carbon. Methyl has the least crowding, so it is fastest; tertiary barely reacts.',
    snippet: 'SN2 rate: methyl > primary > secondary >> tertiary, reflecting steric hindrance to backside attack.',
    state: [5, 6, 4],
  }),
  mc(chem, 3, {
    topic: 'SN1',
    difficulty: 'medium',
    question: 'What is the rate law for an SN1 reaction?',
    options: ['Rate = k[substrate]', 'Rate = k[substrate][nucleophile]', 'Rate = k[nucleophile]', 'Rate = k[substrate]²'],
    explanation: 'Only the substrate takes part in the slow step (losing the leaving group), so the nucleophile does not appear in the rate law.',
    snippet: 'The rate-determining step is unimolecular ionisation; the nucleophile is not involved, so rate = k[RX].',
    state: [1, 1, 2, 1, 'wrong'],
  }),
  mc(chem, 4, {
    topic: 'Solvents',
    difficulty: 'hard',
    question: 'Why do polar aprotic solvents such as DMSO speed up SN2 reactions?',
    options: [
      'They don’t hydrogen-bond to the nucleophile, so it stays reactive',
      'They stabilise the carbocation intermediate',
      'They act as the nucleophile themselves',
      'They lower the temperature of the reaction',
    ],
    explanation: 'Protic solvents wrap anions in hydrogen bonds and slow them down. Aprotic solvents can’t, so the nucleophile stays “naked” and fast.',
    snippet: 'Polar aprotic solvents (DMSO, DMF, acetone) solvate cations but leave anions poorly solvated, enhancing nucleophilicity.',
    state: [3, 4, 2, 1],
  }),
  mc(chem, 5, {
    topic: 'Elimination',
    difficulty: 'hard',
    question: 'With a bulky base like potassium tert-butoxide, which alkene usually dominates?',
    options: ['The less substituted (Hofmann) alkene', 'The more substituted (Zaitsev) alkene', 'No alkene: substitution wins', 'An alcohol instead of an alkene'],
    explanation: 'A bulky base struggles to reach the inner hydrogens, so it removes the most accessible one, giving the less substituted alkene.',
    snippet: 'Sterically hindered bases such as t-BuOK favour the Hofmann (less substituted) product.',
    state: [24, 10, 6],
  }),

  // Cell Biology: 3 due
  mc(biol, 1, {
    topic: 'Second messengers',
    difficulty: 'easy',
    question: 'What does adenylyl cyclase make when a Gs protein switches it on?',
    options: ['Cyclic AMP (cAMP), from ATP', 'IP₃, from PIP₂', 'Cyclic GMP, from GTP', 'Calcium ions, from the ER'],
    explanation: 'Gs activates adenylyl cyclase, which turns ATP into cAMP, the classic second messenger.',
    snippet: 'Activated Gαs stimulates adenylyl cyclase, which converts ATP to cyclic AMP.',
    state: [12, 4, 5],
  }),
  mc(biol, 2, {
    topic: 'Second messengers',
    difficulty: 'medium',
    question: 'Which enzyme does cAMP activate?',
    options: ['Protein kinase A (PKA)', 'Protein kinase C (PKC)', 'Phospholipase C', 'A receptor tyrosine kinase'],
    explanation: 'cAMP binds the regulatory subunits of PKA, which releases the catalytic subunits to phosphorylate their targets.',
    snippet: 'cAMP binds the regulatory subunits of PKA, freeing the active catalytic subunits.',
    state: [3, 3, 2],
  }),
  mc(biol, 3, {
    topic: 'G proteins',
    difficulty: 'medium',
    question: 'What switches a G protein off?',
    options: ['Its own GTPase activity turning GTP into GDP', 'The receptor phosphorylating it', 'cAMP binding to its α subunit', 'Calcium leaving the cell'],
    explanation: 'The α subunit is a built-in timer: it slowly hydrolyses its GTP to GDP, which switches it off.',
    snippet: 'Gα has intrinsic GTPase activity; hydrolysis of GTP to GDP returns it to the inactive state.',
    state: [4, 5, 3, 1],
  }),
  mc(biol, 4, {
    topic: 'Receptor kinases',
    difficulty: 'hard',
    question: 'How does a receptor tyrosine kinase become active?',
    options: [
      'The ligand pairs two receptors, which phosphorylate each other',
      'A protease cuts it in half',
      'It binds GTP like a G protein',
      'It moves into the nucleus',
    ],
    explanation: 'Ligand binding brings two receptors together (dimerisation). Each kinase domain then adds phosphates to tyrosines on its partner.',
    snippet: 'Ligand-induced dimerisation leads to trans-autophosphorylation of tyrosine residues.',
    state: [2, 2, 2, 1, 'wrong'],
  }),
  mc(biol, 5, {
    topic: 'Second messengers',
    difficulty: 'hard',
    question: 'Phospholipase C splits PIP₂ into which two messengers?',
    options: ['IP₃ and DAG', 'cAMP and cGMP', 'ATP and ADP', 'Ca²⁺ and cAMP'],
    explanation: 'PLC cuts PIP₂ into IP₃, which releases Ca²⁺ from the ER, and DAG, which stays in the membrane and activates PKC.',
    snippet: 'PLC-β hydrolyses PIP₂ to generate IP₃ and diacylglycerol (DAG).',
    state: [6, 2, 3],
  }),

  // Microeconomics: 2 due
  mc(econ, 1, {
    topic: 'Monopoly',
    difficulty: 'easy',
    question: 'Where does a profit-maximising monopolist set its output?',
    options: ['Where marginal revenue equals marginal cost', 'Where price equals marginal cost', 'Where average cost is lowest', 'Where demand is most elastic'],
    explanation: 'Like any firm, it produces until one more unit adds as much to revenue as to cost (MR = MC), then reads the price off the demand curve.',
    snippet: 'The monopolist chooses Q where MR = MC and charges the price consumers will pay for that Q.',
    state: [30, 8, 7],
  }),
  mc(econ, 2, {
    topic: 'Monopoly',
    difficulty: 'medium',
    question: 'Why is a monopolist’s marginal revenue below its demand curve?',
    options: ['To sell one more unit it must lower the price on every unit', 'Because of government taxes', 'Because its costs rise with output', 'Because demand is perfectly elastic'],
    explanation: 'Selling one more unit means cutting the price for every customer, not just the new one, so the extra revenue is less than the price.',
    snippet: 'Selling an additional unit requires lowering the price on all units sold, so MR < P.',
    state: [14, 3, 5],
  }),
  mc(econ, 3, {
    topic: 'Oligopoly',
    difficulty: 'medium',
    question: 'What is the kinked demand curve meant to explain?',
    options: ['Why prices stay sticky in oligopoly', 'Why monopolies make losses', 'Why perfect competition is efficient', 'Why some demand curves slope upwards'],
    explanation: 'Rivals match a price cut but ignore a price rise, so changing price looks bad either way and prices stay put.',
    snippet: 'Firms expect rivals to match price cuts but not price increases, producing a kink and price rigidity.',
    state: [5, 5, 3],
  }),
  mc(econ, 4, {
    topic: 'Monopolistic competition',
    difficulty: 'hard',
    question: 'In the long run, what economic profit does a firm in monopolistic competition earn?',
    options: ['Zero', 'Positive, like a monopoly', 'Negative', 'Whatever the government allows'],
    explanation: 'Profits attract new firms with similar products. Their entry pulls each firm’s demand left until price just equals average cost.',
    snippet: 'Free entry shifts each firm’s demand curve left until P = ATC and economic profit is zero.',
    state: [8, 1, 4],
  }),
  mc(econ, 5, {
    topic: 'Oligopoly',
    difficulty: 'hard',
    question: 'Two firms face a prisoner’s dilemma over pricing. What is the Nash equilibrium?',
    options: ['Both cut their prices', 'Both keep prices high', 'One cuts, one keeps prices high', 'There is no equilibrium'],
    explanation: 'Whatever the rival does, cutting price is each firm’s best reply, so both cut, even though both would earn more by cooperating.',
    snippet: 'Cheating is a dominant strategy for each firm, so the equilibrium is mutual defection.',
    state: [3, 4, 2, 2, 'wrong'],
  }),

  // Data Structures & Algorithms: 2 due
  mc(comp, 1, {
    topic: 'Complexity',
    difficulty: 'easy',
    question: 'What is the time complexity of binary search on a sorted array?',
    options: ['O(log n)', 'O(n)', 'O(n log n)', 'O(1)'],
    explanation: 'Each comparison halves the range left to search, so it takes about log₂ n steps.',
    snippet: 'Binary search halves the remaining interval at every comparison: O(log n).',
    state: [40, 12, 8],
  }),
  mc(comp, 2, {
    topic: 'Recursion',
    difficulty: 'medium',
    question: 'Why is naive recursive Fibonacci O(2ⁿ)?',
    options: ['Each call makes two more calls and recomputes the same values', 'It runs a loop inside every call', 'All recursion is exponential', 'It sorts the numbers first'],
    explanation: 'The call tree roughly doubles at every level and keeps recomputing the same numbers. Memoising it brings it down to O(n).',
    snippet: 'fib(n) calls fib(n−1) and fib(n−2), recomputing overlapping subproblems; the call tree grows exponentially.',
    state: [10, 2, 4],
  }),
  mc(comp, 3, {
    topic: 'Master theorem',
    difficulty: 'hard',
    question: 'Using the master theorem, what is T(n) = 2T(n/2) + n?',
    options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'],
    explanation: 'a = 2 and b = 2, so n^(log_b a) = n. The extra work f(n) = n matches it, which adds a log factor: O(n log n). That’s merge sort.',
    snippet: 'Case 2: if f(n) = Θ(n^(log_b a)), then T(n) = Θ(n^(log_b a) · log n).',
    state: [6, 6, 3, 1],
  }),
  mc(comp, 4, {
    topic: 'Recursion',
    difficulty: 'easy',
    question: 'What happens if a recursive function has no base case?',
    options: ['It recurses until the call stack overflows', 'It returns 0', 'It runs once and stops', 'The compiler adds one automatically'],
    explanation: 'Without a base case nothing stops the calls, so each one adds a stack frame until memory for the stack runs out.',
    snippet: 'Every recursive function needs a base case; without one, calls never terminate and the stack overflows.',
    state: [5, 1, 3],
  }),
  mc(comp, 5, {
    topic: 'Complexity',
    difficulty: 'hard',
    question: 'What is the worst-case time to insert into a binary search tree with n nodes?',
    options: ['O(n)', 'O(log n)', 'O(1)', 'O(n log n)'],
    explanation: 'If keys arrive in sorted order the tree becomes a long chain, so you may walk past every node. Balanced trees prevent this.',
    snippet: 'An unbalanced BST can degenerate into a list; worst-case insertion is O(n).',
    state: [2, 3, 2, 1, 'wrong'],
  }),

  // Introduction to Psychology: nothing due
  mc(psyc, 1, {
    topic: 'Heuristics',
    difficulty: 'easy',
    question: 'What is the availability heuristic?',
    options: ['Judging how likely something is by how easily examples come to mind', 'Leaning on the first number you hear', 'Favouring information that fits what you believe', 'Believing you knew it all along'],
    explanation: 'Vivid or recent examples come to mind easily, so we overestimate how common they are, like plane crashes after a news story.',
    snippet: 'People estimate frequency by the ease with which instances can be brought to mind.',
    state: [25, 6, 6],
  }),
  mc(psyc, 2, {
    topic: 'Heuristics',
    difficulty: 'medium',
    question: 'What is confirmation bias?',
    options: ['Seeking and favouring information that supports what you already believe', 'Remembering only the first item in a list', 'Overestimating how often vivid events happen', 'Changing your view to match a group'],
    explanation: 'We notice, search for and remember evidence that agrees with us, and explain away evidence that doesn’t.',
    snippet: 'Confirmation bias: the tendency to search for and interpret information in ways that confirm prior beliefs.',
    state: [15, 5, 5],
  }),
  mc(psyc, 3, {
    topic: 'Heuristics',
    difficulty: 'medium',
    question: 'A jacket is labelled “was £200, now £120”. Which bias makes £120 feel cheap?',
    options: ['Anchoring', 'Hindsight bias', 'The availability heuristic', 'The misinformation effect'],
    explanation: 'The £200 is an anchor. Estimates are pulled towards the first number seen, so £120 feels like a bargain whatever the jacket is worth.',
    snippet: 'Anchoring: initial values serve as reference points that bias subsequent judgements.',
    state: [12, 4, 4, 1],
  }),
  mc(psyc, 4, {
    topic: 'Memory biases',
    difficulty: 'easy',
    question: 'What is hindsight bias?',
    options: ['Believing, after something happens, that you knew it all along', 'Forgetting things that happened long ago', 'Remembering events as more vivid than they were', 'Trusting the first source you read'],
    explanation: 'Once we know an outcome, it feels obvious, and we misremember how uncertain we were before.',
    snippet: 'Hindsight bias: the “I-knew-it-all-along” effect after learning an outcome.',
    state: [30, 10, 7],
  }),
  mc(psyc, 5, {
    topic: 'Memory biases',
    difficulty: 'hard',
    question: 'Why does the misinformation effect matter for eyewitness testimony?',
    options: ['Information given after an event can change what people remember', 'Witnesses usually lie on purpose', 'Memories are exact recordings', 'Stress always sharpens memory'],
    explanation: 'Loftus showed that leading questions (“smashed” vs “hit”) changed what people later remembered seeing. Memory is rebuilt, not replayed.',
    snippet: 'Post-event information can be incorporated into memory, altering eyewitness reports (Loftus & Palmer, 1974).',
    state: [7, 3, 3],
  }),

  // Modern European History: brand new, never studied
  mc(hist, 1, {
    topic: '1789',
    difficulty: 'easy',
    question: 'Which event on 14 July 1789 is seen as the start of the Revolution?',
    options: ['The storming of the Bastille', 'The execution of Louis XVI', 'The Tennis Court Oath', 'The women’s march on Versailles'],
    explanation: 'Parisian crowds seized the Bastille fortress and its gunpowder. 14 July is still France’s national day.',
    snippet: 'On 14 July 1789 crowds stormed the Bastille, a royal fortress and symbol of arbitrary power.',
  }),
  mc(hist, 2, {
    topic: '1789',
    difficulty: 'medium',
    question: 'What was the Tennis Court Oath of June 1789?',
    options: ['The Third Estate’s vow not to disband until France had a constitution', 'A royal decree closing the Estates-General', 'A treaty ending war with Austria', 'The founding of the Jacobin Club'],
    explanation: 'Locked out of their hall, the deputies met on a tennis court and swore to stay together until they had written a constitution.',
    snippet: 'Deputies of the Third Estate swore “never to separate” until a constitution was established (20 June 1789).',
  }),
  mc(hist, 3, {
    topic: '1789',
    difficulty: 'medium',
    question: 'What did the Declaration of the Rights of Man and of the Citizen proclaim?',
    options: ['Liberty, equality before the law, and sovereignty of the nation', 'The divine right of kings', 'A return to feudal dues', 'Catholicism as the only lawful faith'],
    explanation: 'Adopted in August 1789, it said rights belong to every citizen and power comes from the nation, not the king.',
    snippet: 'Article 1: “Men are born and remain free and equal in rights.”',
  }),
  mc(hist, 4, {
    topic: 'The Terror',
    difficulty: 'medium',
    question: 'Who dominated the Committee of Public Safety during the Terror?',
    options: ['Maximilien Robespierre', 'Napoleon Bonaparte', 'Georges Danton', 'Louis XVI'],
    explanation: 'Robespierre led the Committee in 1793–94. Danton was a rival who was himself executed in 1794.',
    snippet: 'Robespierre’s influence on the Committee of Public Safety made him the face of the Terror.',
  }),
  mc(hist, 5, {
    topic: 'The Terror',
    difficulty: 'hard',
    question: 'What ended the Terror in July 1794?',
    options: ['The Thermidorian Reaction: Robespierre’s arrest and execution', 'Napoleon’s coup of 18 Brumaire', 'The king’s flight to Varennes', 'A peace treaty with Britain'],
    explanation: 'On 9 Thermidor the Convention turned on Robespierre. His execution the next day ended the Terror.',
    snippet: 'The coup of 9 Thermidor (27 July 1794) brought down Robespierre and ended the Terror.',
  }),
]

// GET /api/me/dashboard
export const dashboardResponse = {
  user: {
    id: 'usr_8f2a91',
    firstName: 'Aisha',
    lastName: 'Rahman',
    joinedAt: daysAgo(46),
    // Level is worked out from total XP in src/lib/levels.js.
    xp: { total: 2760 },
    // The streak counts days with at least one XP-earning answer.
    streak: { current: 12, longest: 21, lastStudyDate: dayKey(daysAgo(1)) },
  },
  // Answers per day (oldest first). Missing days count as zero.
  activity: [
    { date: noonDaysAgo(6), answered: 31, correct: 25 },
    { date: noonDaysAgo(5), answered: 18, correct: 15 },
    { date: noonDaysAgo(4), answered: 42, correct: 36 },
    { date: noonDaysAgo(3), answered: 26, correct: 21 },
    { date: noonDaysAgo(2), answered: 35, correct: 30 },
    { date: noonDaysAgo(1), answered: 17, correct: 15 },
  ],
  decks,
  cards,
}

/* ——— Quiz generation (PDF upload) ——— */

// Steps the backend reports while it turns a PDF into a quiz.
// Real version: POST /api/decks/generate returns a job id, then GET /api/jobs/:id is polled.
export const generationStages = [
  { id: 'upload', label: 'Uploading your PDF', ms: 900 },
  { id: 'read', label: 'Reading your notes', ms: 1300 },
  { id: 'concepts', label: 'Picking out the key ideas', ms: 1100 },
  { id: 'write', label: 'Writing the questions', ms: 1700 },
  { id: 'check', label: 'Checking every answer', ms: 800 },
]

// Ideas the mock "AI" pretends to find while it reads (they float out of the core).
export const generationKeywords = [
  'Concentration gradient',
  'Na⁺/K⁺-ATPase',
  'GLUT transporters',
  'Symport',
  'Aquaporins',
  'Osmosis',
  'Secondary active transport',
  'Endocytosis',
]

// What the mock "AI" writes, whatever PDF you upload (membrane transport).
const generatedPool = [
  ['Active transport', 'medium', 'What separates facilitated diffusion from active transport?', ['Facilitated diffusion goes down the gradient with no ATP; active transport goes against it and needs energy', 'Only active transport uses membrane proteins', 'Facilitated diffusion needs ATP; active transport doesn’t', 'They are the same process'], 'Both use proteins. The difference is direction and energy: down the gradient for free, or up the gradient at a cost.', 'Facilitated diffusion is passive and follows the gradient; active transport moves solutes against it using energy.'],
  ['Active transport', 'easy', 'How many Na⁺ and K⁺ ions does the Na⁺/K⁺-ATPase move for each ATP?', ['3 Na⁺ out and 2 K⁺ in', '2 Na⁺ out and 3 K⁺ in', '1 Na⁺ out and 1 K⁺ in', '3 Na⁺ in and 2 K⁺ out'], 'Three sodium out, two potassium in. The uneven swap also makes the inside of the cell more negative.', 'Each cycle of the pump exports 3 Na⁺ and imports 2 K⁺ per ATP hydrolysed.'],
  ['Passive transport', 'medium', 'Why can’t glucose cross the lipid bilayer by simple diffusion?', ['It is large and polar, so it can’t pass the hydrophobic core', 'It is too small to be noticed by the membrane', 'It is positively charged', 'The membrane actively repels sugars'], 'The middle of the bilayer is oily. Big polar molecules like glucose need a GLUT transporter to get through.', 'Large polar molecules such as glucose require carrier proteins (GLUT family) to cross the membrane.'],
  ['Active transport', 'hard', 'What is secondary active transport?', ['Using one ion’s gradient to move another solute against its gradient', 'Using ATP directly to pump ions', 'Diffusion through an open channel', 'Moving large particles in vesicles'], 'The pump builds a sodium gradient with ATP. Symporters then spend that gradient to drag other molecules uphill.', 'Secondary active transport couples the downhill movement of one solute to the uphill movement of another.'],
  ['Passive transport', 'easy', 'What are aquaporins for?', ['Letting water cross the membrane quickly', 'Pumping sodium out of the cell', 'Carrying glucose into cells', 'Breaking down ATP'], 'Aquaporins are channels shaped to let water molecules through in single file, far faster than through the lipid.', 'Aquaporins are channel proteins that greatly increase membrane permeability to water.'],
  ['Osmosis', 'medium', 'What happens to a red blood cell in a hypotonic solution?', ['Water flows in and it may burst', 'It shrinks and crinkles', 'Nothing changes', 'It pumps the water back out with ATP'], 'Hypotonic means fewer solutes outside, so water moves in by osmosis. Without a cell wall, the cell can swell and burst (lyse).', 'In hypotonic solutions animal cells gain water and may lyse.'],
  ['Active transport', 'hard', 'Which transporter brings glucose into gut cells together with Na⁺?', ['SGLT1', 'GLUT4', 'Aquaporin-2', 'The Na⁺/K⁺-ATPase'], 'SGLT1 is a symporter: sodium flowing into the cell pulls glucose in with it, even against glucose’s own gradient.', 'SGLT1 couples Na⁺ entry to glucose uptake in the intestinal epithelium.'],
  ['Osmosis', 'easy', 'What is osmosis?', ['Water moving across a membrane towards the side with more solute', 'Solutes moving towards the side with less water', 'Ions being pumped by ATP', 'Cells swallowing large particles'], 'Water follows solutes: it moves from where there is less dissolved stuff to where there is more.', 'Osmosis is the net movement of water across a selectively permeable membrane towards higher solute concentration.'],
  ['Passive transport', 'medium', 'Which kind of molecule crosses a lipid bilayer most easily on its own?', ['Small and non-polar, like O₂', 'Large and polar, like glucose', 'Charged, like Na⁺', 'Large proteins'], 'Small non-polar molecules dissolve in the oily core and slip straight through. Charge and size both slow things down.', 'Small hydrophobic molecules (O₂, CO₂) diffuse freely; ions and large polar molecules do not.'],
  ['Active transport', 'medium', 'How is endocytosis best described?', ['The cell taking in material by folding its membrane into a vesicle', 'Water entering through aquaporins', 'Ions moving through channels', 'Proteins leaving the cell'], 'The membrane wraps around the material and pinches off inside the cell as a vesicle. It costs energy.', 'In endocytosis the plasma membrane invaginates and pinches off to form an intracellular vesicle.'],
]

let nextId = 1
const newDeckId = () => `dck_new_${Date.now().toString(36)}_${nextId++}`
const NEW_DECK_COLORS = ['lagoon', 'rose', 'sky', 'lime', 'sun', 'tangerine']
const nextColor = () => NEW_DECK_COLORS[(nextId - 1) % NEW_DECK_COLORS.length]

// Response of GET /api/jobs/:id once the job is done: the deck and its cards.
export function buildGeneratedDeck({ fileName, title, course, questionCount }) {
  const deck = {
    color: nextColor(),
    id: newDeckId(),
    title,
    course,
    lastStudiedAt: null,
    exam: null,
    source: { type: 'pdf', fileName },
    createdAt: new Date().toISOString(),
  }
  const cards = generatedPool.slice(0, questionCount).map(([topic, difficulty, question, options, explanation, snippet], i) =>
    mc(deck.id, i + 1, { topic, difficulty, question, options, explanation, snippet }),
  )
  return { deck, cards }
}

// Response of POST /api/decks (a deck typed in by hand). These are flashcards: no options.
export function buildManualDeck({ title, course, cards: written }) {
  const deck = {
    color: nextColor(),
    id: newDeckId(),
    title,
    course,
    lastStudiedAt: null,
    exam: null,
    source: { type: 'manual' },
    createdAt: new Date().toISOString(),
  }
  const cards = written.map((c, i) => ({
    id: `${deck.id}_c${i + 1}`,
    deckId: deck.id,
    type: 'flash',
    question: c.question,
    answer: c.answer,
    options: null,
    correctIndex: null,
    explanation: null,
    difficulty: 'medium',
    topic: title,
    sourceSnippet: null,
    review: review(null),
  }))
  return { deck, cards }
}

export const GENERATED_POOL_SIZE = generatedPool.length

// Sanity checks: the mock must agree with itself.
console.assert(cards.every((c) => c.options[c.correctIndex] === c.answer), 'correctIndex must point at the answer')
console.assert(new Set(cards.map((c) => c.id)).size === cards.length, 'card ids must be unique')
