import { isDue, isNewCard, masteryOf, masteryScore } from './srs.js'

// Everything the screens show is worked out here from the raw cards and answers,
// so a number can never disagree with another copy of itself.

const DAY = 24 * 60 * 60 * 1000

export function dayKey(date = new Date()) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const noonOf = (date) => {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  return d.toISOString()
}

// Decks with their counts filled in from their cards.
export function enrichDecks(decks, cards, now = Date.now()) {
  return decks.map((deck) => {
    const own = cards.filter((c) => c.deckId === deck.id)
    return {
      ...deck,
      cardCount: own.length,
      dueCount: own.filter((c) => isDue(c, now)).length,
      newCount: own.filter(isNewCard).length,
      masteredCount: own.filter((c) => masteryOf(c.review) === 'mastered').length,
      mastery: own.length ? Math.round(own.reduce((s, c) => s + masteryScore(c.review), 0) / own.length) : 0,
      weakCount: own.filter(isWeak).length,
    }
  })
}

// The last `n` days of answers, oldest first, with empty days filled in as zero.
export function lastDays(activity, n = 7, now = Date.now()) {
  const byKey = new Map(activity.map((a) => [dayKey(a.date), a]))
  return Array.from({ length: n }, (_, i) => {
    const date = new Date(now - (n - 1 - i) * DAY)
    const hit = byKey.get(dayKey(date))
    return { date: noonOf(date), answered: hit?.answered ?? 0, correct: hit?.correct ?? 0 }
  })
}

// Cards coming due on each of the next `n` days (tomorrow first).
export function upcoming(cards, n = 6, now = Date.now()) {
  return Array.from({ length: n }, (_, i) => {
    const date = new Date(now + (i + 1) * DAY)
    const key = dayKey(date)
    return {
      date: noonOf(date),
      due: cards.filter((c) => c.review.dueAt && dayKey(c.review.dueAt) === key).length,
    }
  })
}

// A weak spot: a card you got wrong last time, or have forgotten twice or more.
export const isWeak = (card) => card.review.reps > 0 && (card.review.lastResult === 'wrong' || card.review.lapses >= 2)

// Accuracy per topic, worst first. accuracy = right answers / all answers.
export function topicStats(cards, decks) {
  const map = new Map()
  for (const c of cards) {
    if (!c.review.reps) continue
    const key = `${c.deckId}::${c.topic}`
    const row = map.get(key) ?? { topic: c.topic, deck: decks.find((d) => d.id === c.deckId), reps: 0, lapses: 0, weak: 0 }
    row.reps += c.review.reps
    row.lapses += c.review.lapses
    if (isWeak(c)) row.weak += 1
    map.set(key, row)
  }
  return [...map.values()]
    .map((r) => ({ ...r, accuracy: Math.round(((r.reps - r.lapses) / r.reps) * 100) }))
    .sort((a, b) => a.accuracy - b.accuracy)
}

// Streak as it stands today: it breaks if the last study day was before yesterday.
export function streakNow(streak, now = Date.now()) {
  const today = dayKey(now)
  const yesterday = dayKey(now - DAY)
  const alive = streak.lastStudyDate === today || streak.lastStudyDate === yesterday
  return { ...streak, current: alive ? streak.current : 0, studiedToday: streak.lastStudyDate === today }
}

export function masteryCounts(cards) {
  const counts = { new: 0, learning: 0, familiar: 0, strong: 0, mastered: 0 }
  for (const c of cards) counts[masteryOf(c.review)] += 1
  return counts
}
