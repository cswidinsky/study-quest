// Each deck has its own vivid colour (deck.color names one of the --color-deck-* tokens).
export const deckColor = (deck) => `var(--color-deck-${deck?.color ?? 'tangerine'})`

// Style for an element whose children use the deck colour via `var(--deck)`
// (Tailwind: bg-(--deck), text-(--deck), glow-deck …).
export const deckStyle = (deck) => ({ '--deck': deckColor(deck) })

// The deck whose card you clicked last. When you come back, that card skips its
// entrance animation, because it is already flying back into place.
let openedDeckId = null
export const rememberOpenedDeck = (id) => {
  openedDeckId = id
}
export const lastOpenedDeck = () => openedDeckId

// Name for the shared-element transition (card ↔ deck page). See .vt-shared in index.css.
export const deckTransitionStyle = (deck) => ({ '--vt-name': `deck-${deck.id}` })
