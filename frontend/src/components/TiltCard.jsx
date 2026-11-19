import { useRef } from 'react'
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from 'motion/react'
import { useCanHover } from '../lib/motion.js'

// A card that leans toward the cursor, catches a moving light, lifts on hover
// and presses in on click. The glow behind it takes the card's colour (--deck,
// or the accent). Only on mouse/trackpad devices, and not with reduced motion.

const MAX_TILT = 7 // degrees
const SPRING = { stiffness: 260, damping: 22, mass: 0.6 }

export default function TiltCard({ as = 'div', className = '', glow = 'var(--color-accent)', children, style, ...props }) {
  const Tag = motion[as]
  const ref = useRef(null)
  const canHover = useCanHover()
  const reduce = useReducedMotion()
  const live = canHover && !reduce

  const rotateX = useSpring(0, SPRING)
  const rotateY = useSpring(0, SPRING)
  const lift = useSpring(0, SPRING)
  const lightX = useMotionValue(50)
  const lightY = useMotionValue(0)
  const lit = useSpring(0, { stiffness: 200, damping: 30 })
  const shine = useMotionTemplate`radial-gradient(420px circle at ${lightX}% ${lightY}%, rgb(255 255 255 / 0.16), transparent 45%)`

  function onPointerMove(e) {
    if (!live) return
    const rect = ref.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    rotateY.set((px - 0.5) * MAX_TILT)
    rotateX.set((0.5 - py) * MAX_TILT)
    lightX.set(px * 100)
    lightY.set(py * 100)
  }

  function onPointerEnter() {
    if (!live) return
    lift.set(-5)
    lit.set(1)
  }

  function onPointerLeave() {
    rotateX.set(0)
    rotateY.set(0)
    lift.set(0)
    lit.set(0)
  }

  return (
    <Tag
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      whileTap={reduce ? undefined : { scale: 0.975 }}
      style={{ rotateX, rotateY, y: lift, transformPerspective: 900, ...style }}
      className={`group/tilt relative isolate ${className}`}
      {...props}
    >
      {/* Coloured glow behind the card (fades in on hover) */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px -z-10 rounded-[inherit]"
        style={{ opacity: lit, boxShadow: `0 18px 50px -14px ${glow}, 0 0 0 1px color-mix(in oklab, ${glow} 45%, transparent)` }}
      />
      {/* Moving light that follows the pointer */}
      {live && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
          style={{ backgroundImage: shine, opacity: lit }}
        />
      )}
      {children}
    </Tag>
  )
}
