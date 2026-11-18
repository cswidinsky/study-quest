// The one place the app talks to "the server".
// Right now every function calls the mock server (src/mocks/server.js) after a
// short delay, so loading states are real. To connect Flask, replace each body
// with a fetch() to the endpoint in its TODO(backend) note, returning the same
// shape. In dev, Vite proxies /api to Flask (see vite.config.js).
//
// Rules the team agreed:
//   - The browser never sees correct answers before answering, and never grades.
//     It sends the chosen option; the server answers right/wrong, the correct
//     option, the explanation, the XP and the card's new memory state.
//   - Errors come back as { "error": "message" }. Every function here throws an
//     Error whose .message is that text, so screens can show it as-is.

import { generationKeywords, generationStages, GENERATED_POOL_SIZE } from './mocks/data.js'
import * as server from './mocks/server.js'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Simulates a network round trip to the mock server.
async function call(ms, handler) {
  await wait(ms)
  return handler()
}

// TODO(backend): GET /api/me/dashboard → { user, activity, decks, cards, reported }
// Cards are public: { id, deckId, type, question, topic, difficulty?, sourcePage?, review }.
export function getDashboard() {
  return call(350, () => server.getDashboard())
}

// TODO(backend): POST /api/sessions { kind: 'due'|'deck'|'rematch', deckId?, cardIds? }
// → { sessionId, kind, title, practice, deckId, items: [{ card, options }] }
// The server picks the cards and shuffles each card's options. No answers included.
export function startSession({ kind, deckId, cardIds } = {}) {
  return call(250, () => server.startSession({ kind, deckId, cardIds }))
}

// TODO(backend): POST /api/sessions/:id/rematch { cardIds } → [{ card, options }] (options reshuffled)
export function rematchItems(sessionId, cardIds) {
  return call(150, () => server.rematchItems(sessionId, cardIds))
}

// TODO(backend): POST /api/sessions/:id/answers
// Body: { cardId, chosenIndex } (multiple choice) or { cardId, selfGrade: 'got'|'missed' } (flashcard),
//       plus { mode, timeTakenMs } for the answer log.
// → { correct, correctIndex, correctOption, explanation, sourceSnippet, sourcePage,
//     xp, reason, parts, combo, masteryBefore, masteryAfter, leveledUp,
//     card, user: { xp, streak }, activity, deck }
export function submitAnswer(sessionId, { cardId, chosenIndex = null, selfGrade = null }) {
  return call(120, () => server.submitAnswer(sessionId, { cardId, chosenIndex, selfGrade }))
}

// TODO(backend): GET /api/sessions/:id/cards/:cardId/answer → { answer }
// Flashcards only: the back of the card, shown before you grade yourself.
export function revealAnswer(sessionId, cardId) {
  return call(100, () => server.revealAnswer(sessionId, cardId))
}

// TODO(backend): GET /api/cards/:id/answer → { answer, explanation, sourcePage }
// For browsing a deck's cards outside a quiz.
export function getCardAnswer(cardId) {
  return call(150, () => server.getCardAnswer(cardId))
}

// TODO(backend): POST /api/decks/generate (multipart: file, title, course, questionCount) → { jobId },
// then poll GET /api/jobs/:id → { status, stageIndex, progress, result: { deck, cards } }
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
        try {
          resolve(server.saveGeneratedDeck({ fileName: file.name, ...options }))
        } catch (error) {
          reject(error)
        }
      }
    }, 100)

    signal?.addEventListener('abort', () => {
      clearInterval(timer)
      reject(new DOMException('Generation cancelled', 'AbortError'))
    })
  })
}

// TODO(backend): POST /api/decks { title, course, cards: [{ question, answer }] } → { deck, cards }
export function createDeck(payload) {
  return call(500, () => server.createManualDeck(payload))
}

// TODO(backend): PATCH /api/me { firstName, lastName } → user
export function updateProfile(patch) {
  return call(200, () => server.updateProfile(patch))
}

// TODO(backend): POST /api/cards/:id/report → 204
export function reportQuestion(cardId) {
  return call(150, () => server.reportQuestion(cardId))
}

// Demo only (no backend equivalent): wipe the mock server's saved data.
export function resetDemo() {
  return call(0, () => server.resetDemo())
}

export { generationKeywords, generationStages, GENERATED_POOL_SIZE }
