import { createClient } from '@supabase/supabase-js'

// The Supabase client: accounts (Auth) and each user's own data (Postgres + Row Level Security).
// Keys come from frontend/.env.local (never committed). The anon key is meant to be public:
// on its own it can't read anything, because every table only shows a signed-in user their own rows.

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

// The URL the page opened with, read before Supabase tidies it: email links land here with
// ?token_hash=…&type=… (our templates) or #access_token=…&type=recovery / #error=… (defaults).
export const landing = { search: window.location.search, hash: window.location.hash }

// False until both keys are pasted in. The app then shows a setup screen instead of crashing.
export const supabaseReady = /^https?:\/\//.test(url) && anonKey.length > 20

export const supabase = supabaseReady
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Default Supabase email links come back with the session in the URL hash; read it.
        // Our own templates use ?token_hash=… instead (see AuthProvider), which works on any device.
        detectSessionInUrl: true,
      },
    })
  : null

// Where email links should land: this site's home page (localhost in dev, Vercel in production).
// It must be listed under Authentication → URL Configuration → Redirect URLs in Supabase.
export const redirectTo = () => `${window.location.origin}/`
