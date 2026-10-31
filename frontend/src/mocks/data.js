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

// Response of GET /api/jobs/:id once the job is done.
export function buildGeneratedDeck({ fileName, title, course, questionCount }) {
  return {
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
