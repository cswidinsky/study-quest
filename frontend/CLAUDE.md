# StudyQuest frontend

StudyQuest is a gamified study app built by a uni team in a sprint. Users upload notes, get
AI-generated quizzes, earn XP, level up, and review with spaced repetition. This folder is the
frontend. The owner of this folder works on frontend and design. A teammate owns the Python Flask
backend in `backend/`.

## Rules for every session

- **Only touch files inside `frontend/`.** Never edit `backend/` or anything at the repo root.
- **No git writes.** Do not commit, push, or switch branches. The user does git themselves.
- **Teach as you go.** The user is here to learn. After each step, explain in plain, short language
  what you did, why, and how it works. No jargon dumps.
- **Use the `design-taste-frontend` and `emil-design-eng` skills** for any UI or animation work.
  StudyQuest screens are app screens, so follow `design-taste-frontend`'s app-screen guidance
  (`references/app-screens.md`), not its landing-page run.

## Stack

- Vite + React 19, JavaScript (`.jsx`), linted with oxlint (`npm run lint`)
- Tailwind CSS v4 via `@tailwindcss/vite`. There is no `tailwind.config.js`; all config lives in
  `src/index.css` (`@theme`, `@custom-variant`, `@utility`).
- Motion (`motion` package, import from `motion/react`) for animation
- Later: Supabase (data and auth), deployed on Vercel

## Design tokens

Defined in `src/index.css`. Use the Tailwind classes, never raw hex values. Tailwind's default
palette is switched off (`--color-*: initial`), so classes like `bg-blue-500` do not exist.

| Token | Class example | Light | Dark |
| --- | --- | --- | --- |
| background | `bg-background` | #F7F5F0 | #0F1012 |
| surface | `bg-surface` | #FFFFFF | #17181B |
| text | `text-text` | #16161A | #F2F0EA |
| muted | `text-muted` | #6B6A66 | #8E8C86 |
| border | `border-border` | #E6E2D9 | #26272B |
| accent | `bg-accent` | #FF6B2C | same |
| success | `bg-success` | #2FB67C | same |
| error | `bg-error` | #E5484D | same |

Derived helpers: `accent-hover` (accent mixed 12% toward black), `on-accent` (#16161A, the text
colour on accent fills), `accent-soft` (accent at 12%, for tints like the drop zone and avatar) and
`flame-core` (the light inner flame).

Colour rules:
- **Accent** is for XP and primary buttons. Text on accent is `text-on-accent` (dark), because white
  on #FF6B2C fails contrast.
- **Accent, success and error are fills** (bars, dots, buttons), not small text on the light
  background, where they are too faint to read. Keep running text in `text-text` or `text-muted`.
- Surfaces are separated by a tone step or a 1px `border-border`, not by shadows or gradients.

## Fonts

- **Geist** for all UI text (`font-sans`, the default)
- **Geist Mono** for numbers: XP, scores, timers. Use the `num` class (mono and equal-width digits).
- Both are loaded from Google Fonts in `index.html`.

## Dark mode

- `<html data-theme="light|dark">` decides the theme. The inline script in `index.html` sets it
  before first paint: saved choice if there is one, otherwise the system setting.
- `src/theme.js` exports `useTheme()`, which returns `[choice, setChoice]` where choice is
  `'system' | 'light' | 'dark'`. Only `light` and `dark` are saved in localStorage (key `theme`);
  `system` follows the OS live.
- Dark colour values live in `:root[data-theme="dark"]` in `index.css`. Tokens switch on their own,
  so components rarely need `dark:` classes (the variant exists and follows `data-theme`).
- The toggle is `src/components/ThemeToggle.jsx` (System / Light / Dark).

## Motion

Follow `emil-design-eng`. In short:
- Small and purposeful. UI animations stay under 300ms; ease-out for things entering.
- Easing tokens: `ease-out` (cubic-bezier(0.23, 1, 0.32, 1)), `ease-in-out`, `ease-drawer`. In
  Motion code use the same curve as an array: `[0.23, 1, 0.32, 1]`.
- Animate only `transform` and `opacity`. In Motion, use the full `transform` string
  (`transform: 'translateY(8px)'`) rather than `x`/`y` shorthands, so it runs on the GPU.
- Buttons scale to 0.97 on press (`active:scale-[0.97]`). Never animate from `scale(0)`.
- Name exact properties in transitions (`transition-[background-color,transform]`), never `all`.
- Respect reduced motion (`useReducedMotion()`): keep fades, drop movement.
- Tailwind v4's `hover:` already only applies on devices that can hover.

## Data

- **All mock data lives in `src/mocks/data.js`**, shaped like real API responses. Only
  `src/api.js` imports it. To connect the Flask backend, replace the bodies of the functions in
  `src/api.js` (each has a `TODO(backend)` naming its endpoint) and delete the mocks.
- Totals (cards due, accuracy, streak days) are computed from the rows, never stored twice.
- Levels come from total XP via `src/lib/levels.js` (level n starts at 50 × n × (n − 1) XP).
  The backend should use the same formula. XP rewards live in `XP_REWARDS` there.
- Use real-sounding content (real course names, real questions). No lorem ipsum, no "User 1".

## App structure

- `src/App.jsx`: providers, routes, toasts, level-up dialog
- `src/lib/router.js`: tiny hash router (`#/` home, `#/new` new deck)
- `src/state/game.js` (context, reducer, `useGame()`) and `src/state/GameProvider.jsx`: dashboard
  data, XP, streak, toasts, level-ups. `addDeck(deck)` awards XP, lights the streak, queues toasts
  and the level-up.
- `src/components/shell/`: `AppShell` (sidebar on desktop, top bar + bottom menu sheet below
  1024px), `PlayerCard` (level, XP, streak), `nav.js` (screens list)
- `src/components/`: `Button`, `Field`, `icons`, `XpBar`, `StreakFlame`, `Toaster`, `LevelUpDialog`,
  `ThemeToggle`
- `src/screens/Dashboard.jsx`: home. `src/screens/CreateDeck.jsx` + `src/screens/create/`: upload
  a PDF or write a deck by hand (issue #15)
- **Not built on purpose:** the quiz/review screen (a teammate may own it). "Start review" shows a
  toast for now.

## Layout rules (from the design skill's app-screen guidance)

- Style: "Editorial greeting". Tinted frame (`bg-background`) with the page on a white sheet
  (`bg-surface`, 20px radius, inset 8px) on desktop.
- Screens use a centred 1,100px column on a 12-column grid with 16px gaps. Rows share column lines.
- Panels on the sheet are `bg-background`, radius 16 (`rounded-2xl`). Rows and cards inside them
  are `bg-surface` with a 1px `border-border`, radius 12.
- Page title (h1) 24–28px. Figures at 28px (the screen's answer figure may go to 40px). Nothing
  bigger outside the level-up moment.
- One primary (accent) button per screen. Accent otherwise only on XP, today's data and the flame.
- No entrance animations on screens. Motion is feedback (press, hover, a sheet opening) and the
  reward moments: XP toast, streak flame lighting, level-up.
- `text-xs` is 13px in this project (set in `@theme`). Nothing under 11px.
- Every block has an empty, loading and error state.
- Design-skill working files go in `.taste-skill/` (gitignored).

## Files

- `src/index.css`: tokens, dark values, base styles, `num` utility, flame flicker
- `src/theme.js`: theme choice hook
