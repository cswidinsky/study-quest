import { useId } from 'react'
import { motion } from 'motion/react'
import { toggleTheme, useTheme } from '../theme.js'

// One button. The sun swallows its rays and a shadow slides across it to become
// a moon (and back). The new theme then grows out of the button as a circle.

const SPRING = { type: 'spring', duration: 0.6, bounce: 0.3 }
const RAYS = Array.from({ length: 8 }, (_, i) => i * 45)

export default function ThemeToggle({ className = '' }) {
  const theme = useTheme()
  const dark = theme === 'dark'
  const maskId = useId()

  function onClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
      className={`grid size-10 place-items-center rounded-full text-text transition-[background-color,scale] duration-150 ease-out hover:bg-border/70 active:scale-[0.92] ${className}`}
    >
      <motion.svg
        viewBox="0 0 24 24"
        className="size-5"
        aria-hidden="true"
        initial={false}
        animate={{ rotate: dark ? 40 : 90 }}
        transition={SPRING}
      >
        <mask id={maskId}>
          <rect width="24" height="24" fill="white" />
          {/* The "shadow" that turns the sun into a crescent */}
          <motion.circle
            r="7"
            fill="black"
            initial={false}
            animate={dark ? { cx: 16.5, cy: 7.5 } : { cx: 30, cy: -6 }}
            transition={SPRING}
          />
        </mask>
        <motion.circle
          cx="12"
          cy="12"
          fill="currentColor"
          mask={`url(#${maskId})`}
          initial={false}
          animate={{ r: dark ? 8.5 : 4.5 }}
          transition={SPRING}
        />
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          {RAYS.map((angle, i) => (
            // Plain SVG rotation around the centre; Motion only fades and shrinks each ray.
            <g key={angle} transform={`rotate(${angle} 12 12)`}>
              <motion.line
                x1="12"
                y1="1.8"
                x2="12"
                y2="4"
                initial={false}
                animate={{ opacity: dark ? 0 : 1, scale: dark ? 0.3 : 1 }}
                transition={{ ...SPRING, delay: dark ? 0 : 0.08 + i * 0.025 }}
              />
            </g>
          ))}
        </g>
      </motion.svg>
    </button>
  )
}
