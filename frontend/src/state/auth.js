import { createContext, useContext } from 'react'

// Who is signed in. AuthProvider.jsx holds it; components read it with useAuth().
//   status: 'loading' | 'unconfigured' (no Supabase keys) | 'signedOut' | 'signedIn'
//           | 'recovery' (opened a password-reset link: must choose a new password)
//   user:    the Supabase user ({ id, email, … })
//   profile: { fullName } from the profiles table
//   notice:  a one-off message for the next screen ({ kind: 'success'|'error', text })

export const AuthContext = createContext(null)

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth() must be used inside <AuthProvider>')
  return auth
}

// "Ada King Lovelace" → { firstName: 'Ada', lastName: 'King Lovelace' }
export function splitName(fullName) {
  const parts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') }
}
