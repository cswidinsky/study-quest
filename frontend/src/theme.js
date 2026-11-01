import { useEffect, useState } from 'react'

// The user's choice: 'system' (default), 'light' or 'dark'.
// Only 'light' and 'dark' are saved. 'system' means "nothing saved".
const STORAGE_KEY = 'theme'
const systemQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

function readChoice() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  } catch {
    return 'system'
  }
}

function saveChoice(choice) {
  try {
    if (choice === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, choice)
  } catch {
    // Storage can be blocked (private mode). The theme still works for this visit.
  }
}

function applyTheme(choice) {
  const resolved =
    choice === 'system' ? (systemQuery().matches ? 'dark' : 'light') : choice
  document.documentElement.dataset.theme = resolved
}

export function useTheme() {
  const [choice, setChoice] = useState(readChoice)

  useEffect(() => {
    saveChoice(choice)
    applyTheme(choice)

    // While on 'system', follow the OS if it changes (e.g. sunset auto-switch).
    if (choice !== 'system') return
    const query = systemQuery()
    const onChange = () => applyTheme('system')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [choice])

  return [choice, setChoice]
}
