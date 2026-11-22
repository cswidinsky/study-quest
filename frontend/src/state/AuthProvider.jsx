import { useEffect, useMemo, useRef, useState } from 'react'
import { landing, redirectTo, supabase, supabaseReady } from '../lib/supabase.js'
import { authMessage } from '../lib/authErrors.js'
import { friendlyDbError } from '../lib/cloud.js'
import { claimBrowser, clearLocalData } from '../lib/storage.js'
import { AuthContext } from './auth.js'

// Accounts (Supabase Auth). Holds who is signed in and every account action.
//
// Email links land on the home page in one of three shapes:
//   ?token_hash=…&type=email|recovery   our templates (supabase/email-templates): we verify it here.
//                                        Works on any device, and mail scanners can't use it up.
//   #access_token=…&type=recovery        Supabase's default templates: supabase-js reads it.
//   #error=…&error_description=…         an expired or used link.

const LINK_TYPES = new Set(['email', 'signup', 'magiclink', 'recovery', 'invite', 'email_change'])

function readLink() {
  const query = new URLSearchParams(landing.search)
  const hash = new URLSearchParams(landing.hash.replace(/^#\/?/, ''))
  const type = query.get('type')
  const errorText = hash.get('error_description') || query.get('error_description')
  return {
    tokenHash: LINK_TYPES.has(type) ? query.get('token_hash') : null,
    type,
    via: query.get('via'), // 'signup' or 'magic' (set by our templates)
    recovery: Boolean(hash.get('access_token')) && hash.get('type') === 'recovery',
    error: errorText ? { code: hash.get('error_code') || query.get('error_code'), message: errorText } : null,
  }
}

// Finish the email link once per page load. (React runs effects twice in development, and a
// one-time link can only be used once.) → { recovery, notice }
let linkTask = null
function finishLink(link) {
  linkTask ??= (async () => {
    await supabase.auth.getSession() // waits for supabase-js to read any #access_token link
    let recovery = link.recovery
    let notice = null
    if (link.tokenHash || link.error) cleanUrl()
    if (link.tokenHash) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type })
      if (error) notice = { kind: 'error', text: authMessage(error, 'link') }
      else if (link.type === 'recovery') recovery = true
      else if (link.via === 'magic') notice = { kind: 'success', text: 'You’re logged in. Welcome back!' }
      else notice = { kind: 'success', text: 'Email confirmed. Welcome to StudyQuest!' }
    } else if (link.error) {
      notice = { kind: 'error', text: authMessage({ code: link.error.code, message: link.error.message }, 'link') }
    }
    return { recovery, notice }
  })()
  return linkTask
}

// Take the one-time link out of the address bar (so a refresh or a shared URL can't reuse it).
function cleanUrl() {
  const url = new URL(window.location.href)
  for (const key of ['token_hash', 'type', 'via', 'error', 'error_code', 'error_description']) url.searchParams.delete(key)
  if (/error|access_token/.test(url.hash)) url.hash = '#/'
  window.history.replaceState(null, '', url.toString())
}

export default function AuthProvider({ children }) {
  const [state, setState] = useState(() => ({
    status: supabaseReady ? 'loading' : 'unconfigured',
    user: null,
    profile: null,
    notice: null,
  }))
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  // Boot: finish any email link, then read the saved session. Afterwards, follow changes
  // (log in, log out, token refresh, other tabs).
  useEffect(() => {
    if (!supabase) return undefined
    let alive = true
    const link = readLink()

    async function boot() {
      const { recovery, notice } = await finishLink(link)
      const { data } = await supabase.auth.getSession()
      if (!alive) return
      const user = data.session?.user ?? null
      setState((s) => ({
        ...s,
        status: user ? (recovery ? 'recovery' : 'signedIn') : 'signedOut',
        user,
        notice,
      }))
    }
    boot()

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive || event === 'INITIAL_SESSION') return
      if (event === 'PASSWORD_RECOVERY') {
        setState((s) => ({ ...s, status: 'recovery', user: session?.user ?? s.user }))
        return
      }
      if (event === 'SIGNED_OUT' || !session) {
        setState((s) => (s.status === 'loading' ? s : { ...s, status: 'signedOut', user: null, profile: null }))
        return
      }
      setState((s) => ({
        ...s,
        user: session.user,
        status: s.status === 'loading' || s.status === 'recovery' ? s.status : 'signedIn',
      }))
    })

    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // The profile (full name). Missing for accounts made before schema.sql ran: create it.
  const userId = state.user?.id
  const metaName = state.user?.user_metadata?.full_name ?? ''
  useEffect(() => {
    if (!userId) return undefined
    let alive = true
    ;(async () => {
      const { data, error } = await supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle()
      if (!alive || error) return // no schema yet: the dashboard explains what to do
      let fullName = data?.full_name ?? ''
      if (!data) {
        fullName = metaName
        await supabase.from('profiles').upsert({ id: userId, full_name: fullName })
      }
      if (alive) setState((s) => (s.user?.id === userId ? { ...s, profile: { fullName } } : s))
    })()
    return () => {
      alive = false
    }
  }, [userId, metaName])

  // Log out, or a different account signing in (e.g. in another tab): wipe this browser's
  // local data and reload, so nothing from one account survives into the next, not even in memory.
  const shownUser = useRef(undefined)
  useEffect(() => {
    if (state.status === 'loading') return
    const id = state.user?.id ?? null
    const before = shownUser.current
    shownUser.current = id
    if (id) claimBrowser(id)
    if (before && before !== id) {
      clearLocalData()
      window.location.hash = '#/'
      window.location.reload()
    }
  }, [state.status, state.user?.id])

  const actions = useMemo(
    () => ({
      // → { confirmEmail: true } when Supabase wants the email confirmed first.
      async signUp({ fullName, email, password }) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim().replace(/\s+/g, ' ') }, emailRedirectTo: redirectTo() },
        })
        if (error) throw Object.assign(new Error(authMessage(error)), { code: error.code })
        // With email confirmation on, Supabase hides "email taken" (no error, no identities).
        if (data.user && data.user.identities?.length === 0) {
          throw Object.assign(new Error(authMessage({ code: 'user_already_exists' })), { code: 'user_already_exists' })
        }
        return { confirmEmail: !data.session }
      },

      async signIn({ email, password }) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) {
          const code = error.code || (/not confirmed/i.test(error.message) ? 'email_not_confirmed' : '')
          throw Object.assign(new Error(authMessage({ ...error, code })), { code })
        }
      },

      async resendConfirmation(email) {
        const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: redirectTo() } })
        if (error) throw new Error(authMessage(error))
      },

      async sendMagicLink(email) {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: false, emailRedirectTo: redirectTo() },
        })
        if (error) throw new Error(authMessage(error, 'magic'))
      },

      async requestPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectTo() })
        if (error) throw new Error(authMessage(error))
      },

      async setNewPassword(password) {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw new Error(authMessage(error))
        setState((s) => ({ ...s, status: 'signedIn', notice: { kind: 'success', text: 'Password updated. You’re signed in.' } }))
      },

      async signOut() {
        // 'local': this browser only (your other devices stay signed in).
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        clearLocalData()
        window.location.hash = '#/'
        window.location.reload()
      },

      async updateFullName(name) {
        const fullName = String(name ?? '').trim().replace(/\s+/g, ' ')
        if (!fullName) throw new Error('Your name can’t be empty.')
        if (fullName.length > 80) throw new Error('Keep your name under 80 characters.')
        const id = stateRef.current.user?.id
        const { error } = await supabase.from('profiles').upsert({ id, full_name: fullName })
        if (error) throw friendlyDbError(error)
        supabase.auth.updateUser({ data: { full_name: fullName } }).catch(() => {}) // emails greet by name
        setState((s) => ({ ...s, profile: { fullName } }))
        return fullName
      },

      clearNotice: () => setState((s) => (s.notice ? { ...s, notice: null } : s)),
    }),
    [],
  )

  const fullName = state.profile?.fullName || metaName || state.user?.email?.split('@')[0] || ''
  const value = useMemo(() => ({ ...state, fullName, ...actions }), [state, fullName, actions])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
