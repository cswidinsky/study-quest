/*
 * ════════════════════════════════════════════════════════════════════════════
 *  XP AND LEVELS: the single source of truth (#19)
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  ⚠  THE SERVER MUST CALCULATE THE REAL XP.
 *  This copy runs in the browser so the demo works without a backend and so the
 *  UI can show what an answer is worth. Anything in the browser can be edited,
 *  so the API must never accept an XP number from the client. Port this file to
 *  Flask as-is (it's plain maths), compute XP on POST /api/reviews, and send the
 *  result back. The constants below should live in one place on the server too.
 *
 *  The idea: XP rewards LEARNING, not clicking.
 *    1. Only a correct answer on the FIRST try earns XP. Wrong answers cost nothing.
 *    2. Only cards that are DUE (or brand new) earn XP. Re-answering a card you
 *       already reviewed, or "practising" cards that aren't due, earns 0.
 *       So nobody can farm XP by grinding the same easy card.
 *    3. Harder questions are worth more.
 *    4. Remembering something after a LONG gap is worth more (spaced repetition:
 *       the longer you held on to it, the more it counts).
 *    5. A combo (correct answers in a row) multiplies XP, capped at ×3.
 *    6. Flashcards are self-graded ("I knew it"), so they earn 75%: we can't check them.
 *    7. "Comeback": getting a card right that you got WRONG last time, when it
 *       isn't due, earns a small fixed bonus once (learning from mistakes).
 *    Creating decks earns nothing: the XP is in learning them.
 */

export const XP_RULES = {
  baseByDifficulty: { easy: 6, medium: 10, hard: 15 },
  selfGradedFactor: 0.75, // flashcards: we can't verify "I knew it"
  comebackXp: 3, // right on a card you missed last time, when it isn't due
  // Combo tiers: from the 3rd correct answer in a row, ×1.5; 6th ×2; 9th ×2.5; 12th ×3.
  comboTiers: [
    { from: 12, multiplier: 3 },
    { from: 9, multiplier: 2.5 },
    { from: 6, multiplier: 2 },
    { from: 3, multiplier: 1.5 },
    { from: 0, multiplier: 1 },
  ],
}

// ×1 for a card seen today … ×2 for one you held on to for a month or more.
// 1 day → ×1.2 · 3 days → ×1.4 · 7 days → ×1.6 · 15 days → ×1.8 · 31+ days → ×2.0
export function memoryBonus(daysSinceLastReview) {
  if (!daysSinceLastReview || daysSinceLastReview < 0) return 1
  return Math.round((1 + Math.min(1, Math.log2(1 + daysSinceLastReview) / 5)) * 100) / 100
}

// `combo` = correct answers in a row, INCLUDING this one.
export function comboMultiplier(combo) {
  return XP_RULES.comboTiers.find((tier) => combo >= tier.from).multiplier
}

/**
 * XP for one answer.
 * @param {object} a
 * @param {boolean} a.correct          was the answer right?
 * @param {boolean} a.firstTry         first attempt at this card in this session?
 * @param {boolean} a.wasDue           was the card due today (or overdue) when answered?
 * @param {boolean} a.isNew            had the card never been studied before?
 * @param {boolean} a.wasWrongLastTime was the previous answer to this card wrong?
 * @param {'easy'|'medium'|'hard'} a.difficulty
 * @param {number}  a.daysSinceLastReview  days since the card was last answered (0 if new)
 * @param {boolean} a.selfGraded       flashcard ("I knew it") instead of multiple choice
 * @param {number}  a.combo            correct answers in a row, including this one
 * @returns {{ xp: number, reason: string, parts: object }}
 */
export function xpForAnswer(a) {
  if (!a.correct) return { xp: 0, reason: 'wrong', parts: {} }

  // Not due and not new: practice. Only a one-off comeback bonus is possible.
  if (!a.wasDue && !a.isNew) {
    return a.wasWrongLastTime
      ? { xp: XP_RULES.comebackXp, reason: 'comeback', parts: {} }
      : { xp: 0, reason: 'practice', parts: {} }
  }
  if (!a.firstTry) return { xp: 0, reason: 'retry', parts: {} }

  const base = XP_RULES.baseByDifficulty[a.difficulty] ?? XP_RULES.baseByDifficulty.medium
  const memory = a.isNew ? 1 : memoryBonus(a.daysSinceLastReview)
  const graded = a.selfGraded ? XP_RULES.selfGradedFactor : 1
  const combo = comboMultiplier(a.combo)

  return {
    xp: Math.round(base * memory * graded * combo),
    reason: a.isNew ? 'new' : 'due',
    parts: { base, memory, graded, combo },
  }
}

/* ─── Levels ─────────────────────────────────────────────────────────────────
 * Levels get longer as you go. Level n starts at 50 × n × (n − 1) total XP:
 * level 1 at 0, level 2 at 100, level 3 at 300 … level 7 at 2,100, level 8 at 2,800.
 */

export const levelStartXp = (level) => 50 * level * (level - 1)

export function levelForXp(total) {
  let level = 1
  while (levelStartXp(level + 1) <= total) level++
  return level
}

// Everything the UI needs to draw a level and its progress bar.
export function levelProgress(total) {
  const level = levelForXp(total)
  const start = levelStartXp(level)
  const next = levelStartXp(level + 1)
  return {
    level,
    inLevel: total - start, // XP earned inside this level
    span: next - start, // XP this level needs in total
    toNext: next - total, // XP still needed
    nextLevelXp: next,
  }
}
