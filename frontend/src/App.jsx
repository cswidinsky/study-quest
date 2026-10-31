import { MotionConfig } from 'motion/react'
import { useHashRoute } from './lib/router.js'
import GameProvider from './state/GameProvider.jsx'
import AppShell from './components/shell/AppShell.jsx'
import Toaster from './components/Toaster.jsx'
import LevelUpDialog from './components/LevelUpDialog.jsx'
import Dashboard from './screens/Dashboard.jsx'
import CreateDeck from './screens/CreateDeck.jsx'

const SCREENS = {
  '/': Dashboard,
  '/new': CreateDeck,
}

export default function App() {
  const path = useHashRoute()
  const Screen = SCREENS[path] ?? Dashboard

  return (
    // reducedMotion="user": if the OS asks for less motion, Motion skips movement.
    <MotionConfig reducedMotion="user">
      <GameProvider>
        <AppShell path={SCREENS[path] ? path : '/'}>
          <Screen />
        </AppShell>
        <Toaster />
        <LevelUpDialog />
      </GameProvider>
    </MotionConfig>
  )
}
