import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { getDashboard } from '../api.js'
import { XP_REWARDS } from '../lib/levels.js'
import { GameContext, initialState, reducer } from './game.js'

export default function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const load = useCallback(async () => {
    dispatch({ type: 'load/start' })
    try {
      dispatch({ type: 'load/success', data: await getDashboard() })
    } catch (error) {
      dispatch({ type: 'load/error', error: error.message })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const actions = useMemo(
    () => ({
      reload: load,
      addDeck: (deck) =>
        dispatch({
          type: 'deck/created',
          deck,
          xp: XP_REWARDS.deckCreated,
          reason: `Created “${deck.title}”`,
        }),
      showToast: (toast) => dispatch({ type: 'toast/show', toast }),
      dismissToast: (id) => dispatch({ type: 'toast/dismiss', id }),
      dismissLevelUp: () => dispatch({ type: 'levelUp/dismiss' }),
      clearLanded: () => dispatch({ type: 'deck/landed' }),
    }),
    [load],
  )

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
