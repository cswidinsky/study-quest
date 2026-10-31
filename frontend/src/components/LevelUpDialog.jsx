import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useGame } from '../state/game.js'
import { levelProgress, levelStartXp } from '../lib/levels.js'
import { formatNumber } from '../lib/format.js'
import Button from './Button.jsx'

// The level-up moment. A ring draws around your old level, the number rolls
// over to the new one, and a short burst of sparks fires once. No confetti rain,
// no sound, one button. Waits a beat so the XP toast lands first.

const EASE_OUT = [0.23, 1, 0.32, 1]
const SHOW_AFTER_MS = 900
const SPARKS = 12

export default function LevelUpDialog() {
  const { levelUp, dismissLevelUp, data } = useGame()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!levelUp) return
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS)
    return () => clearTimeout(timer)
  }, [levelUp])

  // Stable function, so the celebration's timers don't restart on every re-render.
  const close = useCallback(() => setVisible(false), [])

  return (
    <AnimatePresence onExitComplete={dismissLevelUp}>
      {visible && levelUp && (
        <Celebration key={levelUp.to} levelUp={levelUp} totalXp={data.user.xp.total} onClose={close} />
      )}
    </AnimatePresence>
  )
}

function Celebration({ levelUp, totalXp, onClose }) {
  const reduceMotion = useReducedMotion()
  const buttonRef = useRef(null)
  const [shown, setShown] = useState(reduceMotion ? levelUp.to : levelUp.from)
  const [burst, setBurst] = useState(false)
  const progress = levelProgress(totalXp)

  useEffect(() => {
    buttonRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    if (reduceMotion) return () => window.removeEventListener('keydown', onKey)

    // Ring finishes at ~0.75s: roll the number and fire the sparks then.
    const roll = setTimeout(() => setShown(levelUp.to), 700)
    const spark = setTimeout(() => setBurst(true), 760)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(roll)
      clearTimeout(spark)
    }
  }, [levelUp.to, onClose, reduceMotion])

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0 bg-background/85" onClick={onClose} aria-hidden="true" />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-up-title"
        aria-describedby="level-up-text"
        className="relative w-full max-w-sm rounded-3xl border border-border bg-surface px-6 pt-10 pb-6 text-center shadow-[0_24px_64px_rgb(0_0_0/0.14)]"
        initial={reduceMotion ? false : { opacity: 0, transform: 'scale(0.96) translateY(8px)' }}
        animate={{ opacity: 1, transform: 'scale(1) translateY(0px)' }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.98)', transition: { duration: 0.15 } }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
      >
        <div className="relative mx-auto size-32">
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r="52" className="fill-none stroke-border" strokeWidth="6" />
            <motion.circle
              cx="60"
              cy="60"
              r="52"
              className="fill-none stroke-accent"
              strokeWidth="6"
              strokeLinecap="round"
              initial={{ pathLength: reduceMotion ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.15, ease: EASE_OUT }}
            />
          </svg>

          {burst && <Sparks />}

          <div className="absolute inset-0 grid place-items-center overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={shown}
                className="num text-5xl leading-none font-medium"
                initial={{ opacity: 0, transform: 'translateY(60%)', filter: 'blur(4px)' }}
                animate={{ opacity: 1, transform: 'translateY(0%)', filter: 'blur(0px)' }}
                exit={{ opacity: 0, transform: 'translateY(-60%)', filter: 'blur(4px)' }}
                transition={{ type: 'spring', duration: 0.45, bounce: 0.25 }}
              >
                {shown}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        <h2 id="level-up-title" className="mt-6 text-xl font-semibold tracking-tight">
          You reached level <span className="num">{levelUp.to}</span>
        </h2>
        <p id="level-up-text" className="mx-auto mt-2 max-w-[17rem] text-sm text-muted">
          <span className="num">{formatNumber(totalXp)}</span> XP earned so far. Level{' '}
          <span className="num">{levelUp.to + 1}</span> starts at{' '}
          <span className="num">{formatNumber(levelStartXp(levelUp.to + 1))}</span>, just{' '}
          <span className="num">{formatNumber(progress.toNext)}</span> XP away.
        </p>

        <Button ref={buttonRef} size="lg" className="mt-6 w-full" onClick={onClose}>
          Keep going
        </Button>
      </motion.div>
    </motion.div>
  )
}

// Short lines fly out from the ring once and fade. Pure decoration.
function Sparks() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {Array.from({ length: SPARKS }, (_, i) => {
        const angle = (360 / SPARKS) * i
        const long = i % 2 === 0
        return (
          <div
            key={i}
            className="absolute top-1/2 left-1/2"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <motion.span
              className={`absolute block w-0.5 rounded-full ${long ? 'h-3 bg-accent' : 'h-2 bg-muted/60'}`}
              style={{ left: -1, top: -6 }}
              initial={{ opacity: 1, transform: 'translateY(-62px) scaleY(0.4)' }}
              animate={{ opacity: 0, transform: `translateY(${long ? -86 : -78}px) scaleY(1)` }}
              transition={{ duration: 0.55, ease: EASE_OUT }}
            />
          </div>
        )
      })}
    </div>
  )
}
