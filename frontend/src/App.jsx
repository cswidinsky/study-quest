import { useCallback, useEffect, useState } from 'react'
import { MotionConfig, motion } from 'motion/react'
import { matchRoute, useHashRoute } from './lib/router.js'
import { startSmoothScroll } from './lib/smoothScroll.js'
import { loadDemoMode, saveDemoMode } from './lib/storage.js'
import { useFollowSystemTheme } from './theme.js'
import AuthProvider from './state/AuthProvider.jsx'
import { useAuth } from './state/auth.js'
import GameProvider from './state/GameProvider.jsx'
import Ambient from './components/Ambient.jsx'
import AppShell from './components/shell/AppShell.jsx'
import Toaster from './components/Toaster.jsx'
import LevelUpDialog from './components/LevelUpDialog.jsx'
import AuthScreen from './screens/auth/AuthScreen.jsx'
import Dashboard from './screens/Dashboard.jsx'
import CreateDeck from './screens/CreateDeck.jsx'
import DeckPage from './screens/DeckPage.jsx'
import Quiz from './screens/Quiz.jsx'
import Stats from './screens/Stats.jsx'
import Profile from './screens/Profile.jsx'
import Settings from './screens/Settings.jsx'
import SavedResult from './screens/SavedResult.jsx'

const SCREENS = {
  home: Dashboard,
  new: CreateDeck,
  deck: DeckPage,
  review: Quiz,
  stats: Stats,
  profile: Profile,
  settings: Settings,
  result: SavedResult,
}

export default function App() {
  useFollowSystemTheme()
  useEffect(() => startSmoothScroll(), [])

  return (
    // reducedMotion="user": with the OS "reduce motion" setting, Motion drops movement and keeps fades.
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <Ambient />
        <Gate />
      </AuthProvider>
    </MotionConfig>
  )
}

// The app is locked until someone signs in.
function Gate() {
  const auth = useAuth()
  if (auth.status === 'loading') return <Splash />
  if (auth.status === 'signedIn') return <SignedIn key={auth.user.id} />
  return <AuthScreen />
}

// ?demo=1 in the address turns Demo mode on (handy for presenting).
const demoFromUrl = () => {
  try {
    return new URLSearchParams(window.location.search).has('demo')
  } catch {
    return false
  }
}

// One signed-in user. Switching Demo mode mounts a brand-new game (key), so the real world and
// the demo world never share state; the real data is reloaded from Supabase exactly as it was.
function SignedIn() {
  const auth = useAuth()
  const userId = auth.user.id
  const [demo, setDemoState] = useState(() => {
    if (demoFromUrl()) saveDemoMode(userId, true)
    return loadDemoMode(userId)
  })
  const setDemo = useCallback(
    (on) => {
      saveDemoMode(userId, on)
      setDemoState(on)
    },
    [userId],
  )

  return (
    <GameProvider
      key={demo ? 'demo' : 'real'}
      userId={userId}
      joinedAt={auth.user.created_at}
      fullName={auth.fullName}
      demo={demo}
      setDemo={setDemo}
      notice={auth.notice}
      clearNotice={auth.clearNotice}
    >
      <Screens />
      <Toaster />
      <LevelUpDialog />
    </GameProvider>
  )
}

function Screens() {
  const path = useHashRoute()
  const route = matchRoute(path)
  const Screen = SCREENS[route.name]
  return (
    <AppShell active={route.name === 'deck' || route.name === 'result' ? 'home' : route.name} focus={route.name === 'review'}>
      {/* key = path: each screen mounts fresh, so its entrance plays every visit */}
      <Screen key={path} {...route.params} />
    </AppShell>
  )
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-label="Loading StudyQuest">
      <motion.img
        src="/brand/studyquest-icon.svg"
        alt=""
        className="size-16"
        initial={{ opacity: 0, transform: 'scale(0.9)' }}
        animate={{ opacity: 1, transform: 'scale(1)' }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.3, delay: 0.15 }}
      />
    </div>
  )
}
