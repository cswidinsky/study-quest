import { motion, useReducedMotion } from 'motion/react'
import { EASE_CINEMA } from '../lib/motion.js'

// A thin progress bar that grows to its value when it appears (transform only).
export default function FillBar({ value, colour, delay = 0.5, glow = false, label, height = 'h-1.5' }) {
  const reduce = useReducedMotion()
  const target = `translateX(${(Math.min(1, value) - 1) * 100}%)`
  return (
    <div
      className={`${height} overflow-hidden rounded-full bg-border`}
      role={label ? 'progressbar' : undefined}
      aria-label={label}
      aria-valuenow={label ? Math.round(value * 100) : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      style={glow ? { filter: `drop-shadow(0 0 5px ${colour})` } : undefined}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: colour }}
        initial={{ transform: reduce ? target : 'translateX(-100%)' }}
        animate={{ transform: target }}
        transition={{ duration: 1.2, delay, ease: EASE_CINEMA }}
      />
    </div>
  )
}
