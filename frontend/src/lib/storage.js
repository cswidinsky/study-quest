// What this browser remembers.
//   - Device preferences (sound, vibration) under SETTINGS_KEY. Not account data: they stay.
//   - Per-account items (the demo world, the demo switch) are keyed by user id, and
//     everything starting with "studyquest:" except the preferences is wiped on log out
//     and whenever a different account signs in on this browser. Real progress lives in
//     Supabase, never here.

const PREFIX = 'studyquest:'
const SETTINGS_KEY = 'studyquest:settings:v1'
const OWNER_KEY = 'studyquest:owner' // the account this browser's local data belongs to

export function readJson(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: it just won't persist.
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // nothing to remove
  }
}

export const loadSettings = () => readJson(SETTINGS_KEY)
export const saveSettings = (settings) => writeJson(SETTINGS_KEY, settings)
export const clearSettings = () => removeKey(SETTINGS_KEY)

// Forget everything account-related on this browser (demo world, switches, old caches).
export function clearLocalData() {
  for (const store of [safe(() => localStorage), safe(() => sessionStorage)]) {
    if (!store) continue
    const keys = []
    for (let i = 0; i < store.length; i++) keys.push(store.key(i))
    for (const key of keys) {
      if (key?.startsWith(PREFIX) && key !== SETTINGS_KEY) store.removeItem(key)
    }
  }
}

// Called when an account is signed in: if this browser's local data belongs to someone
// else (or to nobody yet), wipe it first, so nothing leaks from one account to another.
export function claimBrowser(userId) {
  let owner = null
  try {
    owner = localStorage.getItem(OWNER_KEY)
  } catch {
    // ignore
  }
  if (owner === userId) return
  clearLocalData()
  try {
    localStorage.setItem(OWNER_KEY, userId)
  } catch {
    // ignore
  }
}

// Demo mode switch, per account.
const demoKey = (userId) => `${PREFIX}demo-mode:${userId}`
export const loadDemoMode = (userId) => readJson(demoKey(userId)) === true
export const saveDemoMode = (userId, on) => (on ? writeJson(demoKey(userId), true) : removeKey(demoKey(userId)))

// The demo world's saved state, per account (it never touches real data).
export const demoWorldKey = (userId) => `${PREFIX}demo-db:${userId}`

function safe(get) {
  try {
    return get()
  } catch {
    return null
  }
}
