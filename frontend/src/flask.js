// The real Flask API (issue #21). Only src/api.js uses this file.
// Every error the server sends comes back as { "error": "..." }; we turn it into
// an Error with that message, so screens can show it as-is.
//
// Every quiz request carries the signed-in user's Supabase access token
// (Authorization: Bearer …), so Flask can tell whose quiz it is.

import { API_BASE } from './lib/apiMode.js'
import { supabase } from './lib/supabase.js'

export class FlaskError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'FlaskError'
    this.status = status
  }
}

// status for "this server doesn't have that route yet" (a non-JSON 404/405)
export const ROUTE_MISSING = 404.1

// Messages a student may see. Technical details stay in the console for us.
const OFFLINE = 'Couldn’t reach StudyQuest. Check your internet connection and try again, or try Demo mode in Settings.'
const UNAVAILABLE = 'That isn’t available right now. Try again in a little while.'
const SERVER_ERROR = 'Something went wrong on our side. Try again in a moment.'
const TOO_BIG = 'That PDF is too big to upload. Choose one under 4 MB.'

// The current session's token (supabase-js refreshes it first if it has expired).
async function authHeader() {
  if (!supabase) return {}
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, { method = 'GET', body, json, signal, auth = true } = {}) {
  const headers = { ...(auth ? await authHeader() : {}) }
  // FormData: let the browser set the multipart Content-Type (with its boundary).
  if (json) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      signal,
      headers,
      body: json ? JSON.stringify(json) : body,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new FlaskError(OFFLINE, 0)
  }

  const isJson = (response.headers.get('content-type') ?? '').includes('application/json')
  const data = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    if (!isJson) console.warn(`StudyQuest API ${method} ${path} answered ${response.status} without JSON`)
    // A non-JSON 404/405 means the route itself doesn't exist (an older server).
    if (!isJson && (response.status === 404 || response.status === 405)) {
      throw new FlaskError(UNAVAILABLE, ROUTE_MISSING)
    }
    // Vercel (4.5 MB) or Flask rejected the upload's size.
    if (response.status === 413) throw new FlaskError(TOO_BIG, 413)
    // Vite's proxy answers 500/502/504 with no JSON when Flask isn't running.
    if (!isJson && response.status >= 500) throw new FlaskError(OFFLINE, response.status)
    if (response.status === 401) {
      throw new FlaskError('Your session has expired. Log out and log in again, then try once more.', 401)
    }
    // 404 = this quiz isn't available (another account's, or the server forgot it).
    if (response.status === 404 && /quiz not found/i.test(data?.error ?? '')) {
      throw new FlaskError('This quiz isn’t available on the server any more. Upload the PDF again to make a new one.', 404)
    }
    throw new FlaskError(data?.error ?? SERVER_ERROR, response.status)
  }
  return data
}

// GET /api/health → true if Flask answers.
export async function health() {
  try {
    const data = await request('/api/health', { auth: false })
    return data?.status === 'ok'
  } catch {
    return false
  }
}

const quizPath = (quizId) => `/api/quizzes/${encodeURIComponent(quizId)}`

// POST /api/quizzes (multipart: "file", "question_count" 1–10)
//   → { id, requested, questions: [{ id, text, choices, difficulty }] }
// `requested` is how many were asked for; fewer can come back (questions that fail the check
// against the PDF are dropped, and Flask accepts the quiz when at least 80% survive).
export function createQuiz(file, { signal, questionCount = 5 } = {}) {
  const form = new FormData()
  form.append('file', file)
  form.append('question_count', String(questionCount))
  return request('/api/quizzes', { method: 'POST', body: form, signal })
}

// GET /api/quizzes/<id> → the same { id, questions } shape (no answers).
export function getQuiz(quizId) {
  return request(quizPath(quizId))
}

// POST /api/quizzes/<id>/submit { answers: { "<questionId>": choiceIndex } } (every question, once)
// → { score, total, results: [{ id, correct, correct_answer, explanation, sourcePage, sourceSnippet }] }
export function submitQuiz(quizId, answers) {
  return request(`${quizPath(quizId)}/submit`, { method: 'POST', json: { answers } })
}

// GET /api/quizzes/<id>/result (planned on the backend) → the /submit payload + { answers }.
// Only reads: it never grades again or awards XP.
export function getResult(quizId) {
  return request(`${quizPath(quizId)}/result`)
}
