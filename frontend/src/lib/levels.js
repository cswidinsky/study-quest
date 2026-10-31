// Levels get longer as you go. Level n starts at 50 × n × (n − 1) XP:
// level 1 at 0, level 2 at 100, level 3 at 300 … level 7 at 2,100, level 8 at 2,800.

export const XP_REWARDS = {
  deckCreated: 50,
}

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
