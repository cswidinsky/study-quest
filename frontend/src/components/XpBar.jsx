import { useEffect, useRef, useState } from 'react'
import { motion, useAnimate, useReducedMotion } from 'motion/react'
import { EASE_CINEMA, EASE_OUT } from '../lib/motion.js'

// translateX keeps the fill's rounded end intact (scaleX would squash it)
// and runs on the GPU, so it stays smooth.
const position = (progress) => `translateX(${(Math.min(1, progress) - 1) * 100}%)`

// Fills in when it first appears, glides when XP changes, and plays
// fill → reset → grow when you level up. A flash of light runs along it on every gain.
export default function XpBar({ value, max, level, height = 'h-2', label, delay = 0.2, glow = true }) {
  const [scope, animate] = useAnimate()
  const reduce = useReducedMotion()
  const last = useRef(null)
  const [flash, setFlash] = useState(0)

  useEffect(() => {
    const fill = scope.current
    const progress = value / max
    const first = last.current === null
    const levelledUp = !first && level > last.current.level
    const gained = !first && (value > last.current.value || levelledUp)
    last.current = { value, level }

    if (reduce) {
      animate(fill, { transform: position(progress) }, { duration: 0 })
      return
    }
    if (first) {
      animate(fill, { transform: position(progress) }, { duration: 1.1, delay, ease: EASE_CINEMA })
      return
    }
    if (gained) setFlash((n) => n + 1)
    if (levelledUp) {
      animate([
        [fill, { transform: position(1) }, { duration: 0.35, ease: EASE_OUT }],
        [fill, { transform: position(0) }, { duration: 0 }],
        [fill, { transform: position(progress) }, { duration: 0.6, ease: EASE_CINEMA }],
      ])
    } else {
      animate(fill, { transform: position(progress) }, { duration: 0.8, ease: EASE_CINEMA })
    }
  }, [value, max, level, reduce, animate, scope, delay])

  return (
    <div className={glow ? '[filter:drop-shadow(0_0_6px_color-mix(in_oklab,var(--color-accent)_55%,transparent))]' : ''}>
      <div
        role="progressbar"
        aria-label={label ?? `XP towards level ${level + 1}`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={`${height} relative overflow-hidden rounded-full bg-border`}
      >
        <div
          ref={scope}
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent),#ff9a3c)]"
          style={{ transform: position(reduce ? value / max : 0) }}
        />
        {flash > 0 && !reduce && (
          <motion.span
            key={flash}
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.8),transparent)]"
            initial={{ transform: 'translateX(-100%)' }}
            animate={{ transform: 'translateX(320%)' }}
            transition={{ duration: 0.9, ease: EASE_OUT }}
          />
        )}
      </div>
    </div>
  )
}
