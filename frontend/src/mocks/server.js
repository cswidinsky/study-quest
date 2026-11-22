// ════════════════════════════════════════════════════════════════════════════
//  MOCK SERVER: a stand-in for the Flask backend, running in the browser.
// ════════════════════════════════════════════════════════════════════════════
// The team agreed Flask keeps the correct answers and calculates scores and XP.
// This file plays that role until the real API exists, so the rest of the app
// is written exactly as it will be against Flask:
//   - It owns the "database" (saved in localStorage under DB_KEY), including the
//     answer key: correctIndex, answer, explanation, sourceSnippet.
//   - The browser only ever receives PUBLIC card data (publicCard below). It
//     learns whether an answer was right only from submitAnswer's response.
//   - It tracks each quiz session (option order, attempts, misses, comebacks,
//     combo), so XP rules can't be gamed from the browser.
// Only src/api.js imports this file. Delete both mocks/ files when Flask is live.

import { buildGeneratedDeck, buildManualDeck, dashboardResponse } from './data.js'
import { levelForXp, xpForAnswer } from '../lib/levels.js'
import { daysSince, isDue, isNewCard, masteryOf, schedule } from '../lib/srs.js'
import { buildSession, toItem } from '../lib/session.js'
import { dayKey, streakNow } from '../lib/selectors.js'

const DB_KEY = 'studyquest:mock-db:v1'
const OLD_SAVE_KEY = 'studyquest:demo:v2' // the pre-server save: migrated once, then removed

// An error the API would send back as JSON: { "error": message } with an HTTP status.
export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/* ——— The "database" ——— */

let db = null

function readJson(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function seed() {
  const fresh = structuredClone(dashboardResponse)
  const old = readJson(OLD_SAVE_KEY)
  if (old?.cards && old?.user) {
    // Keep progress from the old browser save, filling in fields added since.
    const freshById = new Map(fresh.cards.map((c) => [c.id, c]))
    try {
      localStorage.removeItem(OLD_SAVE_KEY)
    } catch {
      // ignore
    }
    return {
      user: { ...fresh.user, ...old.user },
      activity: old.activity ?? fresh.activity,
      decks: old.decks ?? fresh.decks,
      cards: old.cards.map((c) => ({ ...c, sourcePage: c.sourcePage ?? freshById.get(c.id)?.sourcePage ?? null })),
      reported: old.reported ?? [],
    }
  }
  return { user: fresh.user, activity: fresh.activity, decks: fresh.decks, cards: fresh.cards, reported: [] }
}

function database() {
  if (!db) db = readJson(DB_KEY) ?? seed()
  return db
}

function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    // Storage full or blocked: the demo keeps working, it just won't persist.
  }
}

// What the browser may know about a card. Never the answer, explanation or snippet.
export function publicCard(card) {
  return {
    id: card.id,
    deckId: card.deckId,
    type: card.type,
    question: card.question,
    topic: card.topic,
    difficulty: card.difficulty ?? null,
    sourcePage: card.sourcePage ?? null,
    review: card.review,
  }
}

const findCard = (cardId) => {
  const card = database().cards.find((c) => c.id === cardId)
  if (!card) throw new ApiError('That card no longer exists.', 404)
  return card
}

/* ——— Endpoints ——— */

// GET /api/me/dashboard
export function getDashboard() {
  const d = database()
  return structuredClone({ user: d.user, activity: d.activity, decks: d.decks, cards: d.cards.map(publicCard), reported: d.reported })
}

// Sessions live in memory (a real server would store them). Reloading the page starts over.
const sessions = new Map()
let sessionSeq = 0

const toPublicItem = (item) => ({ card: publicCard(item.card), options: item.options })

// POST /api/sessions  { kind: 'due'|'deck'|'rematch', deckId?, cardIds? }
export function startSession({ kind = 'due', deckId, cardIds } = {}) {
  const d = database()
  const now = Date.now()
  const built = buildSession({ kind, deckId, cardIds, cards: d.cards, decks: d.decks, now })
  const id = `ses_${now.toString(36)}_${++sessionSeq}`

  const items = new Map()
  for (const item of built.items) {
    items.set(item.card.id, {
      options: item.options,
      correctIndex: item.correctIndex,
      // Decided now, at the start: only cards due or new at this moment can earn XP.
      countsForXp: !built.practice && (isDue(item.card, now) || isNewCard(item.card)),
      isNew: isNewCard(item.card),
      attempts: 0,
      missed: false,
      comebackAwarded: false,
      remote: item.card.remote ?? null, // { quizId, questionId } for cards Flask grades
      pendingChoice: null, // submit-at-end fallback: the pick, waiting for Flask's verdict
    })
  }
  const practice = built.items.length > 0 && [...items.values()].every((i) => !i.countsForXp)
  const gradedByFlask = [...items.values()].some((i) => i.remote && i.correctIndex == null)
  sessions.set(id, { id, items, combo: 0 })

  return structuredClone({
    sessionId: id,
    kind: built.kind,
    title: built.title,
    practice,
    gradedByFlask, // true → no flashcards until Flask has revealed these answers
    deckId: built.deck?.id ?? null,
    items: built.items.map(toPublicItem),
  })
}

function sessionItem(sessionId, cardId) {
  const session = sessions.get(sessionId)
  if (!session) throw new ApiError('This quiz session has expired. Start a new one.', 410)
  const item = session.items.get(cardId)
  if (!item) throw new ApiError('That card isn’t part of this quiz session.', 400)
  return { session, item }
}

// POST /api/sessions/:id/rematch  { cardIds }: the same cards again, options reshuffled.
export function rematchItems(sessionId, cardIds) {
  return cardIds.map((cardId) => {
    const { item } = sessionItem(sessionId, cardId)
    const card = findCard(cardId)
    const fresh = toItem(card)
    item.options = fresh.options
    item.correctIndex = fresh.correctIndex
    return structuredClone(toPublicItem(fresh))
  })
}

// GET /api/sessions/:id/cards/:cardId/answer: a flashcard's back, before you grade yourself.
export function revealAnswer(sessionId, cardId) {
  sessionItem(sessionId, cardId)
  const card = findCard(cardId)
  if (card.options && card.correctIndex == null) {
    throw new ApiError('Play this deck as multiple choice first: the server checks its answers.', 409)
  }
  return { answer: card.options ? card.options[card.correctIndex] : card.answer }
}

// Which Flask question a pick belongs to, if Flask must grade it (its answer isn't known here yet).
export function flaskTarget(sessionId, cardId) {
  const { item } = sessionItem(sessionId, cardId)
  return item.remote && item.correctIndex == null ? item.remote : null
}

// Store what Flask revealed about a question (after grading it), so later spaced
// reviews of this card still work after the server forgets the quiz.
function learnAnswer(card, item, verdict) {
  const raw = verdict.correct_answer
  const index = Number.isInteger(raw) ? raw : card.options.indexOf(raw)
  if (index >= 0) {
    card.correctIndex = index
    card.answer = card.options[index]
    item.correctIndex = index // the session kept Flask's option order, so positions match
  }
  card.explanation = verdict.explanation ?? card.explanation ?? null
  card.sourceSnippet = verdict.sourceSnippet ?? card.sourceSnippet ?? null
  card.sourcePage = verdict.sourcePage ?? card.sourcePage ?? null
}

// POST /api/sessions/:id/answers  { cardId, chosenIndex } or { cardId, selfGrade: 'got'|'missed' }
// The server grades the answer, applies the XP rules and the schedule, and saves.
// With Flask: `verdict` is Flask's answer for this pick, or `deferred: true` keeps the pick
// until the quiz is submitted (servers without the per-answer endpoint).
export function submitAnswer(sessionId, { cardId, chosenIndex = null, selfGrade = null, verdict = null, deferred = false }) {
  const { session, item } = sessionItem(sessionId, cardId)
  const card = findCard(cardId)
  const d = database()
  const now = Date.now()

  if (item.remote && item.correctIndex == null) {
    if (!Number.isInteger(chosenIndex) || chosenIndex < 0 || chosenIndex >= item.options.length) {
      throw new ApiError('Choose one of the four options.', 400)
    }
    if (deferred) {
      item.pendingChoice = chosenIndex
      return structuredClone({ deferred: true, chosenIndex, combo: session.combo, card: publicCard(card) })
    }
    if (!verdict) throw new ApiError('The server must check this answer.', 409)
    learnAnswer(card, item, verdict)
  }

  const selfGraded = selfGrade !== null
  if (!selfGraded && (!Number.isInteger(chosenIndex) || !item.options || chosenIndex < 0 || chosenIndex >= item.options.length)) {
    throw new ApiError('Choose one of the four options.', 400)
  }
  if (selfGraded && selfGrade !== 'got' && selfGrade !== 'missed') {
    throw new ApiError('A self-graded answer must be "got" or "missed".', 400)
  }

  const correct = verdict ? Boolean(verdict.correct) : selfGraded ? selfGrade === 'got' : chosenIndex === item.correctIndex
  const firstAttempt = item.attempts === 0
  session.combo = correct ? session.combo + 1 : 0

  const scored = xpForAnswer({
    correct,
    firstAttempt,
    countsForXp: item.countsForXp,
    isNew: item.isNew,
    missedThisSession: item.missed,
    comebackAwarded: item.comebackAwarded,
    difficulty: card.difficulty,
    daysSinceLastReview: daysSince(card.review.lastReviewedAt, now),
    selfGraded,
    combo: session.combo,
  })
  if (scored.reason === 'comeback') item.comebackAwarded = true
  if (!correct) item.missed = true
  item.attempts += 1

  // Only the first attempt at a card that counts moves its schedule.
  // Practice and later attempts just record the result.
  const before = card.review
  card.review = schedule(before, { correct, difficulty: card.difficulty, rematch: !(firstAttempt && item.countsForXp), now })

  // XP, streak (days with at least one XP-earning answer), activity, deck.
  const levelBefore = levelForXp(d.user.xp.total)
  d.user.xp = { total: d.user.xp.total + scored.xp }
  const today = dayKey(now)
  if (scored.xp > 0 && d.user.streak.lastStudyDate !== today) {
    const current = streakNow(d.user.streak, now).current + 1
    d.user.streak = { current, longest: Math.max(d.user.streak.longest, current), lastStudyDate: today }
  }
  const entry = d.activity.find((a) => dayKey(a.date) === today)
  if (entry) {
    entry.answered += 1
    entry.correct += correct ? 1 : 0
  } else {
    const noon = new Date(now)
    noon.setHours(12, 0, 0, 0)
    d.activity = [...d.activity, { date: noon.toISOString(), answered: 1, correct: correct ? 1 : 0 }].slice(-60)
  }
  const deck = d.decks.find((dk) => dk.id === card.deckId)
  if (deck) deck.lastStudiedAt = new Date(now).toISOString()
  persist()

  return structuredClone({
    correct,
    correctIndex: item.options ? item.correctIndex : null, // in the order this session showed
    correctOption: card.options ? card.options[card.correctIndex] : card.answer,
    explanation: card.explanation ?? null,
    sourceSnippet: card.sourceSnippet ?? null,
    sourcePage: card.sourcePage ?? null,
    xp: scored.xp,
    reason: scored.reason,
    parts: scored.parts,
    combo: session.combo,
    masteryBefore: masteryOf(before),
    masteryAfter: masteryOf(card.review),
    leveledUp: levelForXp(d.user.xp.total) > levelBefore,
    card: publicCard(card),
    user: { xp: d.user.xp, streak: d.user.streak },
    activity: d.activity,
    deck: deck ? { id: deck.id, lastStudiedAt: deck.lastStudiedAt } : null,
  })
}

// Submit-at-end fallback, step 1: the picks waiting for Flask, as POST /submit wants them.
export function deferredAnswers(sessionId) {
  const session = sessions.get(sessionId)
  if (!session) throw new ApiError('This quiz session has expired. Start a new one.', 410)
  const byQuiz = new Map()
  for (const item of session.items.values()) {
    if (!item.remote || item.pendingChoice === null) continue
    const entry = byQuiz.get(item.remote.quizId) ?? { quizId: item.remote.quizId, answers: {} }
    entry.answers[String(item.remote.questionId)] = item.pendingChoice
    byQuiz.set(item.remote.quizId, entry)
  }
  return [...byQuiz.values()]
}

// Step 2: apply Flask's results in quiz order, as if each had been graded on the spot.
export function applySubmitResults(sessionId, quizId, results) {
  const session = sessions.get(sessionId)
  if (!session) throw new ApiError('This quiz session has expired. Start a new one.', 410)
  const graded = []
  for (const [cardId, item] of session.items) {
    if (item.remote?.quizId !== quizId || item.pendingChoice === null) continue
    const verdict = results.find((r) => String(r.id) === String(item.remote.questionId))
    if (!verdict) continue
    const chosenIndex = item.pendingChoice
    item.pendingChoice = null
    graded.push({ cardId, chosenIndex, ...submitAnswer(sessionId, { cardId, chosenIndex, verdict }) })
  }
  return graded
}

// GET /api/cards/:id/answer: the answer for browsing a deck (outside a quiz).
export function getCardAnswer(cardId) {
  const card = findCard(cardId)
  if (card.options && card.correctIndex == null) {
    throw new ApiError('Answer it in a quiz first: the server reveals the answer after you try.', 409)
  }
  return {
    answer: card.options ? card.options[card.correctIndex] : card.answer,
    explanation: card.explanation ?? null,
    sourcePage: card.sourcePage ?? null,
  }
}

// POST /api/decks/generate → (job) → { deck, cards }: stores the full cards, returns public ones.
export function saveGeneratedDeck(options) {
  return saveDeck(buildGeneratedDeck(options))
}

// A deck generated by Flask (POST /api/quizzes). Flask keeps the answers; we keep the
// deck, the questions and your progress. Answers are learned as Flask grades them.
export function saveFlaskDeck({ quiz, fileName, title, course }) {
  const now = new Date().toISOString()
  const deck = {
    color: ['lagoon', 'rose', 'sky', 'lime', 'sun', 'tangerine'][database().decks.length % 6],
    id: `dck_q_${quiz.id}`,
    title,
    course,
    lastStudiedAt: null,
    exam: null,
    source: { type: 'pdf', fileName },
    createdAt: now,
  }
  const cards = quiz.questions.map((q) => ({
    id: `${deck.id}_${q.id}`,
    deckId: deck.id,
    type: 'mc',
    question: q.text,
    options: q.choices,
    correctIndex: null, // unknown until Flask grades it
    answer: null,
    explanation: null,
    difficulty: q.difficulty ?? null,
    topic: q.topic ?? title,
    sourceSnippet: null,
    sourcePage: q.sourcePage ?? null,
    remote: { quizId: quiz.id, questionId: q.id },
    review: { reps: 0, lapses: 0, intervalDays: 0, lastReviewedAt: null, dueAt: null, lastResult: null },
  }))
  return saveDeck({ deck, cards })
}

// POST /api/decks  { title, course, cards: [{ question, answer }] }
export function createManualDeck(payload) {
  if (!payload?.title?.trim()) throw new ApiError('Give the deck a name.', 400)
  if (!payload.cards?.length) throw new ApiError('Add at least one card with a question and an answer.', 400)
  return saveDeck(buildManualDeck(payload))
}

function saveDeck({ deck, cards }) {
  const d = database()
  d.decks = [deck, ...d.decks]
  d.cards = [...d.cards, ...cards]
  persist()
  return structuredClone({ deck, cards: cards.map(publicCard) })
}

// PATCH /api/me  { firstName, lastName }
export function updateProfile({ firstName, lastName }) {
  if (!firstName?.trim()) throw new ApiError('First name can’t be empty.', 400)
  const d = database()
  d.user = { ...d.user, firstName: firstName.trim(), lastName: (lastName ?? '').trim() }
  persist()
  return structuredClone(d.user)
}

// POST /api/cards/:id/report
export function reportQuestion(cardId) {
  findCard(cardId)
  const d = database()
  d.reported = [...new Set([...(d.reported ?? []), cardId])]
  persist()
  return { ok: true }
}

// Demo only: forget everything and start again from the mock data.
export function resetDemo() {
  db = null
  sessions.clear()
  try {
    localStorage.removeItem(DB_KEY)
    localStorage.removeItem(OLD_SAVE_KEY)
  } catch {
    // ignore
  }
}
