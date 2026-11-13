import { motion } from 'motion/react'

// An on/off switch. The knob springs across; "on" fills with the success green.
export default function Switch({ checked, onChange, label, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-[background-color,scale] duration-200 ease-out active:scale-[0.95] ${
        checked ? 'justify-end bg-success' : 'justify-start bg-border'
      }`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', duration: 0.35, bounce: 0.3 }}
        className="size-6 rounded-full bg-[#fff] shadow-[0_2px_6px_rgb(0_0_0/0.25)]"
      />
    </button>
  )
}
