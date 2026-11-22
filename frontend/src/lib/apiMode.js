// Which backend the app talks to:
//   'live' → the real Flask server (generation and grading), the default.
//   'mock' → the in-browser mock server only (works offline; the demo safety net).
// Switch it in Settings, with ?mock=1 / ?live=1 in the URL, or set VITE_API_MODE=mock at build time.

const KEY = 'studyquest:api-mode'

// Where Flask lives. Empty = same origin (in dev, Vite proxies /api to port 5000).
// For a deployed frontend with Flask elsewhere, set VITE_API_BASE_URL (e.g. https://api.example.com).
export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

function fromUrl() {
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.has('mock')) return 'mock'
    if (params.has('live')) return 'live'
  } catch {
    // ignore
  }
  return null
}

export function getApiMode() {
  const url = fromUrl()
  if (url) {
    setApiMode(url) // remember it, so it sticks after the URL changes
    return url
  }
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'live' || saved === 'mock') return saved
  } catch {
    // ignore
  }
  return import.meta.env.VITE_API_MODE === 'mock' ? 'mock' : 'live'
}

export function setApiMode(mode) {
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    // ignore
  }
}
