import { useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { createDeck } from '../../api.js'
import Button from '../../components/Button.jsx'
import { Field, TextArea, TextInput } from '../../components/Field.jsx'
import { CloseIcon, PlusIcon } from '../../components/icons.jsx'
import { courseOptions, toCourse } from './course.js'

// Write a deck by hand: a name, a course, and question/answer cards.

let cardSeq = 0
const blankCard = () => ({ id: `card-${++cardSeq}`, question: '', answer: '' })

export default function ManualForm({ decks, onDone }) {
  const id = useId()
  const reduceMotion = useReducedMotion()
  const [title, setTitle] = useState('')
  const [course, setCourse] = useState('')
  const [cards, setCards] = useState(() => [blankCard(), blankCard()])
  const [focusId, setFocusId] = useState(null) // the card just added gets focus
  const [saving, setSaving] = useState(false)

  const ready = cards.filter((c) => c.question.trim() && c.answer.trim())
  const canSave = title.trim().length > 0 && ready.length > 0 && !saving

  const updateCard = (cardId, key, value) =>
    setCards((all) => all.map((c) => (c.id === cardId ? { ...c, [key]: value } : c)))

  function addCard() {
    const card = blankCard()
    setCards((all) => [...all, card])
    setFocusId(card.id)
  }

  async function save(e) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    const deck = await createDeck({
      title: title.trim(),
      course: toCourse(course, decks),
      cards: ready.map(({ question, answer }) => ({ question: question.trim(), answer: answer.trim() })),
    })
    onDone(deck)
  }

  return (
    <form onSubmit={save}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Deck name" htmlFor={`${id}-title`}>
          <TextInput
            id={`${id}-title`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Membrane transport"
            required
          />
        </Field>
        <Field label="Course" htmlFor={`${id}-course`}>
          <TextInput
            id={`${id}-course`}
            list={`${id}-courses`}
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            placeholder="e.g. Cell Biology"
            autoComplete="off"
          />
          <datalist id={`${id}-courses`}>
            {courseOptions(decks).map((c) => (
              <option key={c.name} value={c.name}>
                {c.code}
              </option>
            ))}
          </datalist>
        </Field>
      </div>

      <h3 className="mt-7 mb-3 text-sm font-medium">
        Cards <span className="num font-normal text-muted">{cards.length}</span>
      </h3>

      <ul>
        <AnimatePresence initial={false}>
          {cards.map((card, i) => (
            // Height + opacity, so the cards below slide to make room.
            <motion.li
              key={card.id}
              className="overflow-hidden"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, transition: { duration: 0.18 } }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="pb-3">
                <div className="rounded-xl border border-border bg-surface p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs text-muted">
                      Card <span className="num">{i + 1}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCards((all) => all.filter((c) => c.id !== card.id))}
                      disabled={cards.length === 1}
                      aria-label={`Remove card ${i + 1}`}
                      className="-m-1.5 grid size-8 place-items-center rounded-full text-muted transition-[background-color,color,scale] duration-150 ease-out hover:bg-background hover:text-text active:scale-[0.94] disabled:opacity-0"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Question" htmlFor={`${card.id}-q`}>
                      <TextArea
                        id={`${card.id}-q`}
                        rows={2}
                        value={card.question}
                        onChange={(e) => updateCard(card.id, 'question', e.target.value)}
                        placeholder={i === 0 ? 'e.g. What does the Na⁺/K⁺ pump move per ATP?' : undefined}
                        autoFocus={card.id === focusId}
                      />
                    </Field>
                    <Field label="Answer" htmlFor={`${card.id}-a`}>
                      <TextArea
                        id={`${card.id}-a`}
                        rows={2}
                        value={card.answer}
                        onChange={(e) => updateCard(card.id, 'answer', e.target.value)}
                        placeholder={i === 0 ? 'e.g. Three Na⁺ out, two K⁺ in' : undefined}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <Button variant="secondary" onClick={addCard}>
        <PlusIcon />
        Add card
      </Button>

      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button type="submit" size="lg" disabled={!canSave} aria-describedby={`${id}-status`}>
          {saving ? 'Saving…' : 'Save deck'}
        </Button>
        <p id={`${id}-status`} className="text-sm text-muted">
          {!title.trim()
            ? 'Give the deck a name.'
            : ready.length === 0
              ? 'Fill in both sides of at least one card.'
              : (
                <>
                  <span className="num text-text">{ready.length}</span> of{' '}
                  <span className="num">{cards.length}</span> cards ready to save
                </>
              )}
        </p>
      </div>
    </form>
  )
}
