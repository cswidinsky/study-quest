import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import * as api from '../api.js'
import { enrichDecks, lastDays, streakNow, upcoming } from '../lib/selectors.js'
import { loadSettings, saveSettings } from '../lib/storage.js'
import { setSoundEnabled } from '../lib/sound.js'
import { setHapticsEnabled } from '../lib/haptics.js'
import { DEFAULT_SETTINGS, GameContext, initialState, reducer } from './game.js'
import { splitName } from './auth.js'

// One signed-in user's game. App.jsx mounts a fresh GameProvider per user and per world
// (real data or Demo mode), so state can never carry over from one to the other.
//   userId, joinedAt: the Supabase user     fullName: from their profile
//   demo, setDemo:    Demo mode             notice, clearNotice: a message to show once
export default function GameProvider({ userId, joinedAt, fullName, demo = false, setDemo, notice, clearNotice, children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Progress comes from the open world: Supabase (real) or this browser (Demo mode).
  // Settings (sound, vibration) are device preferences.
  const load = useCallback(async () => {
    dispatch({ type: 'load/start' })
    try {
      const opened = await api.openWorld({
        userId,
        joinedAt,
        demo,
        onSyncError: (error) =>
          dispatch({ type: 'toast/show', toast: { kind: 'info', message: `Couldn’t save to your account yet. ${error.message} Retrying…` } }),
      })
      if (!opened) return // a newer load took over
      const data = await api.getDashboard()
      dispatch({ type: 'load/success', data: { ...data, settings: { ...DEFAULT_SETTINGS, ...loadSettings() } } })
    } catch (error) {
      dispatch({ type: 'load/error', error: error.message })
    }
  }, [userId, joinedAt, demo])

  useEffect(() => {
    load()
    return () => api.closeWorld()
  }, [load])

  // A message from sign-in (e.g. "Email confirmed"), shown once as a toast.
  const shownNotice = useRef(null)
  useEffect(() => {
    if (!notice || shownNotice.current === notice) return
    shownNotice.current = notice
    dispatch({ type: 'toast/show', toast: { kind: 'info', message: notice.text } })
    clearNotice?.()
  }, [notice, clearNotice])

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
      user: { ...d.user, ...splitName(fullName || 'Student'), streak: streakNow(d.user.streak, now) },
      decks: enrichDecks(d.decks, d.cards, now),
      activity: lastDays(d.activity, 7, now),
      upcoming: upcoming(d.cards, 6, now),
    }
  }, [state.data, now, fullName])

  const actions = useMemo(
    () => ({
      reload: load,
      // Store a graded answer from api.submitAnswer (XP, streak and card come from the server).
      applyAnswer: (response) => dispatch({ type: 'answer/applied', response }),
      addDeck: (deck, cards) => dispatch({ type: 'deck/created', deck, cards }),
      updateSettings: (patch) => dispatch({ type: 'settings/update', patch }),
      reportCard: async (cardId) => {
        await api.reportQuestion(cardId)
        dispatch({ type: 'card/reported', cardId })
      },
      showToast: (toast) => dispatch({ type: 'toast/show', toast }),
      dismissToast: (id) => dispatch({ type: 'toast/dismiss', id }),
      dismissLevelUp: () => dispatch({ type: 'levelUp/dismiss' }),
      holdCelebrations: (hold) => dispatch({ type: 'celebrations/hold', hold }),
      clearLanded: () => dispatch({ type: 'deck/landed' }),
      // Demo mode only: start the demo world again from the sample data.
      resetDemo: async () => {
        api.resetDemo(userId)
        window.location.hash = '#/'
        await load()
      },
    }),
    [load, userId],
  )

  const value = useMemo(
    () => ({ ...state, data: view, rawData: state.data, demo, setDemo, ...actions }),
    [state, view, demo, setDemo, actions],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
