import { isDue, isNewCard } from './srs.js'
import { isWeak } from './selectors.js'

// SERVER-SIDE LOGIC: builds a quiz session (which cards, in what order, with shuffled
// options). It needs the answer key to shuffle, so only the mock server
// (src/mocks/server.js) uses it. Flask should do the same when it creates a session.
//   kind 'due'     → every card due today, across all decks (exam decks first)
//   kind 'deck'    → one deck: its due cards, then up to 10 new ones;
//                    if neither, a practice run of the whole deck (no XP)
//   kind 'rematch' → your weak spots (or the specific card ids you pass)

const MAX_CARDS = 20
const MAX_NEW = 10

const shuffle = (list) => {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Shuffle a multiple-choice card's options so position can't be memorised.
// Cards graded by Flask whose answer we don't know yet keep the server's order,
// because Flask grades by position (correct_answer is an index into its order).
export function toItem(card) {
  if (!card.options) return { card, options: null, correctIndex: null }
  if (card.correctIndex == null) return { card, options: card.options, correctIndex: null }
  const order = shuffle(card.options.map((_, i) => i))
  return { card, options: order.map((i) => card.options[i]), correctIndex: order.indexOf(card.correctIndex) }
}

export function buildSession({ kind, deckId, cardIds, cards, decks, now = Date.now() }) {
  const deckById = new Map(decks.map((d) => [d.id, d]))
  const examRank = (c) => {
    const exam = deckById.get(c.deckId)?.exam
    return exam ? new Date(exam.at).getTime() : Infinity
  }

  if (kind === 'rematch') {
    const pool = cardIds ? cards.filter((c) => cardIds.includes(c.id)) : cards.filter(isWeak)
    return {
      kind,
      title: 'Rematch your weak spots',
      practice: false,
      items: shuffle(pool).slice(0, MAX_CARDS).map(toItem),
    }
  }

  if (kind === 'deck') {
    const deck = deckById.get(deckId)
    const own = cards.filter((c) => c.deckId === deckId)
    const due = shuffle(own.filter((c) => isDue(c, now)))
    const fresh = own.filter(isNewCard).slice(0, MAX_NEW)
    const chosen = [...due, ...fresh].slice(0, MAX_CARDS)
    if (chosen.length) {
      return { kind, deck, title: deck?.title ?? 'Deck', practice: false, items: chosen.map(toItem) }
    }
    return { kind, deck, title: deck?.title ?? 'Deck', practice: true, items: shuffle(own).slice(0, MAX_CARDS).map(toItem) }
  }

  // 'due': soonest exam first, then shuffled within each deck
  const due = cards.filter((c) => isDue(c, now))
  const ordered = shuffle(due).sort((a, b) => examRank(a) - examRank(b))
  return { kind: 'due', title: 'Today’s review', practice: false, items: ordered.slice(0, MAX_CARDS).map(toItem) }
}
