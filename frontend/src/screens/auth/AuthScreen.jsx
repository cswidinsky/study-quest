import { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '../../state/auth.js'
import { emailOk, passwordOk } from '../../lib/authErrors.js'
import { EASE_OUT, stagger, useRise } from '../../lib/motion.js'
import Button from '../../components/Button.jsx'
import ThemeToggle from '../../components/ThemeToggle.jsx'
import Logo from '../../components/shell/Logo.jsx'
import { Field, TextInput } from '../../components/Field.jsx'
import { ArrowRightIcon, MailIcon } from '../../components/icons.jsx'
import LandingInfo from './LandingInfo.jsx'
import Preview from './Preview.jsx'
import { Alert, PasswordInput, Spinner } from './parts.jsx'
import { useAction } from './useAction.js'

// The locked front door: a welcome on the left, the account panel on the right (stacked on phones).
// Views: signup · login · magic · forgot · sent (check your email) · reset (new password) · setup (no keys)

const RETURNING = 'sq-has-account' // this browser has signed in before → open on "Log in" (not account data)
const isReturning = () => {
  try {
    return localStorage.getItem(RETURNING) === '1'
  } catch {
    return false
  }
}
const markReturning = () => {
  try {
    localStorage.setItem(RETURNING, '1')
  } catch {
    // ignore
  }
}

export default function AuthScreen() {
  const auth = useAuth()
  const rise = useRise()
  const [chosen, setChosen] = useState(() => (isReturning() ? 'login' : 'signup'))
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(null) // { kind: 'signup'|'reset'|'magic', email, back }

  // The account state can force a view: no keys yet, or a password-reset link was opened.
  const view = auth.status === 'unconfigured' ? 'setup' : auth.status === 'recovery' ? 'reset' : chosen
  const go = (next) => {
    auth.clearNotice()
    setChosen(next)
  }
  const showSent = (kind, address, back) => {
    setSent({ kind, email: address, back })
    go('sent')
  }
  const linkError = auth.notice?.kind === 'error' ? auth.notice.text : null
  const shared = { email, setEmail, go, showSent, linkError, onDone: markReturning }

  return (
    <div className="relative min-h-dvh">
      <header className="absolute inset-x-0 top-0 z-10 mx-auto flex max-w-[1180px] items-center justify-between px-4 py-4 sm:px-8 sm:py-6">
        <Logo href={null} className="h-7 sm:h-8" />
        <ThemeToggle />
      </header>

      <main className="mx-auto grid min-h-dvh max-w-[1180px] content-start items-center gap-10 lg:content-center px-4 pt-24 pb-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-20 lg:pt-16">
        <motion.div initial="hidden" animate="show" variants={stagger(0.08, 0.05)} className="max-w-[560px]">
          <motion.h1 variants={rise} className="text-[38px] leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-[52px] lg:text-[60px]">
            Your notes, played as a game.
          </motion.h1>
          <motion.p variants={rise} className="mt-5 max-w-[46ch] text-base text-muted sm:text-lg">
            Drop in a lecture PDF and StudyQuest writes the quiz. Right answers earn XP, combos multiply it, and spaced reviews
            bring back what you’re about to forget.
          </motion.p>
          <motion.div variants={rise} className="mt-12 hidden lg:block">
            <Preview />
          </motion.div>
        </motion.div>

        <motion.section
          aria-label="Your account"
          className="panel w-full rounded-[28px] p-5 shadow-[var(--panel-edge),var(--shadow-float)] sm:p-8 lg:justify-self-end"
          initial={{ opacity: 0, transform: 'translateY(16px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{ type: 'spring', duration: 0.7, bounce: 0.12, delay: 0.12 }}
        >
          {(view === 'signup' || view === 'login') && <Tabs value={view} onChange={go} />}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              initial={{ opacity: 0, transform: 'translateY(8px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              exit={{ opacity: 0, transform: 'translateY(-4px)', transition: { duration: 0.12 } }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
            >
              {view === 'signup' && <SignUp {...shared} />}
              {view === 'login' && <LogIn {...shared} />}
              {view === 'magic' && <MagicLink {...shared} />}
              {view === 'forgot' && <Forgot {...shared} />}
              {view === 'sent' && sent && <Sent sent={sent} go={go} />}
              {view === 'reset' && <ResetPassword />}
              {view === 'setup' && <Setup />}
            </motion.div>
          </AnimatePresence>
        </motion.section>
      </main>
      {/* What StudyQuest is, in crawlable text, below the sign-up (not on reset / setup screens). */}
      {view !== 'reset' && view !== 'setup' && <LandingInfo />}
    </div>
  )
}

/* ——— Pieces ——— */

function Tabs({ value, onChange }) {
  return (
    <div className="mb-7 grid grid-cols-2 rounded-full bg-border/50 p-1" role="group" aria-label="Create an account or log in">
      {[
        ['signup', 'Create account'],
        ['login', 'Log in'],
      ].map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`relative h-9 rounded-full text-sm font-medium transition-[color,scale] duration-150 ease-out active:scale-[0.97] ${
            value === id ? 'text-text' : 'text-muted hover:text-text'
          }`}
        >
          {value === id && (
            <motion.span
              layoutId="auth-tab"
              className="absolute inset-0 rounded-full bg-surface shadow-[var(--panel-edge),0_6px_20px_-12px_rgb(0_0_0/0.4)]"
              transition={{ type: 'spring', duration: 0.45, bounce: 0.18 }}
            />
          )}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  )
}

function Heading({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {children && <p className="mt-1.5 text-sm text-muted">{children}</p>}
    </div>
  )
}

function Submit({ busy, children, busyText }) {
  return (
    <Button type="submit" size="lg" className="mt-6 w-full" disabled={busy} aria-busy={busy || undefined}>
      {busy && <Spinner />}
      {busy ? busyText : children}
    </Button>
  )
}

function TextLink({ onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md text-sm font-medium text-text underline decoration-border decoration-2 underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-accent ${className}`}
    >
      {children}
    </button>
  )
}

// Focus the first field with a problem, so keyboard and screen-reader users land on it.
const focus = (id) => setTimeout(() => document.getElementById(id)?.focus(), 0)

/* ——— Views ——— */

function SignUp({ email, setEmail, go, showSent, linkError, onDone }) {
  const auth = useAuth()
  const id = useId()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [invalid, setInvalid] = useState(null)
  const { busy, error, setError, run } = useAction()

  async function submit(e) {
    e.preventDefault()
    const problem = !name.trim()
      ? ['name', 'Tell us your name. It’s how StudyQuest greets you.']
      : !emailOk(email)
        ? ['email', 'That email address doesn’t look right.']
        : !passwordOk(password)
          ? ['password', 'Your password needs at least 8 characters, with a letter and a number.']
          : null
    if (problem) {
      setInvalid(problem[0])
      setError({ message: problem[1] })
      focus(`${id}-${problem[0]}`)
      return
    }
    setInvalid(null)
    const result = await run(() => auth.signUp({ fullName: name, email, password }))
    if (!result) return
    onDone()
    if (result.confirmEmail) showSent('signup', email.trim(), 'signup')
    // Otherwise (email confirmation off) Supabase signed us in and the app opens by itself.
  }

  return (
    <form onSubmit={submit} noValidate>
      <Heading title="Create your account">Free, and your progress follows you to any device.</Heading>
      {linkError && !error && <Alert>{linkError}</Alert>}
      {error && (
        <Alert
          action={
            error.code === 'user_already_exists' && (
              <TextLink className="mt-1.5" onClick={() => go('login')}>
                Log in instead
              </TextLink>
            )
          }
        >
          {error.message}
        </Alert>
      )}
      <div className="space-y-4">
        <Field label="Full name" htmlFor={`${id}-name`}>
          <TextInput id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} aria-invalid={invalid === 'name' || undefined} />
        </Field>
        <Field label="Email" htmlFor={`${id}-email`}>
          <TextInput
            id={`${id}-email`}
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={invalid === 'email' || undefined}
          />
        </Field>
        <Field label="Password" htmlFor={`${id}-password`}>
          <PasswordInput id={`${id}-password`} value={password} onChange={setPassword} autoComplete="new-password" rules invalid={invalid === 'password'} />
        </Field>
      </div>
      <Submit busy={busy} busyText="Creating your account…">
        Create account
      </Submit>
      <p className="mt-5 text-center text-sm text-muted">
        Already have an account? <TextLink onClick={() => go('login')}>Log in</TextLink>
      </p>
    </form>
  )
}

function LogIn({ email, setEmail, go, showSent, linkError, onDone }) {
  const auth = useAuth()
  const id = useId()
  const [password, setPassword] = useState('')
  const [invalid, setInvalid] = useState(null)
  const { busy, error, setError, run } = useAction()
  const resend = useAction()

  async function submit(e) {
    e.preventDefault()
    const problem = !emailOk(email) ? ['email', 'Enter the email you signed up with.'] : !password ? ['password', 'Enter your password.'] : null
    if (problem) {
      setInvalid(problem[0])
      setError({ message: problem[1] })
      focus(`${id}-${problem[0]}`)
      return
    }
    setInvalid(null)
    const ok = await run(async () => {
      await auth.signIn({ email, password })
      return true
    })
    if (ok) onDone()
  }

  async function sendConfirmation() {
    const ok = await resend.run(async () => {
      await auth.resendConfirmation(email)
      return true
    })
    if (ok) showSent('signup', email.trim(), 'login')
  }

  return (
    <form onSubmit={submit} noValidate>
      <Heading title="Welcome back">Log in to pick up your streak where you left it.</Heading>
      {linkError && !error && <Alert>{linkError}</Alert>}
      {error && (
        <Alert
          action={
            error.code === 'email_not_confirmed' ? (
              <TextLink className="mt-1.5" onClick={sendConfirmation}>
                {resend.busy ? 'Sending…' : 'Send the confirmation link again'}
              </TextLink>
            ) : null
          }
        >
          {resend.error?.message ?? error.message}
        </Alert>
      )}
      <div className="space-y-4">
        <Field label="Email" htmlFor={`${id}-email`}>
          <TextInput
            id={`${id}-email`}
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={invalid === 'email' || undefined}
          />
        </Field>
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <label htmlFor={`${id}-password`} className="text-sm font-medium">
              Password
            </label>
            <TextLink onClick={() => go('forgot')} className="text-muted">
              Forgot password?
            </TextLink>
          </div>
          <PasswordInput id={`${id}-password`} value={password} onChange={setPassword} autoComplete="current-password" invalid={invalid === 'password'} />
        </div>
      </div>
      <Submit busy={busy} busyText="Logging in…">
        Log in
      </Submit>
      <Button variant="secondary" size="lg" className="mt-3 w-full" onClick={() => go('magic')}>
        <MailIcon />
        Email me a login link instead
      </Button>
      <p className="mt-5 text-center text-sm text-muted">
        New to StudyQuest? <TextLink onClick={() => go('signup')}>Create an account</TextLink>
      </p>
    </form>
  )
}

function EmailOnly({ title, intro, action, busyText, submitLabel, kind, email, setEmail, go, showSent, linkError }) {
  const id = useId()
  const { busy, error, setError, run } = useAction()

  async function submit(e) {
    e.preventDefault()
    if (!emailOk(email)) {
      setError({ message: 'That email address doesn’t look right.' })
      focus(`${id}-email`)
      return
    }
    const ok = await run(async () => {
      await action(email)
      return true
    })
    if (ok) showSent(kind, email.trim(), kind === 'reset' ? 'forgot' : 'magic')
  }

  return (
    <form onSubmit={submit} noValidate>
      <Heading title={title}>{intro}</Heading>
      {linkError && !error && <Alert>{linkError}</Alert>}
      {error && <Alert>{error.message}</Alert>}
      <Field label="Email" htmlFor={`${id}-email`}>
        <TextInput id={`${id}-email`} type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={Boolean(error) || undefined} />
      </Field>
      <Submit busy={busy} busyText={busyText}>
        {submitLabel}
      </Submit>
      <p className="mt-5 text-center text-sm text-muted">
        Remembered it? <TextLink onClick={() => go('login')}>Back to log in</TextLink>
      </p>
    </form>
  )
}

function Forgot(props) {
  const auth = useAuth()
  return (
    <EmailOnly
      {...props}
      kind="reset"
      title="Reset your password"
      intro="Enter your account email and we’ll send you a link to choose a new password."
      action={auth.requestPasswordReset}
      submitLabel="Send reset link"
      busyText="Sending…"
    />
  )
}

function MagicLink(props) {
  const auth = useAuth()
  return (
    <EmailOnly
      {...props}
      kind="magic"
      title="Log in with an email link"
      intro="No password needed. We’ll email you a link that logs you straight in."
      action={auth.sendMagicLink}
      submitLabel="Send login link"
      busyText="Sending…"
    />
  )
}

const SENT_COPY = {
  signup: {
    title: 'Check your email',
    body: (email) => (
      <>
        We sent a confirmation link to <strong className="font-medium text-text">{email}</strong>. Open it to finish creating your
        account. It works on this device or any other.
      </>
    ),
  },
  reset: {
    title: 'Check your email',
    body: (email) => (
      <>
        If there’s an account for <strong className="font-medium text-text">{email}</strong>, a link to choose a new password is on
        its way.
      </>
    ),
  },
  magic: {
    title: 'Your login link is on its way',
    body: (email) => (
      <>
        We sent it to <strong className="font-medium text-text">{email}</strong>. Open it to log in.
      </>
    ),
  },
}

const COOLDOWN = 60

function Sent({ sent, go }) {
  const auth = useAuth()
  const [wait, setWait] = useState(COOLDOWN)
  const [resent, setResent] = useState(false)
  const { busy, error, run } = useAction()
  const copy = SENT_COPY[sent.kind]

  useEffect(() => {
    if (wait <= 0) return undefined
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  async function resend() {
    const send = { signup: auth.resendConfirmation, reset: auth.requestPasswordReset, magic: auth.sendMagicLink }[sent.kind]
    const ok = await run(async () => {
      await send(sent.email)
      return true
    })
    if (ok) {
      setResent(true)
      setWait(COOLDOWN)
    }
  }

  return (
    <div>
      <motion.span
        className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent"
        initial={{ opacity: 0, transform: 'scale(0.8) rotate(-8deg)' }}
        animate={{ opacity: 1, transform: 'scale(1) rotate(0deg)' }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.4, delay: 0.05 }}
        aria-hidden="true"
      >
        <MailIcon className="size-7" />
      </motion.span>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight">{copy.title}</h2>
      <p className="mt-2 text-[15px] text-muted">{copy.body(sent.email)}</p>
      <p className="mt-3 text-sm text-muted">Can’t see it? Give it a minute, and check your spam folder.</p>

      <div aria-live="polite">
        {error && <Alert className="mt-5 mb-0">{error.message}</Alert>}
        {resent && !error && (
          <Alert kind="success" className="mt-5 mb-0">
            Sent again. Use the newest email: older links stop working.
          </Alert>
        )}
      </div>

      <Button variant="secondary" size="lg" className="mt-6 w-full" onClick={resend} disabled={busy || wait > 0}>
        {busy && <Spinner />}
        {busy ? 'Sending…' : wait > 0 ? `Resend email in ${wait}s` : 'Resend email'}
      </Button>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <TextLink onClick={() => go(sent.back)}>Use a different email</TextLink>
        {sent.kind === 'signup' && (
          <TextLink onClick={() => go('login')} className="text-muted">
            Already confirmed? Log in
          </TextLink>
        )}
      </div>
    </div>
  )
}

function ResetPassword() {
  const auth = useAuth()
  const id = useId()
  const [password, setPassword] = useState('')
  const { busy, error, setError, run } = useAction()

  async function submit(e) {
    e.preventDefault()
    if (!passwordOk(password)) {
      setError({ message: 'Your new password needs at least 8 characters, with a letter and a number.' })
      focus(`${id}-password`)
      return
    }
    await run(() => auth.setNewPassword(password))
  }

  return (
    <form onSubmit={submit} noValidate>
      <Heading title="Choose a new password">
        For <strong className="font-medium text-text">{auth.user?.email}</strong>. You’ll stay logged in afterwards.
      </Heading>
      {error && <Alert>{error.message}</Alert>}
      {/* Tells password managers which account this new password belongs to. */}
      <input type="email" name="username" autoComplete="username" value={auth.user?.email ?? ''} readOnly hidden />
      <Field label="New password" htmlFor={`${id}-password`}>
        <PasswordInput id={`${id}-password`} value={password} onChange={setPassword} autoComplete="new-password" rules invalid={Boolean(error)} />
      </Field>
      <Submit busy={busy} busyText="Saving…">
        Save new password
        <ArrowRightIcon />
      </Submit>
      <p className="mt-5 text-center text-sm text-muted">
        Changed your mind? <TextLink onClick={auth.signOut}>Cancel and log out</TextLink>
      </p>
    </form>
  )
}

function Setup() {
  return (
    <div>
      <Heading title="StudyQuest isn’t ready yet">Accounts aren’t switched on for this site yet. Please check back soon.</Heading>
      <p className="mb-3 text-sm font-medium">If you run this site:</p>
      <ol className="list-decimal space-y-3 pl-5 text-sm marker:text-muted">
        <li>
          Open <code className="rounded bg-border/60 px-1.5 py-0.5 text-[13px]">frontend/.env.local</code>
        </li>
        <li>
          Paste your Project URL after <code className="rounded bg-border/60 px-1.5 py-0.5 text-[13px]">VITE_SUPABASE_URL=</code> and
          your anon key after <code className="rounded bg-border/60 px-1.5 py-0.5 text-[13px]">VITE_SUPABASE_ANON_KEY=</code>
        </li>
        <li>
          Stop and restart <code className="rounded bg-border/60 px-1.5 py-0.5 text-[13px]">npm run dev</code>
        </li>
      </ol>
      <p className="mt-5 text-sm text-muted">Both values are in Supabase under Project Settings → API.</p>
    </div>
  )
}
