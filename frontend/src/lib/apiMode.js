// Which backend generates and grades quizzes. Set by api.openWorld():
//   'live' → the real Flask server (your real account: Supabase data).
//   'mock' → the in-browser mock only (Demo mode: sample decks, works offline).

let mode = 'live'

export const getApiMode = () => mode
export const setApiMode = (next) => {
  mode = next === 'mock' ? 'mock' : 'live'
}

// Where Flask lives. Empty = same origin (in dev, Vite proxies /api to port 5000).
// For a deployed frontend with Flask elsewhere, set VITE_API_BASE_URL (e.g. https://api.example.com).
export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
