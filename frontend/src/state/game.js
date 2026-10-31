import { createContext, useContext } from 'react'
import { levelForXp } from '../lib/levels.js'
import { dayKey, streakNow } from '../lib/selectors.js'

// Shared game state. GameProvider.jsx holds it; components read it with useGame().
// `data` is the raw save (same shape as the API): user, activity, decks, cards,
// settings, reported. Screens get a computed view of it (counts, streak, upcoming).

export const GameContext = createContext(null)

export function useGame() {
  const game = useContext(GameContext)
  if (!game) throw new Error('useGame() must be used inside <GameProvider>')
  return game
}

export const DEFAULT_SETTINGS = { sound: false, haptics: true }

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

function bumpActivity(activity, now, correct) {
  const key = dayKey(now)
  const today = activity.find((a) => dayKey(a.date) === key)
  if (today) {
    return activity.map((a) =>
      a === today ? { ...a, answered: a.answered + 1, correct: a.correct + (correct ? 1 : 0) } : a,
    )
  }
  const noon = new Date(now)
  noon.setHours(12, 0, 0, 0)
  return [...activity, { date: noon.toISOString(), answered: 1, correct: correct ? 1 : 0 }].slice(-60)
}

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

    // One answer in a quiz. `result` comes from api.recordAnswer (the "server").
    case 'answer/recorded': {
      if (!state.data) return state
      const { cardId, correct, result, now } = action
      const { user, cards, decks, activity } = state.data
      const card = cards.find((c) => c.id === cardId)

      const fromXp = user.xp.total
      const toXp = fromXp + result.xp
      const fromLevel = levelForXp(fromXp)
      const toLevel = levelForXp(toXp)

      // The streak counts days with at least one XP-earning answer.
      let streak = user.streak
      const today = dayKey(now)
      if (result.xp > 0 && streak.lastStudyDate !== today) {
        const current = streakNow(streak, now).current + 1
        streak = { current, longest: Math.max(streak.longest, current), lastStudyDate: today }
      }

      return {
        ...state,
        data: {
          ...state.data,
          user: { ...user, xp: { total: toXp }, streak },
          cards: cards.map((c) => (c.id === cardId ? { ...c, review: result.review } : c)),
          decks: decks.map((d) => (d.id === card?.deckId ? { ...d, lastStudiedAt: new Date(now).toISOString() } : d)),
          activity: bumpActivity(activity, now, correct),
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

    case 'settings/update':
      return { ...state, data: { ...state.data, settings: { ...state.data.settings, ...action.patch } } }
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
