import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useGame } from '../state/game.js'
import { rematchItems, revealAnswer, startSession, submitAnswer } from '../api.js'
import { comboMultiplier } from '../lib/levels.js'
import { isWeak } from '../lib/selectors.js'
import { EASE_CINEMA } from '../lib/motion.js'
import { play } from '../lib/sound.js'
import { buzz } from '../lib/haptics.js'
import { navigate } from '../lib/router.js'
import Sparks from '../components/Sparks.jsx'
import Button from '../components/Button.jsx'
import QuizBar from './quiz/QuizBar.jsx'
import Question from './quiz/Question.jsx'
import Intro, { RematchBreak } from './quiz/Intro.jsx'
import Results from './quiz/Results.jsx'

// The quiz (#16). Routes: #/review (everything due), #/review/deck/<id>, #/review/rematch.
// Flow: intro → questions → rematch round (the ones you missed) → results.
//
// The browser never knows the right answer in advance. The server (api.js) builds
// the session and shuffles the options; each pick is sent with api.submitAnswer,
// and the response says right/wrong, which option was correct, the explanation,
// the XP and the card's new memory state. The level-up waits for the results screen.

const SWIPE = {
  enter: { opacity: 0, transform: 'translateX(56px)', filter: 'blur(6px)' },
  center: { opacity: 1, transform: 'translateX(0px)', filter: 'blur(0px)' },
  exit: { opacity: 0, transform: 'translateX(-56px)', filter: 'blur(6px)' },
}

// Waits for the dashboard data, asks the server for a session, then runs it.
export default function Quiz({ kind = 'due', id }) {
  const { rawData, data } = useGame()
  const [loaded, setLoaded] = useState(null) // { session } or { error }

  useEffect(() => {
    let live = true
    startSession({ kind, deckId: id })
      .then((session) => live && setLoaded({ session }))
      .catch((error) => live && setLoaded({ error: error.message }))
    return () => {
      live = false
    }
  }, [kind, id])

  if (loaded?.error) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-16 sm:px-6">
        <h1 className="text-[32px] font-semibold tracking-tight">Couldn’t start the quiz</h1>
        <p className="mt-2 text-muted">{loaded.error}</p>
        <Button as="a" href="#/" variant="secondary" className="mt-6">
          Back to dashboard
        </Button>
      </div>
    )
  }
  if (!rawData || !data || !loaded) return <div className="min-h-dvh" aria-busy="true" aria-label="Loading quiz" />
  return <QuizRun initialSession={loaded.session} />
}

function QuizRun({ initialSession }) {
  const game = useGame()
  const { rawData, data, applyAnswer, holdCelebrations, updateSettings, reportCard, showToast } = game
  const reduce = useReducedMotion()

  const [session, setSession] = useState(initialSession)
  const [phase, setPhase] = useState('intro') // intro | play | rematch-break | results
  const [mode, setMode] = useState(() => (initialSession.items.some((i) => i.options) ? 'mc' : 'flash'))
  const [queue, setQueue] = useState(initialSession.items)
  const [index, setIndex] = useState(0)
  const [round, setRound] = useState('main') // main | rematch
  const [pending, setPending] = useState(null) // { chosen } while the server grades
  const [answered, setAnswered] = useState(null) // { chosen, correct, result }
  const [log, setLog] = useState([])
  const [missed, setMissed] = useState([])
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [effects, setEffects] = useState({ sparks: null, flash: null, comboTier: null })
  const [startStreak, setStartStreak] = useState(data.user.streak) // to spot "lit today!" on the results
  const shownAt = useRef(0) // when the current question appeared (for the answer log)

  // Hold the level-up until results; release it a moment after the results reveal.
  useEffect(() => {
    holdCelebrations(true)
    return () => holdCelebrations(false)
  }, [holdCelebrations])
  useEffect(() => {
    if (phase !== 'results') return
    const t = setTimeout(() => holdCelebrations(false), 2400)
    return () => clearTimeout(t)
  }, [phase, holdCelebrations])

  useEffect(() => {
    shownAt.current = Date.now()
  }, [index, round, phase])

  const item = queue[index]
  const liveCard = item && rawData?.cards.find((c) => c.id === item.card.id)
  const deck = item && data?.decks.find((d) => d.id === item.card.deckId)
  const flash = mode === 'flash' || !item?.options

  // Send the pick to the server and react to its verdict.
  // Multiple choice: { chosen: optionIndex }. Flashcards: { selfGrade: 'got' | 'missed' }.
  const answer = useCallback(
    async ({ chosen = null, selfGrade = null, origin = null }) => {
      if (answered || pending || !item) return
      setPending({ chosen })
      let result
      try {
        result = await submitAnswer(session.sessionId, {
          cardId: item.card.id,
          chosenIndex: selfGrade ? null : chosen,
          selfGrade,
          mode: flash ? 'flash' : 'mc',
          timeTakenMs: Date.now() - shownAt.current,
        })
      } catch (error) {
        showToast({ kind: 'info', message: `Couldn’t check that answer: ${error.message}` })
        return
      } finally {
        setPending(null)
      }

      applyAnswer(result)
      const { correct } = result
      setAnswered({ chosen, correct, result })
      setBestCombo((b) => Math.max(b, result.combo))
      setLog((l) => [
        ...l,
        { card: item.card, correct, round, xp: result.xp, reason: result.reason, masteryBefore: result.masteryBefore, masteryAfter: result.masteryAfter },
      ])
      if (!correct && round === 'main') setMissed((m) => [...m, item])

      // Sound, vibration and light
      const tierUp = correct && comboMultiplier(result.combo) > comboMultiplier(combo)
      setCombo(result.combo)
      play(correct ? 'correct' : 'wrong', { combo: result.combo })
      buzz(correct ? 'correct' : 'wrong')
      setEffects({
        sparks: correct && origin && !reduce ? { ...origin, key: Date.now() } : null,
        flash: { kind: correct ? 'right' : 'wrong', key: Date.now() },
        comboTier: tierUp ? { mult: comboMultiplier(result.combo), key: Date.now() } : null,
      })
      if (tierUp) {
        setTimeout(() => {
          play('combo')
          buzz('combo')
        }, 180)
      }
    },
    [answered, pending, item, session.sessionId, flash, showToast, applyAnswer, round, combo, reduce],
  )

  const reveal = useCallback(() => revealAnswer(session.sessionId, item.card.id), [session.sessionId, item])

  const next = useCallback(() => {
    setAnswered(null)
    if (index + 1 < queue.length) {
      setIndex((i) => i + 1)
      return
    }
    if (round === 'main' && missed.length) setPhase('rematch-break')
    else setPhase('results')
  }, [index, queue.length, round, missed.length])

  // Keyboard: 1–4 or A–D to answer; Enter to continue.
  useEffect(() => {
    if (phase !== 'play') return
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (answered) {
        if (e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') next()
        return
      }
      if (flash) return
      const i = ['1', '2', '3', '4'].indexOf(e.key) >= 0 ? Number(e.key) - 1 : ['a', 'b', 'c', 'd'].indexOf(e.key.toLowerCase())
      if (i >= 0 && i < item.options.length) answer({ chosen: i })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, answered, flash, item, answer, next])

  // The rematch round: the cards you missed, options reshuffled by the server.
  async function startRematch() {
    try {
      const items = await rematchItems(session.sessionId, missed.map((i) => i.card.id))
      setQueue(items)
      setIndex(0)
      setRound('rematch')
      setCombo(0)
      setAnswered(null)
      setPhase('play')
    } catch (error) {
      showToast({ kind: 'info', message: error.message })
      setPhase('results')
    }
  }

  // "Rematch N missed" on the results screen: a new practice session of those cards.
  async function rematchFromResults() {
    const ids = log.filter((l) => l.round === 'main' && !l.correct).map((l) => l.card.id)
    try {
      const fresh = await startSession({ kind: 'rematch', cardIds: ids })
      setSession({ ...fresh, title: 'Rematch' })
      setLog([])
      setMissed([])
      setBestCombo(0)
      setQueue(fresh.items)
      setIndex(0)
      setRound('main')
      setCombo(0)
      setAnswered(null)
      setStartStreak(data.user.streak)
      holdCelebrations(true)
      setPhase('play')
    } catch (error) {
      showToast({ kind: 'info', message: error.message })
    }
  }

  function endSession() {
    if (log.length) setPhase('results')
    else navigate('/')
  }

  async function report() {
    try {
      await reportCard(item.card.id)
      showToast({ kind: 'info', message: 'Thanks. This question is flagged for a closer look.' })
    } catch (error) {
      showToast({ kind: 'info', message: error.message })
    }
  }

  const weakCount = useMemo(() => rawData?.cards.filter(isWeak).length ?? 0, [rawData])
  const sound = Boolean(data?.settings?.sound)
  const toggleSound = () => {
    updateSettings({ sound: !sound })
    if (!sound) play('tap', { force: true })
  }

  return (
    <div className="min-h-dvh">
      {(phase === 'play' || phase === 'rematch-break') && (
        <QuizBar
          done={index + (answered ? 1 : 0)}
          total={queue.length}
          combo={combo}
          sessionXp={log.reduce((s, l) => s + l.xp, 0)}
          sound={sound}
          onToggleSound={toggleSound}
          onClose={endSession}
          roundLabel={round === 'rematch' ? 'Rematch round' : session.title}
        />
      )}
      {phase === 'intro' && <IntroBar sound={sound} onToggleSound={toggleSound} />}

      {phase === 'intro' && (
        <Intro session={session} decks={data.decks} mode={mode} onMode={setMode} onStart={() => setPhase('play')} weakCount={weakCount} />
      )}

      {phase === 'play' && item && liveCard && (
        <div className="mx-auto max-w-3xl px-4 pt-6 pb-24 sm:px-6 sm:pt-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${round}-${index}`}
              variants={reduce ? undefined : SWIPE}
              initial={reduce ? { opacity: 0 } : 'enter'}
              animate={reduce ? { opacity: 1 } : 'center'}
              exit={reduce ? { opacity: 0 } : 'exit'}
              transition={{ duration: 0.45, ease: EASE_CINEMA }}
            >
              <Question
                item={item}
                deck={deck}
                flash={flash}
                pending={pending}
                answered={answered}
                onAnswer={answer}
                onReveal={reveal}
                onNext={next}
                onReport={report}
                reported={data.reported?.includes(item.card.id)}
                practice={session.practice}
                liveCard={liveCard}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {phase === 'rematch-break' && (
        <RematchBreak count={missed.length} practice={session.practice} onStart={startRematch} onSkip={() => setPhase('results')} />
      )}

      {phase === 'results' && (
        <Results
          log={log}
          bestCombo={bestCombo}
          decks={data.decks}
          streak={data.user.streak}
          streakLitNow={!startStreak.studiedToday && data.user.streak.studiedToday}
          onRematch={rematchFromResults}
        />
      )}

      <Effects effects={effects} />
    </div>
  )
}

function IntroBar({ sound, onToggleSound }) {
  return (
    <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
      <a href="#/" className="flex items-center gap-2 rounded-full px-2 py-1 text-sm text-muted transition-colors duration-150 hover:text-text">
        ← Back
      </a>
      <button
        type="button"
        onClick={onToggleSound}
        aria-pressed={sound}
        className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-muted transition-[color,border-color,scale] duration-150 hover:text-text active:scale-[0.97] aria-pressed:border-accent/50 aria-pressed:text-text"
      >
        Sound {sound ? 'on' : 'off'}
      </button>
    </div>
  )
}

// Screen-wide reactions: sparks from the right answer, a coloured edge flash,
// and the "COMBO ×2" title card when you reach a new combo tier.
const SPARK_COLOURS = ['#2fb67c', '#ffc23d', '#ffffff', '#14c2d0']

function Effects({ effects }) {
  // Remember which burst has finished, so its canvas is removed.
  const [finished, setFinished] = useState(null)
  const sparks = effects.sparks && effects.sparks.key !== finished ? effects.sparks : null

  return (
    <>
      {sparks && (
        <Sparks
          key={sparks.key}
          x={sparks.x}
          y={sparks.y}
          count={32}
          power={0.8}
          colours={SPARK_COLOURS}
          onDone={() => setFinished(sparks.key)}
        />
      )}
      <AnimatePresence>
        {effects.flash && (
          <motion.div
            key={effects.flash.key}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-40"
            style={{
              boxShadow: `inset 0 0 140px -20px ${effects.flash.kind === 'right' ? 'var(--color-success)' : 'var(--color-error)'}`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, effects.flash.kind === 'right' ? 0.9 : 0.6, 0] }}
            transition={{ duration: 0.9, times: [0, 0.2, 1] }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {effects.comboTier && <ComboTitle key={effects.comboTier.key} mult={effects.comboTier.mult} />}
      </AnimatePresence>
    </>
  )
}

function ComboTitle({ mult }) {
  const reduce = useReducedMotion()
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1100)
    return () => clearTimeout(t)
  }, [])
  if (!visible) return null
  return (
    <motion.div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[22vh] z-50 flex justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
    >
      <motion.p
        className="num bg-[linear-gradient(90deg,var(--color-accent),var(--color-sun))] bg-clip-text text-6xl font-bold tracking-tight text-transparent [filter:drop-shadow(0_0_24px_color-mix(in_oklab,var(--color-accent)_70%,transparent))] sm:text-8xl"
        initial={reduce ? false : { transform: 'scale(0.6) rotate(-4deg)', opacity: 0 }}
        animate={reduce ? { opacity: 1 } : { transform: ['scale(0.6) rotate(-4deg)', 'scale(1.12) rotate(1deg)', 'scale(1) rotate(0deg)'], opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
      >
        Combo ×{mult}
      </motion.p>
    </motion.div>
  )
}
