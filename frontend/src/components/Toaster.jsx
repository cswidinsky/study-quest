import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useGame } from '../state/game.js'
import { levelProgress } from '../lib/levels.js'
import { formatNumber } from '../lib/format.js'
import { BoltIcon } from './icons.jsx'
import StreakFlame from './StreakFlame.jsx'
import XpBar from './XpBar.jsx'

// Toasts rise from the bottom and leave the same way.
// Bottom-centre on a phone (thumb reach), bottom-right on desktop.

const SHOW_FOR_MS = 4500

export default function Toaster() {
  const { toasts, dismissToast } = useGame()

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-60 flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:items-end lg:px-0"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDone={() => dismissToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function Toast({ toast, onDone }) {
  const reduceMotion = useReducedMotion()
  const done = useRef(onDone)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    done.current = onDone
  }, [onDone])

  // Pause the timer while the pointer is on the toast.
  useEffect(() => {
    if (hovered) return
    const timer = setTimeout(() => done.current(), SHOW_FOR_MS)
    return () => clearTimeout(timer)
  }, [hovered])

  return (
    <motion.div
      layout
      role="status"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
      className="pointer-events-auto w-full max-w-[22rem] rounded-2xl border border-border bg-surface p-3.5 pr-4 shadow-[0_8px_24px_rgb(0_0_0/0.08)]"
    >
      {toast.kind === 'xp' && <XpToast toast={toast} />}
      {toast.kind === 'streak' && <StreakToast toast={toast} />}
      {toast.kind === 'info' && <p className="text-sm">{toast.message}</p>}
    </motion.div>
  )
}

function XpToast({ toast }) {
  const before = levelProgress(toast.fromXp)
  const after = levelProgress(toast.toXp)
  // Show the bar of the level you were in; it fills to the end if you levelled up.
  const target = after.level > before.level ? before.span : after.inLevel
  const [value, setValue] = useState(before.inLevel)
  const levelStart = before.nextLevelXp - before.span
  const reached = Math.min(toast.toXp, before.nextLevelXp) - levelStart

  useEffect(() => {
    const timer = setTimeout(() => setValue(target), 180)
    return () => clearTimeout(timer)
  }, [target])

  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
        <BoltIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-3">
          <span className="num text-[15px] font-semibold">+{toast.amount} XP</span>
          <span className="num text-xs text-muted">
            {formatNumber(reached)}/{formatNumber(before.span)}
          </span>
        </p>
        <p className="mt-0.5 truncate text-sm text-muted">{toast.reason}</p>
        <div className="mt-2.5">
          <XpBar value={value} max={before.span} level={before.level} height="h-1.5" />
        </div>
      </div>
    </div>
  )
}

function StreakToast({ toast }) {
  const [lit, setLit] = useState(false)

  // Mount unlit, then light it: that's the moment the flame pops.
  useEffect(() => {
    const timer = setTimeout(() => setLit(true), 120)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center">
        <StreakFlame lit={lit} className="size-7" />
      </span>
      <div>
        <p className="text-[15px] font-semibold">
          <span className="num">{toast.days}</span>-day streak
        </p>
        <p className="text-sm text-muted">Today’s flame is lit. See you tomorrow.</p>
      </div>
    </div>
  )
}
