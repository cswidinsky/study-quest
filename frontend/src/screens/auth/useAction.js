import { useState } from 'react'

// Runs one async account action: tracks busy, and keeps the error ({ message, code }) to show.
// run() returns the action's result, or undefined if it failed.
export function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function run(action) {
    setBusy(true)
    setError(null)
    try {
      return await action()
    } catch (e) {
      setError({ message: e.message || 'Something went wrong. Please try again.', code: e.code ?? '' })
      return undefined
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, setError, run }
}
