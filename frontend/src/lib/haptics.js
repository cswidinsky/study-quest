// Short vibrations on phones that support them (Android browsers).
// iPhone Safari doesn't let websites vibrate, so there this quietly does nothing.

let enabled = true

export const setHapticsEnabled = (on) => {
  enabled = on
}

const PATTERNS = {
  correct: 18,
  wrong: [30, 40, 30],
  combo: [15, 30, 15, 30, 40],
  levelup: [20, 40, 20, 40, 80],
}

export function buzz(name) {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return
  try {
    navigator.vibrate(PATTERNS[name] ?? 15)
  } catch {
    // ignore
  }
}
