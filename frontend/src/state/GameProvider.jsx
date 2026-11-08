import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import * as api from '../api.js'
import { enrichDecks, lastDays, streakNow, upcoming } from '../lib/selectors.js'
import { clearSettings, loadSettings, saveSettings } from '../lib/storage.js'
import { setSoundEnabled } from '../lib/sound.js'
import { setHapticsEnabled } from '../lib/haptics.js'
import { DEFAULT_SETTINGS, GameContext, initialState, reducer } from './game.js'

export default function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Progress comes from the server (the mock server saves it between visits).
  // Settings (sound, vibration) are browser-only.
  const load = useCallback(async () => {
    dispatch({ type: 'load/start' })
    try {
      const data = await api.getDashboard()
      dispatch({ type: 'load/success', data: { ...data, settings: { ...DEFAULT_SETTINGS, ...loadSettings() } } })
    } catch (error) {
      dispatch({ type: 'load/error', error: error.message })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Remember the browser-only settings, and keep the sound and vibration switches in sync.
  useEffect(() => {
    const settings = state.data?.settings
    if (!settings) return
    saveSettings(settings)
    setSoundEnabled(Boolean(settings.sound))
    setHapticsEnabled(settings.haptics !== false)
  }, [state.data?.settings])

  // A clock that ticks once a minute, so "due today" stays right past midnight.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

  // What the screens read: totals computed from the cards and answers the server sent.
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
      // Store a graded answer from api.submitAnswer (XP, streak and card come from the server).
      applyAnswer: (response) => dispatch({ type: 'answer/applied', response }),
      addDeck: (deck, cards) => dispatch({ type: 'deck/created', deck, cards }),
      updateSettings: (patch) => dispatch({ type: 'settings/update', patch }),
      updateProfile: async (patch) => {
        const user = await api.updateProfile(patch)
        dispatch({ type: 'profile/update', patch: user })
        return user
      },
      reportCard: async (cardId) => {
        await api.reportQuestion(cardId)
        dispatch({ type: 'card/reported', cardId })
      },
      showToast: (toast) => dispatch({ type: 'toast/show', toast }),
      dismissToast: (id) => dispatch({ type: 'toast/dismiss', id }),
      dismissLevelUp: () => dispatch({ type: 'levelUp/dismiss' }),
      holdCelebrations: (hold) => dispatch({ type: 'celebrations/hold', hold }),
      clearLanded: () => dispatch({ type: 'deck/landed' }),
      resetDemo: async () => {
        await api.resetDemo()
        clearSettings()
        window.location.hash = '#/'
        window.location.reload()
      },
    }),
    [load],
  )

  const value = useMemo(() => ({ ...state, data: view, rawData: state.data, ...actions }), [state, view, actions])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
