import { motion } from 'motion/react'
import { stagger, useRise } from '../../lib/motion.js'
import { deckStyle } from '../../lib/deck.js'
import { CheckIcon, CloseIcon, QuoteIcon } from '../../components/icons.jsx'

// The marked quiz, question by question: your choice, right or wrong, the correct choice,
// the explanation, and the line from the PDF it came from. Everything comes from the server's
// grading. questions: [{ id, text, choices, chosen, correct, correctIndex, explanation,
// sourcePage, sourceSnippet }]. Missed questions are tinted so they stand out.
export default function AnswerReview({ questions, deck = null, fileName = null }) {
  const rise = useRise(16)
  if (!questions?.length) return null
  const missed = questions.filter((q) => !q.correct).length

  return (
    <motion.section variants={rise} className="panel mt-6 rounded-3xl p-4 sm:p-6" aria-labelledby="review-heading" style={deckStyle(deck)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="review-heading" className="font-semibold">
          Your answers
        </h2>
        <p className="text-sm text-muted">{missed ? `${missed} to look at again` : 'All correct'}</p>
      </div>
      <motion.ol className="mt-4 space-y-3" variants={stagger(0.06, 0.2)} initial="hidden" animate="show">
        {questions.map((q, i) => (
          <motion.li
            key={q.id}
            variants={rise}
            className={`rounded-2xl border p-4 sm:p-5 ${q.correct ? 'border-border bg-surface/60' : 'border-error/35 bg-error/5'}`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${q.correct ? 'bg-success/15 text-success' : 'bg-error/15 text-error'}`}
                aria-hidden="true"
              >
                {q.correct ? <CheckIcon className="size-4" /> : <CloseIcon className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">
                  Question <span className="num">{i + 1}</span> · {q.correct ? 'Correct' : 'Missed'}
                </p>
                <p className="mt-1 font-medium text-balance">{q.text}</p>

                <dl className="mt-3 grid gap-1.5 text-sm">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-muted">Your answer</dt>
                    <dd className={q.correct ? 'font-medium' : 'text-text line-through decoration-error/60'}>
                      {q.chosen != null && q.choices[q.chosen] != null ? q.choices[q.chosen] : 'Not available'}
                    </dd>
                  </div>
                  {!q.correct && q.correctIndex != null && q.choices[q.correctIndex] != null && (
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="text-muted">Correct answer</dt>
                      <dd className="flex items-center gap-1.5 font-medium">
                        <CheckIcon className="size-4 text-success" />
                        {q.choices[q.correctIndex]}
                      </dd>
                    </div>
                  )}
                </dl>

                {q.explanation && <p className="mt-3 text-sm leading-relaxed">{q.explanation}</p>}

                {(q.sourceSnippet || q.sourcePage) && (
                  <figure className="mt-3 rounded-xl bg-background/70 px-3.5 py-3">
                    {q.sourceSnippet && (
                      <blockquote className="flex gap-2 text-sm text-text">
                        <QuoteIcon className="mt-0.5 size-4 shrink-0 text-accent" />
                        <span>{q.sourceSnippet}</span>
                      </blockquote>
                    )}
                    {q.sourcePage && (
                      <figcaption className="mt-1.5 text-xs text-muted">
                        {fileName ? `${fileName}, page ` : 'Page '}
                        <span className="num">{q.sourcePage}</span>
                        {fileName ? '' : ' of your PDF'}
                      </figcaption>
                    )}
                  </figure>
                )}
              </div>
            </div>
          </motion.li>
        ))}
      </motion.ol>
    </motion.section>
  )
}
