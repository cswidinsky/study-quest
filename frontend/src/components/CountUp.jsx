import { useEffect, useRef } from 'react'
import { animate, useReducedMotion } from 'motion/react'
import { EASE_CINEMA } from '../lib/motion.js'
import { formatNumber } from '../lib/format.js'

// A number that counts up to its value (and counts again when the value changes).
// Writes straight into the DOM each frame, so React doesn't re-render 60 times a second.
export default function CountUp({ value, format = formatNumber, duration = 1.2, delay = 0, className = 'num' }) {
  const ref = useRef(null)
  const shown = useRef(0)
  const reduce = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (reduce) {
      node.textContent = format(value)
      shown.current = value
      return
    }
    const controls = animate(shown.current, value, {
      duration,
      delay,
      ease: EASE_CINEMA,
      onUpdate: (v) => {
        shown.current = v
        node.textContent = format(Math.round(v))
      },
    })
    return () => controls.stop()
  }, [value, duration, delay, format, reduce])

  return (
    <span ref={ref} className={className}>
      {format(reduce ? value : 0)}
    </span>
  )
}
