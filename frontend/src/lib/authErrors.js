// Supabase Auth errors, as friendly sentences. `context` tunes a few of them.

export function authMessage(error, context = '') {
  if (!error) return ''
  const code = error.code ?? ''
  const raw = String(error.message ?? '')
  const msg = raw.toLowerCase()

  if (error.name === 'AuthRetryableFetchError' || /failed to fetch|networkerror|load failed/.test(msg)) {
    return 'Couldn’t reach the account server. Check your internet connection and try again.'
  }

  switch (code) {
    case 'invalid_credentials':
      return 'That email and password don’t match. Check them, or reset your password below.'
    case 'email_not_confirmed':
      return 'You haven’t confirmed your email yet. Open the link we sent you, or send a new one.'
    case 'user_already_exists':
    case 'email_exists':
      return 'An account with this email already exists. Log in instead.'
    case 'weak_password':
      return 'That password is too easy to guess. Use at least 8 characters with letters and numbers.'
    case 'same_password':
      return 'That’s your current password. Choose a new one.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many emails in a short time. Wait a minute, then try again.'
    case 'email_address_invalid':
      return 'That email address doesn’t look right. Check it and try again.'
    case 'email_address_not_authorized':
      return 'This email can’t receive messages yet: Supabase’s built-in email only sends to your team. Set up custom SMTP in Supabase.'
    case 'signup_disabled':
      return 'New sign-ups are turned off right now.'
    case 'otp_expired':
    case 'flow_state_expired':
      return 'That link has expired or was already used. Ask for a new one.'
    case 'otp_disabled':
    case 'user_not_found':
      return context === 'magic'
        ? 'There’s no account with that email yet. Create one instead.'
        : 'There’s no account with that email.'
    case 'session_not_found':
    case 'refresh_token_not_found':
      return 'Your session has expired. Log in again.'
    default:
      break
  }

  if (msg.includes('invalid login credentials')) return authMessage({ code: 'invalid_credentials' })
  if (msg.includes('email not confirmed')) return authMessage({ code: 'email_not_confirmed' })
  if (msg.includes('already registered')) return authMessage({ code: 'user_already_exists' })
  if (msg.includes('password should') || msg.includes('password is')) return authMessage({ code: 'weak_password' })
  if (msg.includes('rate limit') || error.status === 429) return authMessage({ code: 'over_email_send_rate_limit' })
  if (msg.includes('expired') || (context === 'link' && msg.includes('invalid'))) return authMessage({ code: 'otp_expired' })
  if (msg.includes('signups not allowed')) return authMessage({ code: 'otp_disabled' }, context)
  return raw || 'Something went wrong. Please try again.'
}

// The password rules shown under every new-password field.
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'letter', label: 'A letter', test: (p) => /[a-z]/i.test(p) },
  { id: 'number', label: 'A number', test: (p) => /\d/.test(p) },
]

export const passwordOk = (p) => PASSWORD_RULES.every((r) => r.test(p))

export const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
