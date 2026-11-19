// Turn what was typed in the Course field into a course object,
// reusing an existing course when the name or code matches.
export function toCourse(text, decks) {
  const typed = text.trim().toLowerCase()
  const match = decks.find(
    (d) => d.course.name.toLowerCase() === typed || d.course.code.toLowerCase() === typed,
  )
  if (match) return match.course
  return { code: '', name: text.trim() || 'No course' }
}

// Guess a deck name and course from a file name, so most uploads need no typing.
// "BIOL2010_Week7_Membrane_Transport.pdf" → course "Cell Biology" (BIOL 2010 is
// already in your decks), name "Membrane Transport".
const COURSE_CODE = /^([A-Za-z]{3,4})[\s_-]?(\d{4})/
const FILLER = /^(week|wk|lecture|lec|ch|chapter|unit|part|slides?|notes?)\d*$/i

export function suggestFromFile(fileName, decks) {
  let rest = fileName.replace(/\.pdf$/i, '')
  let course = ''
  const match = rest.match(COURSE_CODE)
  if (match) {
    const code = `${match[1].toUpperCase()} ${match[2]}`
    course = decks.find((d) => d.course.code === code)?.course.name ?? code
    rest = rest.slice(match[0].length)
  }
  const words = rest.split(/[_\-\s]+/).filter((w) => w && !FILLER.test(w))
  const title = words.join(' ') || fileName.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ')
  return { title: title.trim(), course }
}

// Unique courses from the user's decks, for the Course field's suggestions.
export function courseOptions(decks) {
  const seen = new Map()
  for (const d of decks) seen.set(d.course.name, d.course)
  return [...seen.values()]
}
