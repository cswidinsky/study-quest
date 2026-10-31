import { useEffect, useRef } from 'react'
import { useAnimate, useReducedMotion } from 'motion/react'

// The streak flame. Grey and empty until you study today; then it lights
// with a small springy pop, and its core breathes gently (see .flame-core in index.css).

const OUTER =
  'M12 2.5c.7 3 2.6 4.8 4.3 6.7 1.6 1.8 2.7 3.8 2.7 6.3a7 7 0 0 1-14 0c0-2.6 1.3-4.6 3-6.1.2 1.6.9 2.7 2 3.3-.3-3.9.5-7.3 2-10.2Z'
const CORE =
  'M12 12c1.7 1.5 3 3 3 5a3 3 0 0 1-6 0c0-1.2.6-2.1 1.4-2.8.1.7.4 1.1.9 1.4-.2-1.3.1-2.6.7-3.6Z'

export default function StreakFlame({ lit, className = 'size-5', label }) {
  const [scope, animate] = useAnimate()
  const reduceMotion = useReducedMotion()
  const wasLit = useRef(lit)

  // Pop only at the moment it lights, never on page load.
  useEffect(() => {
    if (lit && !wasLit.current && !reduceMotion) {
      animate(
        scope.current,
        { transform: ['scale(0.6) rotate(-8deg)', 'scale(1) rotate(0deg)'], opacity: [0.4, 1] },
        { type: 'spring', duration: 0.55, bounce: 0.45 },
      )
    }
    wasLit.current = lit
  }, [lit, reduceMotion, animate, scope])

  return (
    <svg
      ref={scope}
      viewBox="0 0 24 24"
      className={`shrink-0 origin-bottom ${className}`}
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
