import { AnimatePresence, motion } from 'motion/react'
import { useGame } from '../../state/game.js'

// "Demo mode" while the sample world is open. Links to Settings, where it's switched off.
// display: its CSS display classes, kept separate so "hidden" can never clash with "inline-flex".
export default function DemoBadge({ short = false, className = '', display = 'inline-flex' }) {
  const { demo } = useGame()
  return (
    <AnimatePresence>
      {demo && (
        <motion.a
          href="#/settings"
          title="You’re in Demo mode. Your real data is safe; switch back in Settings."
          className={`${display} shrink-0 items-center gap-1.5 rounded-full border border-secondary/50 bg-secondary-soft px-2.5 py-1 text-xs font-medium text-text transition-[scale] duration-150 ease-out active:scale-[0.96] ${className}`}
          initial={{ opacity: 0, transform: 'scale(0.9)' }}
          animate={{ opacity: 1, transform: 'scale(1)' }}
          exit={{ opacity: 0, transform: 'scale(0.9)' }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
        >
          <span className="size-1.5 rounded-full bg-secondary" aria-hidden="true" />
          {short ? 'Demo' : 'Demo mode'}
        </motion.a>
      )}
    </AnimatePresence>
  )
}
