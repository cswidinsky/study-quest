import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { getDashboard } from '../api.js'
import { enrichDecks, lastDays, streakNow, upcoming } from '../lib/selectors.js'
import { clearSave, loadSave, writeSave } from '../lib/storage.js'
import { setSoundEnabled } from '../lib/sound.js'
import { setHapticsEnabled } from '../lib/haptics.js'
import { GameContext, initialState, reducer } from './game.js'

export default function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Start from the saved demo if there is one, otherwise from the (mock) API.
  const load = useCallback(async () => {
    const saved = loadSave()
    if (saved) {
      dispatch({ type: 'load/success', data: saved })
      return
    }
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

  // Save after every change, so a reload keeps your progress.
  useEffect(() => {
    if (state.data) writeSave(state.data)
  }, [state.data])

  // Keep the sound and vibration switches in sync with the settings.
  useEffect(() => {
    setSoundEnabled(Boolean(state.data?.settings?.sound))
    setHapticsEnabled(state.data?.settings?.haptics !== false)
  }, [state.data?.settings])

  // A clock that ticks once a minute, so "due today" stays right past midnight.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

  // What the screens read: totals computed from the raw cards and answers.
  const view = useMemo(() => {
    const d = state.data
    if (!d) return null
    return {
      ...d,
      user: { ...d.user, streak: streakNow(d.user.streak, now) },
      decks: enrichDecks(d.decks, d.cards, now),
      activity: lastDays(d.activity, 7, now),
      upcoming: upcoming(d.cards, 6, now),
    }
  }, [state.data, now])

  const actions = useMemo(
    () => ({
      reload: load,
      recordAnswer: (payload) => dispatch({ type: 'answer/recorded', now: Date.now(), ...payload }),
      addDeck: (deck, cards) => dispatch({ type: 'deck/created', deck, cards }),
      updateSettings: (patch) => dispatch({ type: 'settings/update', patch }),
      updateProfile: (patch) => dispatch({ type: 'profile/update', patch }),
      reportCard: (cardId) => dispatch({ type: 'card/reported', cardId }),
      showToast: (toast) => dispatch({ type: 'toast/show', toast }),
      dismissToast: (id) => dispatch({ type: 'toast/dismiss', id }),
      dismissLevelUp: () => dispatch({ type: 'levelUp/dismiss' }),
      holdCelebrations: (hold) => dispatch({ type: 'celebrations/hold', hold }),
      clearLanded: () => dispatch({ type: 'deck/landed' }),
      resetDemo: () => {
        clearSave()
        window.location.hash = '#/'
        window.location.reload()
      },
    }),
    [load],
  )

  const value = useMemo(() => ({ ...state, data: view, rawData: state.data, ...actions }), [state, view, actions])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
