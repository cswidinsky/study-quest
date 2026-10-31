import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useGame } from '../state/game.js'
import { useTheme } from '../theme.js'
import { play } from '../lib/sound.js'
import { buzz } from '../lib/haptics.js'
import { EASE_OUT, stagger, useRise } from '../lib/motion.js'
import Button from '../components/Button.jsx'
import Switch from '../components/Switch.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'

// Sound, vibration, theme, motion, and "Reset demo".
export default function Settings() {
  const { data, updateSettings, resetDemo } = useGame()
  const rise = useRise()
  const theme = useTheme()
  const reduce = useReducedMotion()
  const [confirming, setConfirming] = useState(false)
  if (!data) return null
  const { settings } = data

  return (
    <motion.div className="mx-auto max-w-3xl px-4 pt-7 pb-24 sm:px-6 lg:pt-24" initial="hidden" animate="show" variants={stagger(0.07, 0.05)}>
      <motion.header variants={rise}>
        <h1 className="text-[32px] leading-tight font-semibold tracking-tight sm:text-[44px]">Settings</h1>
        <p className="mt-2 text-base text-muted sm:text-lg">Saved on this device.</p>
      </motion.header>

      <motion.section variants={rise} className="panel mt-9 divide-y divide-border rounded-3xl px-4 sm:px-6 lg:mt-12" aria-label="Feedback">
        <Row
          title="Sound effects"
          detail="Chimes for right answers (higher as your combo grows), a soft thud for wrong ones, and a fanfare when you level up."
          htmlFor="set-sound"
        >
          <Button variant="ghost" size="sm" onClick={() => play('combo', { force: true })}>
            Preview
          </Button>
          <Switch id="set-sound" label="Sound effects" checked={settings.sound} onChange={(on) => {
            updateSettings({ sound: on })
            if (on) play('correct', { force: true })
          }} />
        </Row>
        <Row title="Vibration" detail="A short buzz on answers, on phones that allow it (Android). iPhones don’t let websites vibrate." htmlFor="set-haptics">
          <Switch id="set-haptics" label="Vibration" checked={settings.haptics} onChange={(on) => {
            updateSettings({ haptics: on })
            if (on) setTimeout(() => buzz('correct'), 0)
          }} />
        </Row>
      </motion.section>

      <motion.section variants={rise} className="panel mt-4 divide-y divide-border rounded-3xl px-4 sm:px-6" aria-label="Look and motion">
        <Row title="Theme" detail={`${theme === 'dark' ? 'Dark' : 'Light'}. Press the button to switch; your choice is remembered.`}>
          <ThemeToggle />
        </Row>
        <Row
          title="Motion"
          detail={
            reduce
              ? 'Reduced: your device asks for less motion, so StudyQuest fades instead of moving.'
              : 'Full. To calm it down, turn on “Reduce motion” in your device’s accessibility settings.'
          }
        >
          <span className="rounded-full border border-border px-3 py-1 text-xs">{reduce ? 'Reduced' : 'Full'}</span>
        </Row>
      </motion.section>

      <motion.section variants={rise} className="panel mt-4 rounded-3xl p-4 sm:p-6" aria-labelledby="demo-heading">
        <h2 id="demo-heading" className="font-medium">
          Demo data
        </h2>
        <p className="mt-1 text-sm text-muted">
          Your progress is saved in this browser.{' '}
          {data.reported?.length ? `You’ve reported ${data.reported.length} question${data.reported.length === 1 ? '' : 's'}.` : ''}
        </p>
        <AnimatePresence mode="wait" initial={false}>
          {confirming ? (
            <motion.div
              key="confirm"
              className="mt-4 rounded-2xl border border-error/40 bg-error/5 p-4"
              initial={{ opacity: 0, transform: 'translateY(6px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
            >
              <p className="text-sm">
                Reset the demo? Your XP, level, streak and every card’s memory go back to where the demo started, and decks you
                made are deleted. Then you can replay the level-up and every first-time moment.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={resetDemo} className="bg-error text-on-accent hover:bg-error hover:brightness-110">
                  Reset demo
                </Button>
                <Button variant="secondary" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="ask" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button variant="secondary" className="mt-4 border-error/40 text-text hover:border-error" onClick={() => setConfirming(true)}>
                Reset demo…
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </motion.div>
  )
}

function Row({ title, detail, children, htmlFor }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-5">
      <div className="min-w-0 flex-1 basis-64">
        <label htmlFor={htmlFor} className="font-medium">
          {title}
        </label>
        <p className="mt-0.5 text-sm text-muted">{detail}</p>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}
