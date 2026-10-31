import { useEffect, useRef } from 'react'
import { useAnimate, useReducedMotion } from 'motion/react'

const EASE_OUT = [0.23, 1, 0.32, 1]

// translateX keeps the fill's rounded end intact (scaleX would squash it)
// and runs on the GPU, so it stays smooth.
const position = (progress) => `translateX(${(progress - 1) * 100}%)`

export default function XpBar({ value, max, level }) {
  const [scope, animate] = useAnimate()
  const reduceMotion = useReducedMotion()
  const lastLevel = useRef(level)
  const isFirstRun = useRef(true)

  useEffect(() => {
    const fill = scope.current
    const progress = value / max
    const levelledUp = level > lastLevel.current
    lastLevel.current = level

    if (reduceMotion) {
      animate(fill, { transform: position(progress) }, { duration: 0 })
      return
    }

    if (levelledUp) {
      // Fill to the end, snap back to empty, then grow to the new amount.
      animate([
        [fill, { transform: position(1) }, { duration: 0.2, ease: EASE_OUT }],
        [fill, { transform: position(0) }, { duration: 0 }],
        [fill, { transform: position(progress) }, { duration: 0.35, ease: EASE_OUT }],
      ])
      return
    }

    // On page load it grows in once, after the card has appeared.
    const delay = isFirstRun.current ? 0.25 : 0
    isFirstRun.current = false
    animate(fill, { transform: position(progress) }, { duration: 0.5, delay, ease: EASE_OUT })
  }, [value, max, level, reduceMotion, animate, scope])

  return (
    <div
      role="progressbar"
      aria-label={`Progress to level ${level + 1}`}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-2 overflow-hidden rounded-full bg-border"
    >
      <div
        ref={scope}
        className="h-full rounded-full bg-accent"
        style={{ transform: position(0) }}
      />
    </div>
  )
}
