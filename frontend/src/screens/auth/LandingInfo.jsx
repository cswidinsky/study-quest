import { motion } from 'motion/react'
import { stagger, useRise } from '../../lib/motion.js'
import { BoltIcon, PlusIcon, QuoteIcon, UploadIcon } from '../../components/icons.jsx'

// Below the welcome + sign-up: what StudyQuest is, in plain text search engines can read
// (the first screen is mostly a form, which says little about the app). A short "how it works"
// and a small FAQ. Native <details> keep every answer in the page, even when collapsed.

const FEATURES = [
  {
    Icon: UploadIcon,
    title: 'Upload a lecture PDF',
    text: 'Drop in your slides or notes. StudyQuest reads every page and writes multiple-choice questions from your own material, not from the internet.',
  },
  {
    Icon: QuoteIcon,
    title: 'See why, from your notes',
    text: 'Every answer comes with an explanation and the exact line from your PDF, with the page it’s on, so you learn from the source you’ll be tested on.',
  },
  {
    Icon: BoltIcon,
    title: 'Earn XP, keep your streak',
    text: 'Right answers earn XP and combos multiply it. Missed questions come back in a rematch round, and again right before you’d forget them.',
  },
]

const FAQ = [
  {
    q: 'What is StudyQuest?',
    a: 'StudyQuest is a study app that turns your lecture PDFs into quizzes. You answer questions written from your own notes, earn XP, keep a daily streak and level up, while spaced review brings back what you’re about to forget before the exam.',
  },
  {
    q: 'Is StudyQuest free?',
    a: 'Yes. StudyQuest is free to use: create an account with your email and upload your notes.',
  },
  {
    q: 'What files work?',
    a: 'PDFs up to 4 MB that contain real text, like lecture slides exported to PDF or typed notes. One lecture or chapter per upload works best. Scanned photos of pages don’t work yet, because there’s no text in them to read.',
  },
  {
    q: 'How does XP work?',
    a: 'You earn XP for each question you get right the first time. Harder questions are worth more, and three right in a row starts a combo that multiplies your XP, up to three times. Fix a missed question in the rematch round for a small comeback bonus. XP adds up to levels.',
  },
]

export default function LandingInfo() {
  const rise = useRise(14)
  const inView = { initial: 'hidden', whileInView: 'show', viewport: { once: true, margin: '-80px' } }
  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-20 sm:px-8">
      <motion.section aria-labelledby="how-heading" {...inView} variants={stagger(0.07, 0)} className="pt-8">
        <motion.h2 id="how-heading" variants={rise} className="text-[28px] leading-tight font-semibold tracking-tight sm:text-[36px]">
          How StudyQuest works
        </motion.h2>
        <motion.p variants={rise} className="mt-2 max-w-[56ch] text-muted sm:text-lg">
          From a lecture PDF to a quiz in about a minute, then a game that keeps you coming back to it.
        </motion.p>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ Icon, title, text }) => (
            <motion.li key={title} variants={rise} className="panel rounded-3xl p-5 sm:p-6">
              <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent" aria-hidden="true">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </motion.li>
          ))}
        </ul>
      </motion.section>

      <motion.section aria-labelledby="faq-heading" {...inView} variants={stagger(0.06, 0)} className="mt-16 max-w-[760px]">
        <motion.h2 id="faq-heading" variants={rise} className="text-[28px] leading-tight font-semibold tracking-tight sm:text-[36px]">
          Questions
        </motion.h2>
        <motion.div variants={rise} className="panel mt-6 divide-y divide-border rounded-3xl px-5 sm:px-6">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <PlusIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted transition-transform duration-200 ease-out group-open:rotate-45"
                />
              </summary>
              <p className="pb-5 text-sm leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </motion.div>
      </motion.section>
    </div>
  )
}
