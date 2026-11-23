import { useState } from 'react'
import { motion } from 'motion/react'
import { PASSWORD_RULES } from '../../lib/authErrors.js'
import { TextInput } from '../../components/Field.jsx'
import { AlertIcon, CheckIcon, EyeIcon, EyeOffIcon } from '../../components/icons.jsx'

export function Spinner() {
  return <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
}

// A message at the top of a form. Errors are announced straight away (role="alert").
export function Alert({ kind = 'error', action = null, className = 'mb-5', children }) {
  const error = kind === 'error'
  return (
    <motion.div
      role={error ? 'alert' : 'status'}
      className={`flex gap-2.5 rounded-2xl border px-3.5 py-3 text-sm ${error ? 'border-error/40 bg-error/8' : 'border-success/40 bg-success/10'} ${className}`}
      initial={{ opacity: 0, transform: 'translateY(-4px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
    >
      {error ? (
        <AlertIcon className="mt-0.5 size-4 shrink-0 text-error" />
      ) : (
        <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
      )}
      <div className="min-w-0">
        <p>{children}</p>
        {action}
      </div>
    </motion.div>
  )
}

// Password field with a show/hide button. With `rules`, the rules sit under it and tick off as you type.
export function PasswordInput({ id, value, onChange, autoComplete, rules = false, invalid = false }) {
  const [shown, setShown] = useState(false)
  const rulesId = `${id}-rules`

  return (
    <>
      <div className="relative">
        <TextInput
          id={id}
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          className="pr-12"
          aria-describedby={rules ? rulesId : undefined}
          aria-invalid={invalid || undefined}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          aria-controls={id}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-[10px] text-muted transition-[color,scale] duration-150 ease-out hover:text-text active:scale-[0.9]"
        >
          {shown ? <EyeOffIcon className="size-[18px]" /> : <EyeIcon className="size-[18px]" />}
        </button>
      </div>
      {rules && (
        <ul id={rulesId} className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs" aria-label="Password rules">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(value)
            return (
              <li key={rule.id} className={`flex items-center gap-1.5 transition-[color] duration-200 ${ok ? 'text-success' : 'text-muted'}`}>
                <span
                  className={`grid size-4 shrink-0 place-items-center rounded-full border transition-[background-color,border-color] duration-200 ${
                    ok ? 'border-success bg-success text-on-accent' : 'border-muted/40'
                  }`}
                  aria-hidden="true"
                >
                  {ok && (
                    <motion.span
                      initial={{ opacity: 0, transform: 'scale(0.5)' }}
                      animate={{ opacity: 1, transform: 'scale(1)' }}
                      transition={{ type: 'spring', duration: 0.35, bounce: 0.45 }}
                    >
                      <CheckIcon className="size-3" strokeWidth="3" />
                    </motion.span>
                  )}
                </span>
                {rule.label}
                <span className="sr-only">{ok ? ': done' : ': not yet'}</span>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
