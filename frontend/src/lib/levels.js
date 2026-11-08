/*
 * ════════════════════════════════════════════════════════════════════════════
 *  XP AND LEVELS: the single source of truth (#19)
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  ⚠  THE SERVER MUST CALCULATE THE REAL XP.
 *  The team agreed Flask keeps the correct answers and calculates scores and XP.
 *  In this repo only the mock server (src/mocks/server.js) calls these functions;
 *  the browser app never does. Port this file to Flask as-is (it's plain maths),
 *  compute XP on POST /api/sessions/:id/answers, and send the result back.
 *  Never accept an XP number (or a "correct" flag) from the client.
 *
 *  The idea: XP rewards LEARNING, not clicking.
 *    1. Only a correct answer on the FIRST attempt earns XP. Wrong answers cost nothing.
 *    2. Only cards that were DUE (or brand new) when the session started earn XP.
 *       Practising cards that aren't due earns 0, so nobody can farm XP by
 *       grinding the same easy card.
 *    3. Harder questions are worth more.
 *    4. Remembering something after a LONG gap is worth more (spaced repetition:
 *       the longer you held on to it, the more it counts).
 *    5. A combo (correct answers in a row) multiplies XP, capped at ×3.
 *    6. Flashcards are self-graded ("I knew it"), so they earn 75%: we can't check them.
 *    7. "Comeback": a card that was due/new at the start of the session, missed,
 *       then answered right later IN THE SAME SESSION earns a small fixed bonus,
 *       at most ONCE per card per session. Never on practice cards (not due).
 *    Creating decks earns nothing: the XP is in learning them.
 */

export const XP_RULES = {
  baseByDifficulty: { easy: 6, medium: 10, hard: 15 },
  selfGradedFactor: 0.75, // flashcards: we can't verify "I knew it"
  comebackXp: 3, // missed then fixed in the same session; once per card per session
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
 * The server tracks the session, so it knows every flag below; none come from the client.
 * @param {object} a
 * @param {boolean} a.correct          was the answer right?
 * @param {boolean} a.firstAttempt     first time this card is answered in this session?
 * @param {boolean} a.countsForXp      was the card due or new WHEN THE SESSION STARTED?
 * @param {boolean} a.isNew            had the card never been studied before the session?
 * @param {boolean} a.missedThisSession was this card answered wrong earlier in this session?
 * @param {boolean} a.comebackAwarded  has this card already earned its comeback this session?
 * @param {'easy'|'medium'|'hard'} [a.difficulty]  missing → treated as medium
 * @param {number}  a.daysSinceLastReview  days since the card was last answered (0 if new)
 * @param {boolean} a.selfGraded       flashcard ("I knew it") instead of multiple choice
 * @param {number}  a.combo            correct answers in a row, including this one
 * @returns {{ xp: number, reason: string, parts: object }}
 */
export function xpForAnswer(a) {
  if (!a.correct) return { xp: 0, reason: 'wrong', parts: {} }

  // Practice (not due, not new at the start of the session): never any XP, comeback included.
  if (!a.countsForXp) return { xp: 0, reason: 'practice', parts: {} }

  // A later attempt in the same session: only the one-off comeback is possible.
  if (!a.firstAttempt) {
    return a.missedThisSession && !a.comebackAwarded
      ? { xp: XP_RULES.comebackXp, reason: 'comeback', parts: {} }
      : { xp: 0, reason: 'retry', parts: {} }
  }

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
