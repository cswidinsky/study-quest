import { createContext, useContext } from 'react'
import { levelForXp } from '../lib/levels.js'

// Shared game state. GameProvider.jsx holds it; components read it with useGame().
// `data` holds what the server sent (user, activity, decks, public cards, reported)
// plus browser-only settings. Screens get a computed view of it (counts, streak, upcoming).
// Nothing here grades answers or calculates XP: that is the server's job.

export const GameContext = createContext(null)

export function useGame() {
  const game = useContext(GameContext)
  if (!game) throw new Error('useGame() must be used inside <GameProvider>')
  return game
}

// Sound is on unless the person turns it off (soundChosen marks that they used a sound toggle).
export const DEFAULT_SETTINGS = { sound: true, haptics: true }

export const initialState = {
  status: 'loading', // 'loading' | 'ready' | 'error'
  error: null,
  data: null,
  toasts: [],
  levelUp: null, // { from, to } while waiting to be celebrated
  celebrationsHeld: false, // the quiz holds the level-up until its results screen
  landedDeckId: null, // the deck just created: it "lands" on the dashboard
}

let toastId = 0

export function reducer(state, action) {
  switch (action.type) {
    case 'load/start':
      return { ...state, status: state.data ? 'ready' : 'loading', error: null }
    case 'load/success':
      return {
        ...state,
        status: 'ready',
        data: { settings: DEFAULT_SETTINGS, reported: [], ...action.data },
      }
    case 'load/error':
      return { ...state, status: 'error', error: action.error }

    // One graded answer. `action.response` comes from api.submitAnswer: the server has already
    // decided right/wrong, XP, streak and the card's new memory state. We just store it.
    case 'answer/applied': {
      if (!state.data) return state
      const r = action.response
      const fromLevel = levelForXp(state.data.user.xp.total)
      const toLevel = levelForXp(r.user.xp.total)
      return {
        ...state,
        data: {
          ...state.data,
          user: { ...state.data.user, xp: r.user.xp, streak: r.user.streak },
          cards: state.data.cards.map((c) => (c.id === r.card.id ? r.card : c)),
          decks: r.deck ? state.data.decks.map((d) => (d.id === r.deck.id ? { ...d, lastStudiedAt: r.deck.lastStudiedAt } : d)) : state.data.decks,
          activity: r.activity,
        },
        levelUp: toLevel > fromLevel ? { from: state.levelUp?.from ?? fromLevel, to: toLevel } : state.levelUp,
      }
    }

    // A new deck and its cards. No XP: learning the cards is what earns it.
    case 'deck/created': {
      if (!state.data) return state
      return {
        ...state,
        data: {
          ...state.data,
          decks: [action.deck, ...state.data.decks],
          cards: [...state.data.cards, ...action.cards],
        },
        landedDeckId: action.deck.id,
      }
    }

    case 'settings/update': {
      // Touching the sound switch is remembered as a choice (so the default never overrides it).
      const patch = 'sound' in action.patch ? { ...action.patch, soundChosen: true } : action.patch
      return { ...state, data: { ...state.data, settings: { ...state.data.settings, ...patch } } }
    }
    case 'profile/update':
      return { ...state, data: { ...state.data, user: { ...state.data.user, ...action.patch } } }
    case 'card/reported':
      return {
        ...state,
        data: { ...state.data, reported: [...new Set([...(state.data.reported ?? []), action.cardId])] },
      }

    case 'toast/show':
      return { ...state, toasts: [...state.toasts, { id: ++toastId, ...action.toast }] }
    case 'toast/dismiss':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) }
    case 'levelUp/dismiss':
      return { ...state, levelUp: null }
    case 'celebrations/hold':
      return { ...state, celebrationsHeld: action.hold }
    case 'deck/landed':
      return { ...state, landedDeckId: null }
    default:
      return state
  }
}
