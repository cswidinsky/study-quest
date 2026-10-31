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
- Later: Supabase (data and auth), deployed on Vercel

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

## Data

- **All mock data lives in `src/mocks/data.js`**, shaped like real API responses. Only
  `src/api.js` imports it. To connect the backend, replace the bodies of the functions in
  `src/api.js` (each has a `TODO(backend)` naming its endpoint) and delete the mocks.
- Totals (cards due, accuracy, mastered) are computed from the rows, never stored twice.
- Levels come from total XP via `src/lib/levels.js` (level n starts at 50 × n × (n − 1) XP).
- Use real-sounding content (real course names, real questions). No lorem ipsum.

## App structure

- `src/App.jsx`: providers, ambient layer, routes (`home`, `new`, `deck`), toasts, level-up
- `src/state/`: `game.js` (reducer, `useGame()`), `GameProvider.jsx`. `addDeck(deck)` awards XP,
  lights the streak, queues toasts, triggers level-up and marks the deck as "landed".
- `src/components/shell/`: `AppShell` (floating sidebar, XP HUD, phone bar, springy menu sheet),
  `PlayerCard`, `Logo`, `nav.js`
- `src/components/`: `Ambient`, `Button` (`primary`, `deck`, `secondary`, `ghost`), `CountUp`,
  `FillBar`, `Field`, `icons`, `LevelBadge`, `LevelUpDialog`, `StreakFlame`, `ThemeToggle`,
  `TiltCard`, `Toaster`, `XpBar`
- `src/screens/`: `Dashboard`, `DeckPage` (one deck, sample cards), `CreateDeck` + `create/`
  (PDF flow, manual form, deck ready, reward panel, recent uploads)
- **Not built on purpose:** the quiz/review screen (a teammate may own it). "Start review" shows a
  toast for now.

## Layout

- Centred 1,100px column, 12-column grid, 16px gaps. Panels `rounded-3xl`, cards `rounded-[20px]`.
- One primary (tangerine) action per screen; the deck page uses the deck's colour instead.
- Every block has empty, loading and error states.
- Design-skill working files go in `.taste-skill/` (gitignored).
