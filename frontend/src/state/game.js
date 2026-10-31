import { createContext, useContext } from 'react'
import { levelForXp } from '../lib/levels.js'

// Shared game state: the dashboard data, XP, streak, toasts and level-ups.
// GameProvider.jsx holds it; any component reads it with useGame().

export const GameContext = createContext(null)

export function useGame() {
  const game = useContext(GameContext)
  if (!game) throw new Error('useGame() must be used inside <GameProvider>')
  return game
}

export const initialState = {
  status: 'loading', // 'loading' | 'ready' | 'error'
  error: null,
  data: null, // the dashboard response from api.js
  toasts: [], // [{ id, kind: 'xp' | 'streak' | 'info', ... }]
  levelUp: null, // { from, to } while the celebration is showing
}

let toastId = 0

export function reducer(state, action) {
  switch (action.type) {
    case 'load/start':
      return { ...state, status: state.data ? 'ready' : 'loading', error: null }
    case 'load/success':
      return { ...state, status: 'ready', data: action.data }
    case 'load/error':
      return { ...state, status: 'error', error: action.error }

    // A new deck: add it, award XP, and light today's streak if it isn't yet.
    case 'deck/created': {
      if (!state.data) return state
      const { user, decks } = state.data
      const fromXp = user.xp.total
      const toXp = fromXp + action.xp
      const fromLevel = levelForXp(fromXp)
      const toLevel = levelForXp(toXp)

      const lightsStreak = !user.streak.studiedToday
      const current = user.streak.current + (lightsStreak ? 1 : 0)
      const streak = {
        current,
        longest: Math.max(user.streak.longest, current),
        studiedToday: true,
      }

      const toasts = [
        ...state.toasts,
        { id: ++toastId, kind: 'xp', amount: action.xp, reason: action.reason, fromXp, toXp },
      ]
      if (lightsStreak) toasts.push({ id: ++toastId, kind: 'streak', days: current })

      return {
        ...state,
        data: {
          ...state.data,
          user: { ...user, xp: { total: toXp }, streak },
          decks: [action.deck, ...decks],
        },
        toasts,
        levelUp: toLevel > fromLevel ? { from: fromLevel, to: toLevel } : state.levelUp,
      }
    }

    case 'toast/show':
      return { ...state, toasts: [...state.toasts, { id: ++toastId, ...action.toast }] }
    case 'toast/dismiss':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) }
    case 'levelUp/dismiss':
      return { ...state, levelUp: null }
    default:
      return state
  }
}
