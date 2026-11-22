// The real Flask API (issue #21). Only src/api.js uses this file.
// Every error the server sends comes back as { "error": "..." }; we turn it into
// an Error with that message, so screens can show it as-is.

import { API_BASE } from './lib/apiMode.js'

export class FlaskError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'FlaskError'
    this.status = status
  }
}

const OFFLINE =
  'Couldn’t reach the StudyQuest server. Check that Flask is running, or switch to demo data in Settings.'

async function request(path, { method = 'GET', body, json, signal } = {}) {
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      signal,
      headers: json ? { 'Content-Type': 'application/json' } : undefined,
      body: json ? JSON.stringify(json) : body,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new FlaskError(OFFLINE, 0)
  }

  const isJson = (response.headers.get('content-type') ?? '').includes('application/json')
  const data = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    // A non-JSON 404/405 means the route itself doesn't exist (an older server).
    if (!isJson && (response.status === 404 || response.status === 405)) {
      throw new FlaskError('This server doesn’t support that yet.', response.status === 405 ? 405 : 404.1)
    }
    // Vite's proxy answers 500/502/504 with no JSON when Flask isn't running.
    if (!isJson && response.status >= 500) throw new FlaskError(OFFLINE, response.status)
    // Quizzes live in the server's memory, so a restart forgets them.
    if (response.status === 404 && /quiz not found/i.test(data?.error ?? '')) {
      throw new FlaskError('The server no longer has this quiz (it was probably restarted). Upload the PDF again to continue.', 404)
    }
    throw new FlaskError(data?.error ?? `The server returned an error (${response.status}).`, response.status)
  }
  return data
}

// GET /api/health → true if Flask answers.
export async function health() {
  try {
    const data = await request('/api/health')
    return data?.status === 'ok'
  } catch {
    return false
  }
}

// POST /api/quizzes (multipart field "file") → { id, questions: [{ id, text, choices, difficulty }] }
export function createQuiz(file, { signal } = {}) {
  const form = new FormData()
  form.append('file', file)
  return request('/api/quizzes', { method: 'POST', body: form, signal })
}

// POST /api/quizzes/<id>/answer { questionId, choice }
// → { correct, correct_answer, explanation, sourcePage, sourceSnippet }
// Returns null if the server doesn't have this endpoint yet (then use submitQuiz at the end).
export async function answerQuestion(quizId, questionId, choice) {
  try {
    return await request(`/api/quizzes/${encodeURIComponent(quizId)}/answer`, {
      method: 'POST',
      json: { questionId, choice },
    })
  } catch (error) {
    if (error instanceof FlaskError && (error.status === 404.1 || error.status === 405)) return null
    throw error
  }
}

// POST /api/quizzes/<id>/submit { answers: { "<questionId>": choiceIndex } } (every question)
// → { score, total, results: [{ id, correct, correct_answer, explanation, sourcePage, sourceSnippet }] }
export function submitQuiz(quizId, answers) {
  return request(`/api/quizzes/${encodeURIComponent(quizId)}/submit`, { method: 'POST', json: { answers } })
}
