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

const SCREENS = {
  home: Dashboard,
  new: CreateDeck,
  deck: DeckPage,
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
        <AppShell active={route.name === 'deck' ? 'home' : route.name}>
          {/* key = path: each screen mounts fresh, so its entrance plays every visit */}
          <Screen key={path} {...route.params} />
        </AppShell>
        <Toaster />
        <LevelUpDialog />
      </GameProvider>
    </MotionConfig>
  )
}
