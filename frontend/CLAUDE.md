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
- Database and authentication are pending team agreement. The project plan proposes SQLite
  without full authentication for the MVP; Supabase is an alternative, not a settled dependency.
- Deployment target is also pending team agreement; Vercel is an option for the frontend.

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

Derived helpers: `accent-hover` (accent mixed 12% toward black) and `on-accent` (#16161A, the text
colour on accent fills).

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

## Files

- `src/index.css`: tokens, dark values, base styles, `num` utility
- `src/theme.js`: theme choice hook
- `src/components/ThemeToggle.jsx`, `src/components/XpBar.jsx`
- `src/App.jsx`: placeholder screen that shows the tokens. Not the real UI; replace it.
