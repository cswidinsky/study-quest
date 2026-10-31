// The one place the app gets data from. Right now it returns mocks with a short
// delay so loading states are visible. To connect the Flask backend, replace the
// body of each function with a fetch() call that returns the same shape.

import {
  buildGeneratedDeck,
  buildManualDeck,
  dashboardResponse,
  generationStages,
} from './mocks/data.js'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// TODO(backend): GET /api/me/dashboard
export async function getDashboard() {
  await wait(450)
  return structuredClone(dashboardResponse)
}

// TODO(backend): POST /api/decks/generate (multipart PDF), then poll GET /api/jobs/:id.
// onProgress gets { stageIndex, progress } where progress runs from 0 to 1.
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

// TODO(backend): POST /api/decks with { title, course, cards: [{ question, answer }] }
export async function createDeck(payload) {
  await wait(500)
  return buildManualDeck(payload)
}

export { generationStages }
