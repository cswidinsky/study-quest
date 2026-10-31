// Demo save file: progress (XP, level, streak, card memory, decks, settings)
// lives in localStorage so it survives a reload. Bump the version when the shape changes.

const KEY = 'studyquest:demo:v2'

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // Storage full or blocked: the demo keeps working, it just won't persist.
  }
}

// "Reset demo" in Settings: forget everything and start from the mock data again.
export function clearSave() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nothing to clear
  }
}
