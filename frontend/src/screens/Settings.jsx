import { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useGame } from '../state/game.js'
import { useAuth } from '../state/auth.js'
import { useTheme } from '../theme.js'
import { play } from '../lib/sound.js'
import { buzz } from '../lib/haptics.js'
import { EASE_OUT, stagger, useRise } from '../lib/motion.js'
import Button from '../components/Button.jsx'
import Switch from '../components/Switch.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { TextInput } from '../components/Field.jsx'
import { LogOutIcon } from '../components/icons.jsx'
import { checkServer } from '../api.js'

// Your account (name, log out), Demo mode, sound, vibration, theme and motion.
export default function Settings() {
  const { data, updateSettings, resetDemo, demo, setDemo, showToast } = useGame()
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
        <p className="mt-2 text-base text-muted sm:text-lg">Your account, and how StudyQuest looks and sounds.</p>
      </motion.header>

      <motion.section variants={rise} className="panel mt-9 divide-y divide-border rounded-3xl px-4 sm:px-6 lg:mt-12" aria-labelledby="account-heading">
        <AccountRows showToast={showToast} />
      </motion.section>

      <motion.section variants={rise} className="panel mt-4 divide-y divide-border rounded-3xl px-4 sm:px-6" aria-label="Demo mode">
        <Row
          title="Demo mode"
          htmlFor="set-demo"
          detail={
            demo
              ? 'On: you’re playing with sample decks, XP and grading. Your real decks and progress are safe and untouched.'
              : 'Try StudyQuest with sample decks and a few weeks of progress. Your real data stays exactly as it is and comes back when you switch it off.'
          }
        >
          <Switch id="set-demo" label="Demo mode" checked={demo} onChange={setDemo} />
        </Row>
        {demo ? <ResetDemoRow onReset={resetDemo} confirming={confirming} setConfirming={setConfirming} /> : <ServerRow />}
      </motion.section>

      <motion.section variants={rise} className="panel mt-4 divide-y divide-border rounded-3xl px-4 sm:px-6" aria-label="Feedback">
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

// Is the quiz server (Flask) reachable? It writes and marks the quizzes for your real decks.
function ServerRow() {
  const [status, setStatus] = useState('checking') // 'checking' | 'up' | 'down'

  useEffect(() => {
    let live = true
    checkServer().then((up) => live && setStatus(up ? 'up' : 'down'))
    return () => {
      live = false
    }
  }, [])

  const detail = {
    checking: 'Checking…',
    up: 'Connected. New PDFs are turned into quizzes and marked by the StudyQuest server.',
    down: 'Not reachable right now, so new PDFs can’t be turned into quizzes. Your decks and reviews still work.',
  }[status]

  return (
    <Row title="Quiz server" detail={detail}>
      <span className="flex items-center gap-2 text-sm">
        <span
          className={`size-2.5 rounded-full ${status === 'up' ? 'bg-success' : status === 'down' ? 'bg-error' : 'bg-border'}`}
          aria-hidden="true"
        />
        {status === 'up' ? 'Online' : status === 'down' ? 'Offline' : '…'}
      </span>
    </Row>
  )
}

// Demo mode only: start the sample world again.
function ResetDemoRow({ onReset, confirming, setConfirming }) {
  return (
    <div className="py-5">
      <AnimatePresence mode="wait" initial={false}>
        {confirming ? (
          <motion.div
            key="confirm"
            className="rounded-2xl border border-error/40 bg-error/5 p-4"
            initial={{ opacity: 0, transform: 'translateY(6px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
          >
            <p className="text-sm">
              Reset the demo world? Its XP, level, streak and decks go back to the start, so you can replay the level-up and every
              first-time moment. Your real account isn’t touched.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setConfirming(false)
                  onReset()
                }}
                className="bg-error text-on-accent hover:bg-error hover:brightness-110"
              >
                Reset demo world
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="ask" className="flex flex-wrap items-center gap-x-6 gap-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="min-w-0 flex-1 basis-64">
              <p className="font-medium">Reset the demo world</p>
              <p className="mt-0.5 text-sm text-muted">Start the sample decks and XP again from the beginning.</p>
            </div>
            <Button variant="secondary" className="border-error/40 text-text hover:border-error" onClick={() => setConfirming(true)}>
              Reset demo…
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Your name (saved to your Supabase profile), your email, and log out.
function AccountRows({ showToast }) {
  const auth = useAuth()
  const id = useId()
  const [name, setName] = useState(auth.fullName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const changed = name.trim().replace(/\s+/g, ' ') !== auth.fullName

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const saved = await auth.updateFullName(name)
      setName(saved)
      showToast({ kind: 'info', message: 'Name saved.' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 py-5">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--color-accent),var(--color-sun))] text-lg font-semibold text-on-accent"
          aria-hidden="true"
        >
          {(auth.fullName[0] ?? '?').toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="account-heading" className="truncate font-medium">
            {auth.fullName}
          </h2>
          <p className="truncate text-sm text-muted">{auth.user?.email}</p>
        </div>
        <Button variant="secondary" onClick={auth.signOut}>
          <LogOutIcon />
          Log out
        </Button>
      </div>
      <form onSubmit={save} className="py-5" noValidate>
        <label htmlFor={`${id}-name`} className="font-medium">
          Full name
        </label>
        <p id={`${id}-hint`} className="mt-0.5 text-sm text-muted">
          Shown on your dashboard and in the emails we send you.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <TextInput
            id={`${id}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={80}
            className="max-w-sm flex-1 basis-56"
            aria-describedby={`${id}-hint`}
            aria-invalid={Boolean(error) || undefined}
          />
          <Button type="submit" disabled={!changed || !name.trim() || saving}>
            {saving ? 'Saving…' : 'Save name'}
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-error">
            {error}
          </p>
        )}
      </form>
    </>
  )
}
