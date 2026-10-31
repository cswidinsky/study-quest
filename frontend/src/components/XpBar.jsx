import { useEffect, useRef } from 'react'
import { useAnimate, useReducedMotion } from 'motion/react'

const EASE_OUT = [0.23, 1, 0.32, 1]

// translateX keeps the fill's rounded end intact (scaleX would squash it)
// and runs on the GPU, so it stays smooth.
const position = (progress) => `translateX(${(Math.min(1, progress) - 1) * 100}%)`

// Draws at its value straight away. It only animates when the value changes
// (earning XP), and plays fill → reset → grow when the level goes up.
export default function XpBar({ value, max, level, height = 'h-2', label }) {
  const [scope, animate] = useAnimate()
  const reduceMotion = useReducedMotion()
  const last = useRef({ value, level })

  useEffect(() => {
    const fill = scope.current
    const progress = value / max
    const levelledUp = level > last.current.level
    const changed = value !== last.current.value || levelledUp
    last.current = { value, level }
    if (!changed) return

    if (reduceMotion) {
      animate(fill, { transform: position(progress) }, { duration: 0 })
    } else if (levelledUp) {
      animate([
        [fill, { transform: position(1) }, { duration: 0.25, ease: EASE_OUT }],
        [fill, { transform: position(0) }, { duration: 0 }],
        [fill, { transform: position(progress) }, { duration: 0.4, ease: EASE_OUT }],
      ])
    } else {
      animate(fill, { transform: position(progress) }, { duration: 0.6, ease: EASE_OUT })
    }
  }, [value, max, level, reduceMotion, animate, scope])

  return (
    <div
      role="progressbar"
      aria-label={label ?? `XP towards level ${level + 1}`}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`${height} overflow-hidden rounded-full bg-border`}
    >
      <div
        ref={scope}
        className="h-full rounded-full bg-accent"
        style={{ transform: position(value / max) }}
      />
    </div>
  )
}
