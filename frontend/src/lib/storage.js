// Browser-only preferences (sound, vibration). Progress (XP, streak, decks,
// card memory) belongs to the server; in the demo the mock server saves it.

const SETTINGS_KEY = 'studyquest:settings:v1'

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Storage full or blocked: settings just won't persist.
  }
}

export function clearSettings() {
  try {
    localStorage.removeItem(SETTINGS_KEY)
  } catch {
    // nothing to clear
  }
}
