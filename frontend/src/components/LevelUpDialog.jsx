import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useGame } from '../state/game.js'
import { levelProgress, levelStartXp } from '../lib/levels.js'
import { formatNumber } from '../lib/format.js'
import { EASE_CINEMA } from '../lib/motion.js'
import { lockScroll } from '../lib/smoothScroll.js'
import { play } from '../lib/sound.js'
import { buzz } from '../lib/haptics.js'
import Button from './Button.jsx'

// The level-up, choreographed like a short film (about 1.6 seconds):
//   0.0s  the app pulls back and dims (index.css: html[data-celebrate] .stage); light rays bloom
//   0.15s a ring draws around your old level
//   0.85s impact: the number rolls over, a flash, two shockwaves, a burst of sparks
//   0.95s the words rise in, one line after another
// The button works from the first frame: Escape, a click outside, or "Keep going" ends it at once.

const IMPACT = 0.85
const SHOW_AFTER_MS = 900 // let the XP toast land first

export default function LevelUpDialog() {
  const { levelUp, dismissLevelUp, data, celebrationsHeld } = useGame()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!levelUp || celebrationsHeld) return
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS)
    return () => clearTimeout(timer)
  }, [levelUp, celebrationsHeld])

  // Camera pull-back on the whole app while the moment plays.
  useEffect(() => {
    const root = document.documentElement
    if (visible) {
      root.dataset.celebrate = ''
      lockScroll(true)
    }
    return () => {
      delete root.dataset.celebrate
      lockScroll(false)
    }
  }, [visible])

  const close = useCallback(() => setVisible(false), [])

  return (
    <AnimatePresence onExitComplete={dismissLevelUp}>
      {visible && levelUp && <Celebration key={levelUp.to} levelUp={levelUp} totalXp={data.user.xp.total} onClose={close} />}
    </AnimatePresence>
  )
}

function Celebration({ levelUp, totalXp, onClose }) {
  const reduce = useReducedMotion()
  const buttonRef = useRef(null)
  const ringRef = useRef(null)
  const [shown, setShown] = useState(reduce ? levelUp.to : levelUp.from)
  const [impact, setImpact] = useState(false)
  const progress = levelProgress(totalXp)

  useEffect(() => {
    buttonRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const timer = reduce
      ? null
      : setTimeout(() => {
          setShown(levelUp.to)
          play('levelup')
          buzz('levelup')
          setImpact(true)
        }, IMPACT * 1000)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(timer)
    }
  }, [levelUp.to, onClose, reduce])

  const line = (i) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(18px)' },
    animate: { opacity: 1, transform: 'translateY(0px)' },
    transition: { duration: 0.8, delay: reduce ? 0 : IMPACT + 0.1 + i * 0.09, ease: EASE_CINEMA },
  })

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center overflow-hidden p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      transition={{ duration: 0.35 }}
    >
      {/* Darkness, the same in both themes: this is the cinema moment */}
      <div className="absolute inset-0 bg-[rgb(5_6_10/0.82)]" onClick={onClose} aria-hidden="true" />

      {/* Flash on impact */}
      {impact && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgb(255_220_180/0.55),transparent_45%)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.7, times: [0, 0.15, 1] }}
        />
      )}
      {impact && <SparkBurst originRef={ringRef} />}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-up-title"
        aria-describedby="level-up-text"
        className="relative flex w-full max-w-md flex-col items-center text-center text-[#f5f2ec]"
      >
        <motion.div
          ref={ringRef}
          className="relative size-44"
          initial={reduce ? false : { transform: 'scale(0.7)', opacity: 0 }}
          animate={{ transform: 'scale(1)', opacity: 1 }}
          transition={{ type: 'spring', duration: 0.9, bounce: 0.3 }}
        >
          {/* Light rays blooming behind the badge, fading out with distance */}
          {!reduce && (
            <div aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2">
              <motion.div
                className="size-full"
                initial={{ opacity: 0, transform: 'scale(0.4)' }}
                animate={{ opacity: 1, transform: 'scale(1)' }}
                transition={{ duration: 1.6, ease: EASE_CINEMA }}
              >
                <div className="rays size-full rounded-full" />
              </motion.div>
            </div>
          )}
          {/* Breathing glow */}
          <motion.span
            aria-hidden="true"
            className="absolute -inset-8 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-accent)_60%,transparent),transparent)]"
            initial={{ opacity: 0.3 }}
            animate={reduce ? { opacity: 0.6 } : { opacity: [0.35, 0.9, 0.5, 0.8] }}
            transition={{ duration: 3, repeat: reduce ? 0 : Infinity, repeatType: 'mirror' }}
          />
          {/* Shockwaves */}
          {impact &&
            [0, 0.12].map((delay, i) => (
              <motion.span
                key={i}
                aria-hidden="true"
                className={`absolute inset-0 rounded-full border-2 ${i ? 'border-secondary' : 'border-accent'}`}
                initial={{ opacity: 0.9, transform: 'scale(0.9)' }}
                animate={{ opacity: 0, transform: 'scale(2.8)' }}
                transition={{ duration: 1.1, delay, ease: EASE_CINEMA }}
              />
            ))}
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90 [filter:drop-shadow(0_0_10px_var(--color-accent))]" aria-hidden="true">
            <circle cx="60" cy="60" r="52" className="fill-none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="5" />
            <motion.circle
              cx="60"
              cy="60"
              r="52"
              className="fill-none stroke-accent"
              strokeWidth="5"
              strokeLinecap="round"
              initial={{ pathLength: reduce ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.65, 0, 0.35, 1] }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center overflow-hidden rounded-full">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={shown}
                className="num text-6xl leading-none font-medium"
                initial={{ opacity: 0, transform: 'translateY(70%) scale(0.8)', filter: 'blur(6px)' }}
                animate={{ opacity: 1, transform: 'translateY(0%) scale(1)', filter: 'blur(0px)' }}
                exit={{ opacity: 0, transform: 'translateY(-70%) scale(0.8)', filter: 'blur(6px)' }}
                transition={{ type: 'spring', duration: 0.6, bounce: 0.35 }}
              >
                {shown}
              </motion.span>
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.p {...line(0)} className="mt-8 text-sm font-medium text-accent">
          Level up
        </motion.p>
        <motion.h2 {...line(1)} id="level-up-title" className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          You reached level <span className="num">{levelUp.to}</span>
        </motion.h2>
        <motion.p {...line(2)} id="level-up-text" className="mt-3 max-w-xs text-sm text-[#c9c6d2]">
          <span className="num text-[#f5f2ec]">{formatNumber(totalXp)}</span> XP earned so far. Level{' '}
          <span className="num">{levelUp.to + 1}</span> starts at <span className="num">{formatNumber(levelStartXp(levelUp.to + 1))}</span>, just{' '}
          <span className="num">{formatNumber(progress.toNext)}</span> XP away.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: reduce ? 0 : 0.3 }}
          className="mt-8 w-full max-w-xs"
        >
          <Button ref={buttonRef} size="lg" className="w-full" onClick={onClose}>
            Keep going
          </Button>
        </motion.div>
      </div>
    </motion.div>
  )
}

// A one-shot burst of sparks from the ring's centre. Canvas, capped at 60fps,
// stops itself when the last spark fades (about 1.8s).
const SPARK_COLOURS = ['#ff6b2c', '#ffc23d', '#ffd27a', '#14c2d0', '#ffffff']

function SparkBurst({ originRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const rect = originRef.current?.getBoundingClientRect()
    const cx = rect ? rect.left + rect.width / 2 : w / 2
    const cy = rect ? rect.top + rect.height / 2 : h / 2
    const sparks = Array.from({ length: 130 }, () => {
      const angle = Math.random() * Math.PI * 2
      const speed = 3 + Math.random() * 9
      return {
        x: cx + Math.cos(angle) * 60,
        y: cy + Math.sin(angle) * 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 0,
        max: 60 + Math.random() * 50,
        size: 2 + Math.random() * 3,
        spin: Math.random() * Math.PI,
        streak: Math.random() < 0.45,
        colour: SPARK_COLOURS[Math.floor(Math.random() * SPARK_COLOURS.length)],
      }
    })

    let frame = 0
    let last = 0
    const tick = (time) => {
      if (time - last < 1000 / 60 - 1) {
        frame = requestAnimationFrame(tick)
        return
      }
      last = time
      ctx.clearRect(0, 0, w, h)
      let alive = 0
      for (const s of sparks) {
        if (s.life > s.max) continue
        alive++
        s.life++
        s.vx *= 0.975
        s.vy = s.vy * 0.975 + 0.16
        s.x += s.vx
        s.y += s.vy
        s.spin += 0.2
        ctx.globalAlpha = Math.max(0, 1 - s.life / s.max)
        ctx.fillStyle = s.colour
        ctx.save()
        ctx.translate(s.x, s.y)
        if (s.streak) {
          ctx.rotate(Math.atan2(s.vy, s.vx))
          ctx.fillRect(-s.size * 2.5, -0.75, s.size * 5, 1.5)
        } else {
          ctx.rotate(s.spin)
          ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size * 0.6)
        }
        ctx.restore()
      }
      if (alive) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [originRef])

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 size-full" />
}
