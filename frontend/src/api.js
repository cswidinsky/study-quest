// The one place the app talks to "the server". Right now every function is a
// mock with a short delay. To connect Flask, replace each body with a fetch()
// that returns the same shape. Each has a TODO(backend) naming its endpoint.

import {
  buildGeneratedDeck,
  buildManualDeck,
  dashboardResponse,
  generationKeywords,
  generationStages,
} from './mocks/data.js'
import { xpForAnswer } from './lib/levels.js'
import { daysSince, isDue, isNewCard, masteryOf, schedule } from './lib/srs.js'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// TODO(backend): GET /api/me/dashboard → { user, activity, decks, cards }
export async function getDashboard() {
  await wait(450)
  return structuredClone(dashboardResponse)
}

// TODO(backend): POST /api/reviews
// Body: { cardId, sessionId, answeredAt, correct, chosenIndex, mode, rematch, timeTakenMs, combo }
// The SERVER decides the XP and the card's next review, and returns them.
// This mock runs the same maths locally (synchronously, so the quiz can react instantly).
export function recordAnswer(card, { correct, rematch = false, selfGraded = false, combo = 0, firstTry = true, now = Date.now() }) {
  const before = card.review
  const { xp, reason, parts } = xpForAnswer({
    correct,
    firstTry,
    wasDue: isDue(card, now),
    isNew: isNewCard(card),
    wasWrongLastTime: before.lastResult === 'wrong',
    difficulty: card.difficulty,
    daysSinceLastReview: daysSince(before.lastReviewedAt, now),
    selfGraded,
    combo,
  })
  // A practice answer on a card that isn't due doesn't move its schedule.
  const practice = !isDue(card, now) && !isNewCard(card)
  const review = schedule(before, { correct, difficulty: card.difficulty, rematch: rematch || practice, now })
  return {
    xp,
    reason,
    parts,
    review,
    masteryBefore: masteryOf(before),
    masteryAfter: masteryOf(review),
  }
}

// TODO(backend): POST /api/decks/generate (multipart PDF) → { jobId }, then poll GET /api/jobs/:id
// → { status, stageIndex, progress, result: { deck, cards } }
export function generateDeckFromPdf(file, options, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const total = generationStages.reduce((sum, stage) => sum + stage.ms, 0)
    const start = performance.now()

    const timer = setInterval(() => {
      const elapsed = performance.now() - start
      let stageIndex = generationStages.length - 1
      let reached = 0
      for (let i = 0; i < generationStages.length; i++) {
        reached += generationStages[i].ms
        if (elapsed < reached) {
          stageIndex = i
          break
        }
      }
      const progress = Math.min(1, elapsed / total)
      onProgress?.({ stageIndex, progress })

      if (progress >= 1) {
        clearInterval(timer)
        resolve(buildGeneratedDeck({ fileName: file.name, ...options }))
      }
    }, 100)

    signal?.addEventListener('abort', () => {
      clearInterval(timer)
      reject(new DOMException('Generation cancelled', 'AbortError'))
    })
  })
}

// TODO(backend): POST /api/decks with { title, course, cards: [{ question, answer }] } → { deck, cards }
export async function createDeck(payload) {
  await wait(500)
  return buildManualDeck(payload)
}

// TODO(backend): POST /api/cards/:id/report with { reason } → 204
export async function reportQuestion() {
  await wait(150)
  return { ok: true }
}

export { generationKeywords, generationStages }
export { GENERATED_POOL_SIZE } from './mocks/data.js'
