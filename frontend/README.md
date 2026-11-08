# StudyQuest frontend

React, Vite, Tailwind CSS, and Motion. The app runs end to end on mock data: PDF upload,
generated questions, the quiz, results, XP and levels. A mock server in `src/mocks/` stands in
for Flask (it holds the answers and calculates XP) and saves progress in the browser;
`src/api.js` is where each call will switch to the real API. In dev, `/api` is proxied to
Flask on port 5000.

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
to run the app on mock data.

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
