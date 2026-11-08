# StudyQuest frontend

StudyQuest is a gamified study app built by a uni team in a sprint. Users upload notes, get
AI-generated quizzes, earn XP, level up, and review with spaced repetition. This folder is the
frontend. The owner of this folder works on frontend and design. A teammate owns the Python Flask
backend in `backend/`.

## Rules for every session

- **Only touch files inside `frontend/`.** Never edit `backend/` or anything at the repo root.
- **No git writes unless asked.** Don't commit, push or switch branches on your own. Run a git
  command only when the user asks for it, and never push.
- **Teach as you go.** The user is here to learn. After each step, explain in plain, short language
  what you did, why, and how it works. No jargon dumps.
- **Use the `design-taste-frontend` and `emil-design-eng` skills** for UI and animation craft.
  The art direction below overrides their restraint rules where they conflict (see "Direction").

## Direction: cinematic and immersive

The app should feel like you're inside it: motion like a video, choreographed and continuous,
with transitions between everything. The user explicitly overrode these skill defaults:
- Screens **do** have staggered entrance animations.
- Gradients, glows and an animated background are **wanted** (tangerine/lagoon light, never
  purple/indigo "AI gradients").

Guardrails that still hold:
- **Animations never block clicks.** Content is interactive from the first frame; the View
  Transition overlay has `pointer-events: none`; dialogs close instantly (Esc, click outside).
- **60fps on a normal laptop.** Animate `transform` and `opacity`. Canvas loops are capped at
  60fps, cap devicePixelRatio at 1.5, and pause when the tab is hidden. No `backdrop-filter`.
- **Reduced motion:** a calm fallback everywhere (fades only, no movement, no smooth scroll, still
  background). `MotionConfig reducedMotion="user"` + `useReducedMotion()` + CSS media query.

## Stack

- Vite + React 19, JavaScript (`.jsx`), linted with oxlint (`npm run lint`)
- Tailwind CSS v4 via `@tailwindcss/vite`. No `tailwind.config.js`; all config is in
  `src/index.css` (`@theme static`, `@custom-variant`, `@utility`).
- Motion (`motion/react`) for animation; Lenis (`lenis`, pinned 1.3.26) for smooth scroll
- View Transitions API for screen changes and the theme switch (falls back to an instant swap)
- No Three.js: the ambient background is CSS + one 2D canvas (cheaper, looks the same here)
- **Backend in dev:** `vite.config.js` proxies `/api/*` to Flask on `http://localhost:5000`, so the
  frontend calls relative URLs like `fetch('/api/extract')` and never hits CORS. A production
  deployment will need its own rewrite or API base URL.
- **Upload limit:** PDFs up to 10 MB (`MAX_MB` in `screens/create/PdfFlow.jsx`), matching the
  backend's 10 MiB `MAX_CONTENT_LENGTH`. Change both together.
- Database and authentication are pending team agreement. The project plan proposes SQLite
  without full authentication for the MVP; Supabase is an alternative, not a settled dependency.
- Deployment target is also pending team agreement; Vercel is an option for the frontend.

## Palette

Defined in `src/index.css` as `@theme static` (so variables used only from JS, like deck colours,
are always emitted). Use the Tailwind classes, never raw hex. Tailwind's default palette is off.

| Token | Class example | Light | Dark |
| --- | --- | --- | --- |
| background | `bg-background` | #FFFAF5 (bright warm white) | #07080C (deep ink) |
| surface | `bg-surface` | #FFFFFF | #11131B |
| panel | `bg-panel` / `panel` utility | white 80% | #131623 at 72% |
| text | `text-text` | #1B1512 | #F5F2EC |
| muted | `text-muted` | #6F6560 | #9C9AAB |
| border | `border-border` | #F0E3D7 | white 9% |
| accent (tangerine, hero) | `bg-accent` | #FF6B2C | same |
| secondary (lagoon) | `bg-secondary` | #14C2D0 | same |
| sun | `bg-sun` | #FFC23D | same |
| success / error | `bg-success` / `bg-error` | #2FB67C / #F04A5C | same |

- **Tangerine + lagoon** is the "teal and orange" film grade: tangerine for XP, primary actions,
  today, the flame; lagoon for supporting data (accuracy, upcoming days) and ambient light.
- **Deck colours:** `--color-deck-{tangerine,lagoon,sun,rose,sky,lime}`. Each deck has
  `deck.color` naming one. `lib/deck.js` → `deckStyle(deck)` sets `--deck`; then use
  `bg-(--deck)`, `glow-deck`, `var(--deck)` on the card, its progress bar and its glow.
- Helpers: `accent-hover`, `accent-soft`, `secondary-soft`, `on-accent` (#1B1512, text on any
  vivid fill: white fails contrast), `flame-core`.
- Utilities: `panel` (translucent surface + border + top highlight), `glow-accent`, `glow-deck`,
  `num` (Geist Mono, tabular digits).
- Vivid colours are fills and glows, not small text on light backgrounds.

## Fonts

- **Geist** for UI (`font-sans`), **Geist Mono** for numbers via `num`. Loaded from Google Fonts.
- `text-xs` is 13px here. Nothing under 11px.

## Theme

- `<html data-theme>` decides it. `index.html` sets it before paint: saved choice, else system.
- `src/theme.js`: `useTheme()` reads it; `toggleTheme({x, y})` flips it with a View Transition whose
  new view grows as a circle from (x, y); `useFollowSystemTheme()` follows the OS until the user
  chooses.
- One button: `ThemeToggle.jsx`, a sun that morphs into a moon (in the sidebar, and the phone bar).

## Motion system

- `src/lib/motion.js`: `EASE_OUT`, `EASE_CINEMA` (long soft settle), `stagger()`, `useRise()`
  (rise + fade, fade only for reduced motion), `useCanHover()`.
- **Screen changes** (`lib/router.js`): every hash change runs in `document.startViewTransition`
  with `data-vt="route"` on `<html>`. The old screen fades back, the new one rises in.
  The background, sidebar, HUD and phone bar have names (`.vt-*` classes) so they stay perfectly
  still. **Shared elements:** add class `vt-shared` + `deckTransitionStyle(deck)` and the element
  morphs into any element with the same name on the next screen (deck card ↔ deck page header ↔
  the "deck ready" card). Never give two visible elements the same name at once.
- **Entrances:** each screen staggers its blocks in; numbers use `CountUp`; bars use `FillBar` /
  `XpBar` (grow from zero once). A card that arrives through a shared transition skips its
  entrance (`lastOpenedDeck()` / `landedDeckId`).
- **Interaction:** `TiltCard` (lean toward cursor, moving light, lift on hover, press on click;
  mouse devices only). Buttons scale to 0.97 on press. Nav pill slides (`layoutId`).
- **Scroll:** Lenis smooth scroll (`lib/smoothScroll.js`, off for reduced motion); parallax on the
  background layers and the dashboard greeting. Use `lockScroll()` for sheets and dialogs.
- **Ambient** (`components/Ambient.jsx`): three drifting light pools (CSS), a particle canvas with
  depth and parallax, film grain.
- **Reward moments:** XP toast + "+50 XP" chip under the HUD; streak flame ignites with a pop and
  keeps breathing; level-up is the most cinematic moment (camera pull-back via
  `html[data-celebrate] .stage`, rays, ring draw, impact flash, shockwaves, spark canvas, text
  rising). Keep it the biggest moment in the app.
- **Upload sequence:** file drops in → absorbed into a turning core that emits key ideas → the
  new deck lands (and later flies into the dashboard grid).

## Ownership

The owner of this folder also owns the quiz screen (#16), XP and leveling (#19), and
gamification (#6, #20).

## XP, mastery and the "server" boundary

- **`src/lib/levels.js` is the single source of truth for XP** (`xpForAnswer`, `XP_RULES`,
  `memoryBonus`, `comboMultiplier`, levels). XP rewards learning only: first-try correct answers on
  due or new cards; more for harder cards and longer memory; combos up to ×3; flashcards ×0.75;
  practice (not due) earns 0; a one-off +3 "comeback" for fixing a card you missed. Creating decks
  earns nothing. **The server must calculate the real XP**; the browser copy is for the demo.
- **`src/lib/srs.js`**: spaced repetition (`schedule`) and per-card mastery levels
  (New → Learning → Familiar → Strong → Mastered by interval: 0 / <3 / 3–9 / 10–20 / 21+ days).
  Also server-owned in production.
- `api.recordAnswer(card, …)` stands in for `POST /api/reviews`: it returns `{ xp, review,
  masteryBefore, masteryAfter }`. Components never compute XP themselves.

## Data

- **All mock data lives in `src/mocks/data.js`**, shaped like real API responses
  (`{ user, activity, decks, cards }`). Only `src/api.js` imports it. Each card has
  `question, options[4], correctIndex, answer, explanation, difficulty, topic, sourceSnippet,
  review`. Hand-written cards have no options (they play as flashcards).
- Every count (due, new, mastery %, accuracy, upcoming, weak spots) is computed from the cards in
  `src/lib/selectors.js`, never stored. `GameProvider` exposes `data` (computed view) and
  `rawData` (the save).
- **Progress persists** in localStorage (`src/lib/storage.js`, key `studyquest:demo:v2`) after
  every change. Settings → "Reset demo" clears it. Bump the key if the save shape changes.
- Use real-sounding content (real course names, real questions). No lorem ipsum.

## App structure

- `src/App.jsx`: providers, ambient layer, routes, toasts, level-up. Routes (`lib/router.js`):
  `#/`, `#/new`, `#/deck/<id>`, `#/review`, `#/review/deck/<id>`, `#/review/rematch`, `#/stats`,
  `#/profile`, `#/settings`. The quiz runs in focus mode (no sidebar).
- `src/state/`: `game.js` (reducer, `useGame()`), `GameProvider.jsx`. Actions: `recordAnswer`,
  `addDeck(deck, cards)`, `updateSettings`, `updateProfile`, `reportCard`, `holdCelebrations`,
  `resetDemo`, toasts. State keys and action names must never share a name (they're merged).
- `src/screens/Quiz.jsx` + `screens/quiz/`: intro → questions (multiple choice or flashcards) →
  rematch round → results. Combo meter, answer feedback with XP breakdown, explanation and the
  source snippet, mastery-up moments, sparks, edge flashes, "Combo ×N" title cards. The level-up
  is held until the results reveal.
- `src/lib/`: `session.js` (builds sessions, shuffles options), `sound.js` (Web Audio, off by
  default), `haptics.js` (Android vibration), plus the files above.
- `src/components/`: `Ambient`, `Button` (`primary`, `deck`, `secondary`, `ghost`), `CountUp`,
  `FillBar`, `Field`, `icons`, `LevelBadge`, `LevelUpDialog`, `MasteryGem`, `Sparks`,
  `StreakFlame`, `Switch`, `ThemeToggle`, `TiltCard`, `Toaster`, `XpBar`, `shell/`
- `src/screens/`: `Dashboard`, `DeckPage`, `CreateDeck` + `create/`, `Quiz` + `quiz/`, `Stats`,
  `Profile`, `Settings`.
- **No dead buttons:** every link and button leads somewhere real with mock data.

## Layout

- Centred 1,100px column, 12-column grid, 16px gaps. Panels `rounded-3xl`, cards `rounded-[20px]`.
- One primary (tangerine) action per screen; the deck page uses the deck's colour instead.
- Every block has empty, loading and error states.
- Design-skill working files go in `.taste-skill/` (gitignored).
