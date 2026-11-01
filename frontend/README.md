# StudyQuest frontend

React, Vite, Tailwind CSS, and Motion starter. The current screen demonstrates
theme switching and sample XP; PDF upload, quizzes, and API integration follow later.
XP values are mock data and are not persisted.

## Requirements

Use Node.js 22.12 or newer (Node.js 24 is verified) with npm.

## Install and run

From the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open the development address printed by Vite. No API key or backend is needed
for this placeholder screen.

## Checks and production preview

Run from `frontend/`:

```sh
npm run lint
npm run build
npm run preview
```

There is no automated frontend test suite yet. Check light, dark, and system
themes, plus XP progression with reduced motion enabled and disabled.

Fonts load from Google Fonts, with system font fallbacks when unavailable.
Database, authentication, and deployment choices need team agreement before
implementation; see the project plan rather than assuming Supabase is required.
