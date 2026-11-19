import { useEffect } from 'react'
import { MotionConfig } from 'motion/react'
import { matchRoute, useHashRoute } from './lib/router.js'
import { startSmoothScroll } from './lib/smoothScroll.js'
import { useFollowSystemTheme } from './theme.js'
import GameProvider from './state/GameProvider.jsx'
import Ambient from './components/Ambient.jsx'
import AppShell from './components/shell/AppShell.jsx'
import Toaster from './components/Toaster.jsx'
import LevelUpDialog from './components/LevelUpDialog.jsx'
import Dashboard from './screens/Dashboard.jsx'
import CreateDeck from './screens/CreateDeck.jsx'
import DeckPage from './screens/DeckPage.jsx'
import Quiz from './screens/Quiz.jsx'
import Stats from './screens/Stats.jsx'
import Profile from './screens/Profile.jsx'
import Settings from './screens/Settings.jsx'

const SCREENS = {
  home: Dashboard,
  new: CreateDeck,
  deck: DeckPage,
  review: Quiz,
  stats: Stats,
  profile: Profile,
  settings: Settings,
}

export default function App() {
  const path = useHashRoute()
  const route = matchRoute(path)
  const Screen = SCREENS[route.name]

  useFollowSystemTheme()
  useEffect(() => startSmoothScroll(), [])

  return (
    // reducedMotion="user": with the OS "reduce motion" setting, Motion drops movement and keeps fades.
    <MotionConfig reducedMotion="user">
      <GameProvider>
        <Ambient />
        <AppShell active={route.name === 'deck' ? 'home' : route.name} focus={route.name === 'review'}>
          {/* key = path: each screen mounts fresh, so its entrance plays every visit */}
          <Screen key={path} {...route.params} />
        </AppShell>
        <Toaster />
        <LevelUpDialog />
      </GameProvider>
    </MotionConfig>
  )
}
