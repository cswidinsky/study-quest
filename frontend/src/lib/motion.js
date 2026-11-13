import { useSyncExternalStore } from 'react'
import { useReducedMotion } from 'motion/react'

// Shared motion language, so every screen moves the same way.

export const EASE_OUT = [0.23, 1, 0.32, 1]
export const EASE_IN_OUT = [0.77, 0, 0.175, 1]
export const EASE_CINEMA = [0.16, 1, 0.3, 1] // long, soft settle: count-ups, bar fills

// Parent: reveals its children one after another.
export const stagger = (gap = 0.06, delay = 0.05) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
})

// Child: rises and fades in. With reduced motion it only fades.
export function useRise(distance = 18) {
  const reduce = useReducedMotion()
  return {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, transform: `translateY(${distance}px)` },
    show: {
      opacity: 1,
      transform: 'translateY(0px)',
      transition: reduce ? { duration: 0.3 } : { type: 'spring', duration: 0.75, bounce: 0.12 },
    },
  }
}

// True on devices with a real pointer (mouse/trackpad). Tilt and hover effects only run there.
const hoverQuery = '(hover: hover) and (pointer: fine)'
const subscribeHover = (cb) => {
  const mq = window.matchMedia(hoverQuery)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
export const useCanHover = () =>
  useSyncExternalStore(subscribeHover, () => window.matchMedia(hoverQuery).matches, () => false)

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
