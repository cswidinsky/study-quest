// All mock data lives here, shaped like the JSON the Flask backend should send.
// src/api.js is the only file that imports it, so swapping to real fetch() calls
// later means changing src/api.js and deleting this file.
//
// Dates are made relative to "now" so the mock always looks current.
// Totals are never typed in: the UI computes them from these rows.

const DAY = 24 * 60 * 60 * 1000
const daysAgo = (n) => new Date(Date.now() - n * DAY).toISOString()
const daysFromNow = (n) => new Date(Date.now() + n * DAY).toISOString()

// GET /api/me/dashboard
export const dashboardResponse = {
  user: {
    id: 'usr_8f2a91',
    firstName: 'Aisha',
    lastName: 'Rahman',
    // Level is worked out from total XP in src/lib/levels.js (backend should use the same formula).
    xp: { total: 2760 },
    streak: { current: 12, longest: 21, studiedToday: false },
  },

  // Reviews answered per day, last 7 days, oldest first. The last entry is today.
  activity: [
    { date: daysAgo(6), answered: 31, correct: 25 },
    { date: daysAgo(5), answered: 18, correct: 15 },
    { date: daysAgo(4), answered: 42, correct: 36 },
    { date: daysAgo(3), answered: 26, correct: 21 },
    { date: daysAgo(2), answered: 35, correct: 30 },
    { date: daysAgo(1), answered: 17, correct: 15 },
    { date: daysAgo(0), answered: 0, correct: 0 },
  ],

  // Cards that come due on each of the next 6 days (today's count comes from decks[].dueCount).
  upcoming: [
    { date: daysFromNow(1), due: 24 },
    { date: daysFromNow(2), due: 9 },
    { date: daysFromNow(3), due: 15 },
    { date: daysFromNow(4), due: 31 },
    { date: daysFromNow(5), due: 12 },
    { date: daysFromNow(6), due: 6 },
  ],

  decks: [
    {
      id: 'dck_chem2210_mech',
      color: 'tangerine',
      createdAt: daysAgo(24),
      title: 'Reaction mechanisms',
      course: { code: 'CHEM 2210', name: 'Organic Chemistry II' },
      cardCount: 64,
      masteredCount: 37,
      dueCount: 7,
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
      cardCount: 48,
      masteredCount: 35,
      dueCount: 5,
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
      cardCount: 36,
      masteredCount: 29,
      dueCount: 4,
      lastStudiedAt: daysAgo(3),
      exam: null,
      source: { type: 'pdf', fileName: 'ECON1101_Ch10_Monopoly_Oligopoly.pdf' },
    },
    {
      id: 'dck_comp2521_bigo',
      color: 'sky',
      createdAt: daysAgo(11),
      title: 'Big-O and recursion',
      course: { code: 'COMP 2521', name: 'Data Structures & Algorithms' },
      cardCount: 52,
      masteredCount: 34,
      dueCount: 2,
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
      cardCount: 40,
      masteredCount: 36,
      dueCount: 0,
      lastStudiedAt: daysAgo(6),
      exam: null,
      source: { type: 'pdf', fileName: 'PSYC1001_Lecture05_Heuristics.pdf' },
    },
    {
      id: 'dck_hist1203_revolution',
      color: 'lime',
      createdAt: daysAgo(2),
      title: 'The French Revolution',
      course: { code: 'HIST 1203', name: 'Modern European History' },
      cardCount: 30,
      masteredCount: 0,
      dueCount: 0,
      lastStudiedAt: null,
      exam: null,
      source: { type: 'pdf', fileName: 'HIST1203_Week3_Revolution.pdf' },
    },
  ],
}

// GET /api/decks/:id/cards (a sample of each deck's cards)
export const deckCards = {
  dck_chem2210_mech: [
    { question: 'Why does an SN1 reaction give a racemic mixture?', answer: 'The carbocation intermediate is planar, so the nucleophile can attack from either face.' },
    { question: 'Which substrate reacts fastest by SN2: methyl, primary, secondary or tertiary?', answer: 'Methyl. Less crowding lets the nucleophile reach the back of the carbon.' },
    { question: 'What is the rate law for an SN1 reaction?', answer: 'Rate = k[substrate]. Only the substrate takes part in the rate-determining step.' },
    { question: 'Why do polar aprotic solvents speed up SN2 reactions?', answer: 'They don’t hydrogen-bond to the nucleophile, so it stays free and reactive.' },
  ],
  dck_biol2010_signal: [
    { question: 'What does adenylyl cyclase make when a Gs protein activates it?', answer: 'Cyclic AMP (cAMP), made from ATP.' },
    { question: 'Which enzyme does cAMP activate?', answer: 'Protein kinase A (PKA).' },
    { question: 'How does a receptor tyrosine kinase become active?', answer: 'The ligand makes two receptors pair up, and each phosphorylates tyrosines on the other.' },
    { question: 'What switches a G protein off?', answer: 'Its own GTPase activity, which hydrolyses GTP to GDP.' },
  ],
  dck_econ1101_markets: [
    { question: 'Where does a monopolist set its output?', answer: 'Where marginal revenue equals marginal cost.' },
    { question: 'Why is a monopolist’s marginal revenue below its demand curve?', answer: 'To sell one more unit it has to lower the price on every unit it sells.' },
    { question: 'What is the kinked demand curve meant to explain?', answer: 'Sticky prices in oligopoly: rivals match price cuts but not price rises.' },
    { question: 'What profit does a firm in monopolistic competition earn in the long run?', answer: 'Zero economic profit, because new entrants pull its demand curve left.' },
  ],
  dck_comp2521_bigo: [
    { question: 'What is the time complexity of binary search on a sorted array?', answer: 'O(log n).' },
    { question: 'Why is naive recursive Fibonacci O(2ⁿ)?', answer: 'Each call branches into two more, recomputing the same subproblems again and again.' },
    { question: 'Solve T(n) = 2T(n/2) + n with the master theorem.', answer: 'O(n log n).' },
    { question: 'What happens if a recursive function has no base case?', answer: 'It recurses forever, until the call stack overflows.' },
  ],
  dck_psyc1001_bias: [
    { question: 'What is the availability heuristic?', answer: 'Judging how likely something is by how easily examples come to mind.' },
    { question: 'What is confirmation bias?', answer: 'Looking for, and favouring, information that supports what you already believe.' },
    { question: 'What is anchoring?', answer: 'Leaning too heavily on the first number you hear when you make an estimate.' },
    { question: 'What is hindsight bias?', answer: 'Believing, after something happens, that you knew it all along.' },
  ],
  dck_hist1203_revolution: [
    { question: 'Which event on 14 July 1789 is seen as the start of the Revolution?', answer: 'The storming of the Bastille.' },
    { question: 'What did the Declaration of the Rights of Man and of the Citizen proclaim?', answer: 'Liberty, equality before the law, and that sovereignty rests with the nation.' },
    { question: 'Who dominated the Committee of Public Safety during the Terror?', answer: 'Maximilien Robespierre.' },
    { question: 'What ended the Terror in July 1794?', answer: 'The Thermidorian Reaction: Robespierre’s arrest and execution.' },
  ],
}

// Ideas the mock "AI" pretends to find while it reads a PDF (shown floating out of the core).
export const generationKeywords = [
  'Concentration gradient',
  'Na⁺/K⁺-ATPase',
  'GLUT transporters',
  'Symport',
  'Aquaporins',
  'Active transport',
  'Lipid bilayer',
  'Facilitated diffusion',
]

// Steps the backend reports while it turns a PDF into a quiz.
// Real version: POST /api/decks/generate returns a job id, then GET /api/jobs/:id is polled.
export const generationStages = [
  { id: 'upload', label: 'Uploading your PDF', ms: 900 },
  { id: 'read', label: 'Reading your notes', ms: 1300 },
  { id: 'concepts', label: 'Picking out the key ideas', ms: 1100 },
  { id: 'write', label: 'Writing the questions', ms: 1700 },
  { id: 'check', label: 'Checking every answer', ms: 800 },
]

// Questions the mock "AI" returns, whatever PDF you upload.
const generatedCards = [
  {
    question: 'What separates facilitated diffusion from active transport?',
    answer:
      'Facilitated diffusion moves solutes down their concentration gradient through a protein, with no ATP. Active transport moves them against the gradient and needs energy.',
  },
  {
    question: 'How many Na⁺ and K⁺ ions does the Na⁺/K⁺-ATPase move for each ATP?',
    answer: 'Three Na⁺ out of the cell and two K⁺ in.',
  },
  {
    question: 'Why can’t glucose cross the lipid bilayer by simple diffusion?',
    answer:
      'It is large and polar, so it can’t pass the hydrophobic core. It crosses through GLUT transporters instead.',
  },
  {
    question: 'What does a symporter do?',
    answer:
      'Moves two solutes in the same direction, using one’s gradient to drive the other, as SGLT1 does with Na⁺ and glucose.',
  },
  {
    question: 'What are aquaporins for?',
    answer: 'They are channel proteins that let water cross the membrane quickly, in single file.',
  },
]

let nextId = 1
const newDeckId = () => `dck_new_${Date.now().toString(36)}_${nextId++}`

// New decks take the next colour in turn.
const NEW_DECK_COLORS = ['lagoon', 'rose', 'sky', 'lime', 'sun', 'tangerine']
const nextColor = () => NEW_DECK_COLORS[(nextId - 1) % NEW_DECK_COLORS.length]

// Response of GET /api/jobs/:id once the job is done.
export function buildGeneratedDeck({ fileName, title, course, questionCount }) {
  return {
    color: nextColor(),
    id: newDeckId(),
    title,
    course,
    cardCount: questionCount,
    masteredCount: 0,
    dueCount: 0,
    lastStudiedAt: null,
    exam: null,
    source: { type: 'pdf', fileName },
    createdAt: new Date().toISOString(),
    preview: generatedCards.slice(0, 3),
  }
}

// Response of POST /api/decks (a deck typed in by hand).
export function buildManualDeck({ title, course, cards }) {
  return {
    color: nextColor(),
    id: newDeckId(),
    title,
    course,
    cardCount: cards.length,
    masteredCount: 0,
    dueCount: 0,
    lastStudiedAt: null,
    exam: null,
    source: { type: 'manual' },
    createdAt: new Date().toISOString(),
    preview: cards.slice(0, 3),
  }
}

// Sanity checks: the mock must agree with itself.
const week = dashboardResponse.activity
console.assert(week.length === 7, 'activity should cover 7 days')
console.assert(
  dashboardResponse.decks.every((d) => d.masteredCount <= d.cardCount && d.dueCount <= d.cardCount),
  'a deck cannot master or owe more cards than it has',
)
console.assert(
  week.slice(0, 6).every((d) => d.answered > 0) && dashboardResponse.user.streak.current >= 6,
  'a 12-day streak means every one of the last 6 days was studied',
)
