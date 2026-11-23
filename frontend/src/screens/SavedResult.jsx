import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useGame } from '../state/game.js'
import { getSavedResult } from '../api.js'
import { stagger, useRise } from '../lib/motion.js'
import Button from '../components/Button.jsx'
import AnswerReview from './quiz/AnswerReview.jsx'
import { AlertIcon, ArrowRightIcon } from '../components/icons.jsx'

// #/results/<quizId>: a marked quiz, loaded from the server by its id (so it survives a refresh).
// Display only: it never submits the quiz again and never awards XP.
export default function SavedResult({ id }) {
  const { data } = useGame()
  const rise = useRise()
  const ready = Boolean(data) // the account's world is open (its deck supplies the question text)
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    if (!ready) return undefined
    let live = true
    getSavedResult(id)
      .then((result) => live && setState({ status: 'ready', result }))
      .catch((error) => live && setState({ status: 'error', message: error.message }))
    return () => {
      live = false
    }
  }, [id, ready])

  const result = state.result
  const deck = result?.deckId ? data?.decks.find((d) => d.id === result.deckId) : null

  return (
    <motion.div className="mx-auto max-w-[1100px] px-4 pt-7 pb-24 *:max-w-3xl sm:px-6 lg:pt-24" initial="hidden" animate="show" variants={stagger(0.07, 0.05)}>
      <motion.header variants={rise}>
        <h1 className="text-[32px] leading-tight font-semibold tracking-tight sm:text-[44px]">{deck?.title ?? 'Quiz result'}</h1>
        {state.status === 'ready' && (
          <p className="mt-2 text-lg text-muted">
            You scored <span className="num font-medium text-text">{result.score}</span> out of{' '}
            <span className="num font-medium text-text">{result.total}</span>. Marked by the StudyQuest server.
          </p>
        )}
      </motion.header>

      {state.status === 'loading' && (
        <div className="mt-9 space-y-3" aria-busy="true" aria-label="Loading your result">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-3xl bg-border/40 motion-safe:animate-pulse" />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <motion.div variants={rise} role="alert" className="panel mt-9 flex flex-wrap items-start gap-3 rounded-3xl p-5 text-sm">
          <AlertIcon className="mt-0.5 size-5 shrink-0 text-error" />
          <p className="min-w-0 flex-1 basis-60">{state.message}</p>
        </motion.div>
      )}

      {state.status === 'ready' && <AnswerReview questions={result.questions} deck={deck} fileName={deck?.source?.fileName} />}

      {state.status !== 'loading' && (
        <motion.div variants={rise} className="mt-8 flex flex-wrap gap-2">
          {deck && (
            <Button as="a" href={`#/deck/${deck.id}`} size="lg">
              Open the deck
              <ArrowRightIcon />
            </Button>
          )}
          <Button as="a" href="#/" variant={deck ? 'secondary' : 'primary'} size="lg">
            Back to dashboard
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}
