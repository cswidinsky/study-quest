import { useId } from 'react'
import { motion } from 'motion/react'
import { useTheme } from '../theme.js'

const OPTIONS = [
  { value: 'system', label: 'Use system theme', Icon: MonitorIcon },
  { value: 'light', label: 'Light theme', Icon: SunIcon },
  { value: 'dark', label: 'Dark theme', Icon: MoonIcon },
]

export default function ThemeToggle() {
  const [theme, setTheme] = useTheme()
  const pillId = useId() // unique per toggle, so two toggles on screen don't share a pill

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex rounded-full border border-border bg-surface p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={active}
            title={label}
            onClick={() => setTheme(value)}
            className="relative grid size-8 place-items-center rounded-full text-muted transition-[color,scale] duration-150 ease-out hover:text-text active:scale-[0.94] aria-pressed:text-text focus-visible:outline-2 focus-visible:outline-accent"
          >
            {/* One pill that slides between options (shared layoutId) */}
            {active && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-full bg-background"
                transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
              />
            )}
            <Icon />
          </button>
        )
      })}
    </div>
  )
}

const iconProps = {
  className: 'relative size-4',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

function MonitorIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  )
}
