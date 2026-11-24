# Study Quest Backend

Python and Flask backend providing PDF text extraction and hosted LLM
services for quiz generation.

**Run all commands in this guide from the repository root**, not from
inside `backend/`.

## Requirements

- Python 3.12 is verified.
- An OpenAI API project with billing/quota is required for live AI requests.
- A Supabase project is required for authenticated quiz routes.
- No API credentials are required for automated tests or PDF extraction.

## Setup

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

The commands below use the virtual environment's Python directly, so
activation is optional.

## Run Flask

```powershell
.\.venv\Scripts\python.exe -m flask --app backend.app run --debug
```

The development server runs at `http://127.0.0.1:5000` by default.

Debug mode is for local development only.

## HTTP endpoints

### GET /api/health

Returns HTTP 200:

```json
{
  "status": "ok"
}
```

### POST /api/extract

Accepts a PDF through the multipart form field `file`.

Returns HTTP 200:

```json
{
  "text": "--- Page 1 ---\nExtracted lecture text..."
}
```

Behavior:

- Requires an uploaded file with a nonempty filename.
- Uses temporary storage and removes the uploaded file after processing.
- Extracts selectable text and preserves PDF page markers.
- Rejects invalid PDFs and documents without extractable text.
- Does not perform OCR.

### Errors

- Invalid or missing input returns HTTP 400 with an `error` field.
- Requests exceeding 10 MiB return HTTP 413 with an `error` field.
- The size limit applies to the entire request, including multipart overhead.

The extraction endpoint does not call OpenAI or generate a quiz.

### Quiz routes

Send the signed-in user's Supabase access token in the `Authorization: Bearer` header.

| Method and path | Behavior |
| --- | --- |
| `POST /api/quizzes` | Accepts a PDF in the multipart `file` field and returns `201` with `id` and `questions`. |
| `GET /api/quizzes/<id>` | Returns the owner's quiz with public question fields. |
| `POST /api/quizzes/<id>/submit` | Grades and saves the whole quiz. Send `{"answers":{"1":0,"2":1,"3":2,"4":3,"5":0}}` with one zero-based choice index per question ID. |
| `GET /api/quizzes/<id>/result` | Returns the owner's saved result after submission. |

The public question fields are `id`, `text`, `choices`, and `difficulty`.
The submit and saved-result routes return `answers`, `score`, `total`, and
`results`. Each result contains `id`, `correct`, `correct_answer` (the
zero-based index), `explanation`, `sourcePage`, and `sourceSnippet`.
The first valid submission is saved. Later valid submissions for that quiz
return the original result, including the original selections.

Quiz routes return `401` for invalid or missing authentication, `404` for
missing or inaccessible quizzes or results, and `503` when quiz storage is
unavailable. Invalid submissions return `400`. PDFs with insufficient content
return `422`.

## Supabase configuration

Apply [the quiz storage migration](../supabase/migrations/20261122000100_quiz_storage.sql)
to the same hosted Supabase project used by the frontend. The migration creates
two server-only tables. Flask verifies the user with Supabase Auth before
reading or writing rows, and uses the verified user ID for ownership checks.

| Flask environment variable | Value |
| --- | --- |
| `SUPABASE_URL` | Hosted project HTTPS URL |
| `SUPABASE_PUBLISHABLE_KEY` | Project publishable key or legacy anon key |
| `SUPABASE_SECRET_KEY` | Server-only secret key or legacy service-role key |

Set these variables in the Flask environment locally and on the backend host.
Keep `SUPABASE_SECRET_KEY` out of the frontend environment and source control.

## OpenAI configuration

The service reads these process environment variables:

| Variable | Purpose |
| --- | --- |
| `LLM_API_KEY` | Required OpenAI API project key |
| `LLM_MODEL` | Model name; defaults to `gpt-4.1-mini` |

Flask loads `.env` files. The standalone AI check commands read the process
environment.

Configure the current PowerShell session:

```powershell
$llmKey = Read-Host "OpenAI API key" -AsSecureString
$env:LLM_API_KEY = [System.Net.NetworkCredential]::new('', $llmKey).Password
$env:LLM_MODEL = 'gpt-4.1-mini'
```

The key prompt hides the input and avoids recording the literal key in
command history. These variables apply only to the current terminal
session and processes started from it.

Never commit credentials or expose them to the frontend.

OpenAI API usage is billed separately from a ChatGPT subscription.
Confirm model access, pricing, and available quota in your API account.

## Manual AI checks

**Each command in this section makes a paid API request.**

### Check the connection

Send a short synthetic lecture sample:

```powershell
.\.venv\Scripts\python.exe -m backend.check_llm
```

### Summarize a PDF

```powershell
.\.venv\Scripts\python.exe -m backend.check_llm --pdf "C:\path\lecture.pdf"
```

### Generate a quiz

```powershell
.\.venv\Scripts\python.exe -m backend.check_quiz --pdf "C:\path\lecture.pdf" --questions 5
```

The question count defaults to 5 and accepts integers from 1 to 20.
Up to 10 questions come from one OpenAI request; more are written by parallel
requests of at most 10 (20 → 10 + 10, 15 → 8 + 7), each steered to its own run
of pages, then merged, de-duplicated and numbered 1..N.
Use `--questions 20` to check the upper limit with a detailed lecture PDF.

Only send documents you have permission to share with the provider.
Keep private PDFs and generated output out of Git.

## Quiz generation

The generation flow is:

```text
PDF → extracted page-labelled text → OpenAI structured output
    → Python validation → shuffled options → internal quiz JSON
```

Successful results contain a `questions` array. Each question includes:

| Field | Meaning |
| --- | --- |
| `id` | Consecutive question number starting at 1 |
| `question` | Question text |
| `options` | Four distinct answer options |
| `correctIndex` | Correct option's zero-based index, from 0 to 3 |
| `difficulty` | `easy` for recall, `medium` for application, or `hard` for multi-step reasoning |
| `explanation` | Explanation of the correct answer |
| `sourcePage` | Supporting PDF page number |
| `sourceSnippet` | Short passage quoted from the supporting PDF page |
| `topic` | Short topic label |

The service validates the structure, question count, answer indices,
duplicate questions/options, and whether referenced page numbers exist.
It checks that each source snippet appears on the cited page after
collapsing whitespace to account for PDF line breaks.
Options are shuffled while preserving the answer key.

A batch is retried once (if the time budget allows) when fewer than 80% of its
questions pass. The share is counted against what the model says the PDF
supports, so a short PDF returns as many good questions as it has (12 of 20).

The model may report insufficient content instead of generating a quiz.
The command then displays an explanatory error and exits unsuccessfully.
Quiz generation reports OpenAI timeouts, rate limits, and rejected API keys
with distinct messages.

**The command prints internal quiz data, including answer keys.**
Student-facing APIs must omit answer keys and source snippets until the
appropriate grading or feedback step.

## Limits and known limitations

- Only selectable-text PDFs are supported; OCR is not included.
- LLM input is limited to 40,000 extracted characters.
- Requests have a 30-second timeout and no automatic retries.
- Output token counts are capped.
- Responses storage is disabled with `store=False`; this is not a
  guarantee of zero provider retention.
- Structural validation does not prove factual correctness or that a
  cited page supports an answer.
- Questions can still contain ambiguity, weak distractors, or inaccurate
  references.
- Insufficient-content detection relies on the model's judgment.
- Syllabus-based study-ahead generation is not implemented.
- Each generated quiz supports one saved graded attempt.

## Automated tests

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -t . -v
```

Run only quiz-generation tests:

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_quiz_generation -v
```

Tests use synthetic data and mocked model responses. They require no API
key and make no paid API requests.

Live model access and educational quality are checked separately using
the manual commands above.

## Clear credentials

When finished with live requests:

```powershell
Remove-Item Env:LLM_API_KEY
Remove-Variable llmKey
```

## Code locations

Paths below are relative to the repository root:

- `backend/app.py` — Flask routes and upload handling.
- `backend/services/pdf_extraction.py` — PDF text extraction.
- `backend/services/llm.py` — OpenAI summary service.
- `backend/services/quiz_generation.py` — MCQ generation and validation.
- `backend/check_llm.py` — Manual LLM connection and PDF summary check.
- `backend/check_quiz.py` — Manual PDF-to-quiz check.
- `tests/` — Backend automated tests.
