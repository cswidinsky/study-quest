/*
 * ════════════════════════════════════════════════════════════════════════════
 *  SPACED REPETITION + MASTERY LEVELS (per card)
 * ════════════════════════════════════════════════════════════════════════════
 *  Every card carries a `review` object: its memory state.
 *    { reps, lapses, intervalDays, lastReviewedAt, dueAt, lastResult }
 *  Like XP, the SERVER should own this: port schedule() to Flask and run it on
 *  POST /api/reviews. The browser copy keeps the demo playable offline.
 *
 *  How it works (a simplified SM-2):
 *    right → the gap until the next review grows (×2.0 hard, ×2.4 medium, ×2.8 easy)
 *    wrong → the card comes back tomorrow, and counts as a lapse
 *  Mastery comes from how long you can hold on to a card:
 */

const DAY = 24 * 60 * 60 * 1000

export const MASTERY_LEVELS = [
  { id: 'new', label: 'New', minDays: null }, // never studied
  { id: 'learning', label: 'Learning', minDays: 0 }, // gap under 3 days
  { id: 'familiar', label: 'Familiar', minDays: 3 }, // 3–9 days
  { id: 'strong', label: 'Strong', minDays: 10 }, // 10–20 days
  { id: 'mastered', label: 'Mastered', minDays: 21 }, // remembered for 3+ weeks
]

export const masteryIndex = (id) => MASTERY_LEVELS.findIndex((l) => l.id === id)

export function masteryOf(review) {
  if (!review || review.reps === 0) return 'new'
  const days = review.intervalDays
  if (days >= 21) return 'mastered'
  if (days >= 10) return 'strong'
  if (days >= 3) return 'familiar'
  return 'learning'
}

// 0–100: how far along a card is (for deck mastery bars).
export const masteryScore = (review) => [0, 20, 50, 75, 100][masteryIndex(masteryOf(review))]

const EASE = { easy: 2.8, medium: 2.4, hard: 2 }

const endOfToday = (now) => {
  const d = new Date(now)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

export const isNewCard = (card) => card.review.reps === 0
export const isDue = (card, now = Date.now()) =>
  card.review.reps > 0 && new Date(card.review.dueAt).getTime() <= endOfToday(now)

export function daysSince(iso, now = Date.now()) {
  if (!iso) return 0
  return Math.max(0, Math.round((now - new Date(iso).getTime()) / DAY))
}

/**
 * The card's next memory state after an answer.
 * `rematch: true` = a second try in the same session: it records the result
 * (so a comeback bonus can't be farmed) but doesn't move the schedule again.
 */
export function schedule(review, { correct, difficulty, rematch = false, now = Date.now() }) {
  const at = new Date(now).toISOString()
  if (rematch) return { ...review, lastResult: correct ? 'right' : 'wrong' }

  if (!correct) {
    return {
      ...review,
      reps: review.reps + 1,
      lapses: review.lapses + 1,
      intervalDays: 1,
      lastReviewedAt: at,
      dueAt: new Date(now + DAY).toISOString(),
      lastResult: 'wrong',
    }
  }

  const ease = EASE[difficulty] ?? EASE.medium
  const intervalDays =
    review.reps === 0 ? 2 : Math.max(review.intervalDays + 1, Math.round(Math.max(review.intervalDays, 1) * ease))

  return {
    ...review,
    reps: review.reps + 1,
    intervalDays,
    lastReviewedAt: at,
    dueAt: new Date(now + intervalDays * DAY).toISOString(),
    lastResult: 'right',
  }
}

export const masteryLabel = (id) => MASTERY_LEVELS[masteryIndex(id)]?.label ?? 'New'
