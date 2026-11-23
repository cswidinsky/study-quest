# StudyQuest

**Your notes, played as a game.** StudyQuest turns lecture PDFs into multiple-choice quizzes and
makes studying them feel like a game.

**Live:** https://www.studyquest.co

## What it does

1. **Sign up** with your email. Each account has its own decks, XP and streak.
2. **Upload a lecture PDF.** AI writes a quiz of up to five questions from your notes, each one
   checked against the page it quotes.
3. **Answer every question, then submit once.** The server marks the whole quiz.
4. **See your results.** You get your score and, for each question, your answer, the correct
   one, an explanation, and the line from your PDF it came from (with the page number).
5. **Earn XP and keep coming back.** Harder questions and longer memory earn more, combos
   multiply it, and you level up as XP builds. Missed questions come back in a rematch round,
   and spaced reviews bring cards back just before you'd forget them.

**Demo mode** (Settings) opens a sample world with ready-made decks, so you can try everything
without uploading anything. Your real data is untouched and comes back when you switch it off.

## Tech stack

| Part | Built with |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS 4, Motion |
| Accounts and data | Supabase: Auth, Postgres, and Row Level Security (each user sees only their own rows) |
| Backend | Python 3.12, Flask |
| PDF reading | PyMuPDF |
| AI | OpenAI Responses API (`gpt-4.1-mini` by default) |
| Hosting | Vercel: one project, with the frontend at `/` and Flask at `/api` (`vercel.json`) |

## Repository structure

```text
study-quest/
├── frontend/            # React app (Vite)
├── backend/             # Flask API: PDF extraction, AI quiz generation, grading, quiz storage
├── tests/               # Backend tests
├── supabase/
│   ├── schema.sql       # Accounts data: profiles, progress, decks, cards, answer log
│   ├── migrations/      # Quiz storage used by Flask (quizzes, saved results)
│   └── email-templates/ # Branded sign-up, password reset and login-link emails
├── requirements.txt     # Python dependencies
└── vercel.json          # Vercel deployment (two services)
```

## Run it locally

You need **Node.js 22.12+**, **Python 3.12**, a **Supabase** project and an **OpenAI API key**
(with billing). Backend commands run from the repository root; frontend commands run from
`frontend/`.

### 1. Set up Supabase (once)

In your Supabase project, open **SQL Editor → New query**, then paste and **Run** each file:

1. [`supabase/schema.sql`](supabase/schema.sql) creates the account tables. It's safe to run
   again.
2. [`supabase/migrations/20261122000100_quiz_storage.sql`](supabase/migrations/20261122000100_quiz_storage.sql)
   creates the quiz storage tables. Run it once only.

Then, under **Authentication → URL Configuration**, set **Site URL** to `http://localhost:5173`
and add `http://localhost:5173/**` to **Redirect URLs**. The branded email templates are
optional: paste them from `supabase/email-templates/` into **Authentication → Emails →
Templates**.

### 2. Environment variables

Never commit real values. `.env` and `.env.local` are gitignored.

**Frontend:** create `frontend/.env.local` (template: [`frontend/.env.example`](frontend/.env.example)):

```ini
VITE_SUPABASE_URL=        # Supabase → Project Settings → API → Project URL
VITE_SUPABASE_ANON_KEY=   # the publishable (anon) key; it's safe in the browser
```

**Backend (Flask):** create `.env` in the repository root, or set the variables in your terminal:

```ini
LLM_API_KEY=              # OpenAI API key (secret)
LLM_MODEL=                # optional; defaults to gpt-4.1-mini
SUPABASE_URL=             # same Project URL as above
SUPABASE_PUBLISHABLE_KEY= # same publishable key as above
SUPABASE_SECRET_KEY=      # Supabase secret key (server only; never give it a VITE_ prefix)
```

To keep the OpenAI key out of files entirely (Windows PowerShell, this terminal only):

```powershell
$k = Read-Host "OpenAI API key" -AsSecureString
$env:LLM_API_KEY = [System.Net.NetworkCredential]::new('', $k).Password
```

### 3. Start the backend (Flask)

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m flask --app backend.app run --debug
```

Flask runs at `http://127.0.0.1:5000`.

### 4. Start the frontend

In a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. Vite forwards `/api` requests to Flask on port 5000, so the
frontend always calls relative `/api` URLs.

### 5. Checks

```powershell
# Backend tests (repository root; Supabase and OpenAI are mocked, so these are free)
.\.venv\Scripts\python.exe -m unittest discover -s tests -t . -v

# Frontend lint and production build (in frontend/)
npm run lint
npm run build
```

More detail: [backend guide](backend/README.md) · [frontend guide](frontend/README.md).

## Deployment

The live site runs on Vercel as one project with two services, both configured in
[`vercel.json`](vercel.json). The Vite frontend serves `/`. Flask serves `/api/*`, with up to
300 seconds per request for AI generation. Set the environment variables above in the Vercel
project settings, and leave `VITE_API_BASE_URL` unset. PDF uploads are limited to 4 MB,
because Vercel functions accept at most 4.5 MB per request.

## Good to know

- **Best with selectable-text PDFs** (lecture slides and notes). Scanned PDFs (OCR) aren't
  supported yet.
- **Check generated questions.** AI questions are validated for structure and must quote your
  PDF, but they can still be wrong or ambiguous. Use "Report this question" if something's off.
- **Keys stay server-side.** The OpenAI key and the Supabase secret key live only in Flask's
  environment. The browser only ever gets the publishable Supabase key and its own login token.
- **Live AI calls cost money.** Automated tests use mocked responses and are free.

## Team

- **Subhaan Zaffar** ([@SubhaanZaffar](https://github.com/SubhaanZaffar)): frontend, UI/design,
  accounts, Supabase, deployment
- **Connor Swidinsky** ([@cswidinsky](https://github.com/cswidinsky)): Flask backend, PDF
  extraction, AI quiz generation, quiz storage
- **Olohigbe Uantioje** ([@Catsomiac](https://github.com/Catsomiac)): AI quiz generation and
  marking, logo concept

## Contributing

Build each feature on its own branch and open a pull request into `main`. Agree on API changes
between the frontend and backend before connecting them.
