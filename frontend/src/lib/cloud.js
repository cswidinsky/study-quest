// The signed-in user's REAL data, kept in Supabase (see supabase/schema.sql).
//
// openCloudWorld() loads everything the user owns (profile, progress, decks, cards) into
// one in-memory `db`, in the shape the progress server (src/mocks/server.js) works on.
// After every change the server calls save(); we wait a moment, work out which rows
// changed since the last successful sync, and write only those. Row Level Security
// guarantees every read and write touches this user's rows only. Nothing is cached in
// the browser: a reload (or another device) reads it all fresh from Supabase.

import { supabase } from './supabase.js'
import { levelForXp } from './levels.js'

const PAGE = 1000 // Supabase returns at most 1,000 rows per request
const CHUNK = 400 // rows per write
const DIFFICULTIES = new Set(['easy', 'medium', 'hard'])

// A Supabase error, as a sentence a student can act on. The technical details go to the
// console for us (e.g. a missing table means supabase/schema.sql hasn't been run).
export function friendlyDbError(error) {
  const code = error?.code ?? ''
  const message = String(error?.message ?? '')
  console.warn('Supabase error', code, message)
  if (code === 'PGRST301' || code === 'PGRST303' || /jwt/i.test(message)) {
    return new Error('Your session has expired. Log out and log in again.')
  }
  if (/fetch|network|load failed/i.test(message)) {
    return new Error('Couldn’t reach StudyQuest. Check your internet connection and try again.')
  }
  return new Error('Your progress couldn’t be saved or loaded right now. Try again in a moment.')
}

async function must(request) {
  const { data, error } = await request
  if (error) throw friendlyDbError(error)
  return data
}

async function selectAll(table, userId, order) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    let query = supabase.from(table).select('*').eq('user_id', userId)
    for (const [column, ascending] of order) query = query.order(column, { ascending })
    const page = await must(query.range(from, from + PAGE - 1))
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}

/* ——— Rows ⇄ app objects ——— */

const deckRow = (userId, d) => ({
  user_id: userId,
  id: d.id,
  title: String(d.title ?? 'Untitled deck').slice(0, 200),
  course: d.course ?? null,
  color: d.color ?? null,
  exam: d.exam ?? null,
  source: d.source ?? null,
  created_at: d.createdAt ?? new Date().toISOString(),
  last_studied_at: d.lastStudiedAt ?? null,
})

const rowToDeck = (r) => ({
  id: r.id,
  title: r.title,
  course: r.course ?? { code: '', name: 'My course' },
  color: r.color ?? 'tangerine',
  exam: r.exam ?? null,
  source: r.source ?? null,
  createdAt: r.created_at,
  lastStudiedAt: r.last_studied_at,
})

const cardRow = (userId, c, position) => {
  const difficulty = typeof c.difficulty === 'string' ? c.difficulty.toLowerCase() : null
  return {
    user_id: userId,
    id: c.id,
    deck_id: c.deckId,
    position,
    type: c.type === 'flash' ? 'flash' : 'mc',
    question: c.question,
    options: c.options ?? null,
    correct_index: Number.isInteger(c.correctIndex) ? c.correctIndex : null,
    answer: c.answer ?? null,
    explanation: c.explanation ?? null,
    difficulty: DIFFICULTIES.has(difficulty) ? difficulty : null,
    topic: c.topic ?? null,
    source_snippet: c.sourceSnippet ?? null,
    source_page: Number.isInteger(c.sourcePage) ? c.sourcePage : null,
    remote: c.remote ?? null,
    review: c.review,
  }
}

const rowToCard = (r) => ({
  id: r.id,
  deckId: r.deck_id,
  type: r.type,
  question: r.question,
  options: r.options,
  correctIndex: r.correct_index,
  answer: r.answer,
  explanation: r.explanation,
  difficulty: r.difficulty,
  topic: r.topic,
  sourceSnippet: r.source_snippet,
  sourcePage: r.source_page,
  remote: r.remote,
  review: r.review,
})

const progressRow = (userId, db) => ({
  user_id: userId,
  xp: db.user.xp.total,
  level: levelForXp(db.user.xp.total),
  streak_current: db.user.streak.current,
  streak_longest: db.user.streak.longest,
  last_study_date: db.user.streak.lastStudyDate ?? null,
  activity: db.activity,
  reported: db.reported ?? [],
})

// Every row as JSON text, so "did it change?" is one string comparison.
function snapshot(userId, db) {
  return {
    progress: JSON.stringify(progressRow(userId, db)),
    decks: new Map(db.decks.map((d) => [d.id, JSON.stringify(deckRow(userId, d))])),
    cards: new Map(db.cards.map((c, i) => [c.id, JSON.stringify(cardRow(userId, c, i))])),
  }
}

const changed = (now, before) => [...now].filter(([id, json]) => before.get(id) !== json).map(([, json]) => JSON.parse(json))
const removed = (now, before) => [...before.keys()].filter((id) => !now.has(id))
const chunks = (list) => Array.from({ length: Math.ceil(list.length / CHUNK) }, (_, i) => list.slice(i * CHUNK, (i + 1) * CHUNK))

/* ——— Load ——— */

async function loadDb(user) {
  const userId = user.id
  const [progressRows, decks, cards] = await Promise.all([
    must(supabase.from('user_progress').select('*').eq('user_id', userId).limit(1)),
    selectAll('decks', userId, [['created_at', false]]),
    selectAll('cards', userId, [['position', true]]),
  ])
  let progress = progressRows[0]
  if (!progress) {
    // Accounts made before schema.sql ran: start them at zero.
    progress = await must(supabase.from('user_progress').upsert({ user_id: userId }, { onConflict: 'user_id' }).select().single())
  }
  return {
    user: {
      id: userId,
      firstName: '', // filled in from the profile (AuthProvider)
      lastName: '',
      joinedAt: user.created_at ?? null,
      xp: { total: progress.xp ?? 0 },
      streak: {
        current: progress.streak_current ?? 0,
        longest: progress.streak_longest ?? 0,
        lastStudyDate: progress.last_study_date ?? null,
      },
    },
    activity: Array.isArray(progress.activity) ? progress.activity : [],
    decks: decks.map(rowToDeck),
    cards: cards.map(rowToCard),
    reported: progress.reported ?? [],
  }
}

/* ——— The world ——— */

export async function openCloudWorld(user, { onError } = {}) {
  const userId = user.id
  const db = await loadDb(user)
  let synced = snapshot(userId, db)
  let logs = [] // answers waiting to be written to the reviews table
  let timer = null
  let queue = Promise.resolve()
  let failures = 0

  async function sync() {
    const now = snapshot(userId, db)
    const pendingLogs = logs
    logs = []
    try {
      // Decks before cards (cards point at their deck), deletions last.
      for (const rows of chunks(changed(now.decks, synced.decks))) {
        await must(supabase.from('decks').upsert(rows, { onConflict: 'user_id,id' }))
      }
      for (const rows of chunks(changed(now.cards, synced.cards))) {
        await must(supabase.from('cards').upsert(rows, { onConflict: 'user_id,id' }))
      }
      if (now.progress !== synced.progress) {
        await must(supabase.from('user_progress').upsert(JSON.parse(now.progress), { onConflict: 'user_id' }))
      }
      if (pendingLogs.length) {
        await must(
          supabase.from('reviews').insert(
            pendingLogs.map((a) => ({
              user_id: userId,
              card_id: a.cardId,
              deck_id: a.deckId,
              correct: a.correct,
              chosen_index: a.chosenIndex,
              self_grade: a.selfGrade,
              xp: a.xp,
              combo: a.combo,
              answered_at: a.answeredAt,
            })),
          ),
        )
      }
      const goneCards = removed(now.cards, synced.cards)
      if (goneCards.length) await must(supabase.from('cards').delete().eq('user_id', userId).in('id', goneCards))
      const goneDecks = removed(now.decks, synced.decks)
      if (goneDecks.length) await must(supabase.from('decks').delete().eq('user_id', userId).in('id', goneDecks))

      synced = now
      failures = 0
    } catch (error) {
      // Keep the answers and try again shortly (changed rows are found again by the diff).
      logs = [...pendingLogs, ...logs]
      failures += 1
      if (failures === 1) onError?.(error)
      schedule(Math.min(30_000, 2_000 * 2 ** failures))
    }
  }

  function flush() {
    clearTimeout(timer)
    timer = null
    queue = queue.then(sync)
    return queue
  }

  function schedule(ms = 300) {
    clearTimeout(timer)
    timer = setTimeout(flush, ms)
  }

  // Leaving the tab: write now rather than in 300 ms.
  const onHide = () => document.visibilityState === 'hidden' && timer && flush()
  document.addEventListener('visibilitychange', onHide)

  return {
    db,
    save: () => schedule(),
    log: (answer) => {
      logs.push(answer)
      schedule()
    },
    flush,
    close: () => {
      document.removeEventListener('visibilitychange', onHide)
      if (timer) flush()
    },
  }
}
