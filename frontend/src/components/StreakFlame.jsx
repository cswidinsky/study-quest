import { useEffect, useRef } from 'react'
import { useAnimate, useReducedMotion } from 'motion/react'

// The streak flame. Grey and empty until you study today; then it ignites with
// a springy pop and a flash of glow, and its core keeps breathing (.flame-core).

const OUTER =
  'M12 2.5c.7 3 2.6 4.8 4.3 6.7 1.6 1.8 2.7 3.8 2.7 6.3a7 7 0 0 1-14 0c0-2.6 1.3-4.6 3-6.1.2 1.6.9 2.7 2 3.3-.3-3.9.5-7.3 2-10.2Z'
const CORE =
  'M12 12c1.7 1.5 3 3 3 5a3 3 0 0 1-6 0c0-1.2.6-2.1 1.4-2.8.1.7.4 1.1.9 1.4-.2-1.3.1-2.6.7-3.6Z'

export default function StreakFlame({ lit, className = 'size-5', label }) {
  const [scope, animate] = useAnimate()
  const reduce = useReducedMotion()
  const wasLit = useRef(lit)

  // Ignite only at the moment it lights, never on page load.
  useEffect(() => {
    if (lit && !wasLit.current && !reduce) {
      animate(
        scope.current,
        { transform: ['scale(0.4) rotate(-12deg)', 'scale(1.25) rotate(4deg)', 'scale(1) rotate(0deg)'], opacity: [0, 1, 1] },
        { duration: 0.7, ease: [0.34, 1.56, 0.64, 1], times: [0, 0.55, 1] },
      )
    }
    wasLit.current = lit
  }, [lit, reduce, animate, scope])

  return (
    <svg
      ref={scope}
      viewBox="0 0 24 24"
      className={`shrink-0 origin-bottom overflow-visible ${lit ? 'flame-glow' : ''} ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {lit ? (
        <>
          <path d={OUTER} className="fill-accent" />
          <path d={CORE} className="flame-core fill-flame-core" />
        </>
      ) : (
        <path d={OUTER} className="fill-none stroke-muted" strokeWidth="1.6" strokeLinejoin="round" />
      )}
    </svg>
  )
}
