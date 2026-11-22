# Study Quest

An AI-powered, gamified study application that turns lecture PDFs into
multiple-choice quizzes.

## Project goal

Students upload study material, generate quizzes, answer questions, and
receive feedback and XP.

The MVP focuses on:

- PDF text extraction.
- AI-generated multiple-choice questions.
- Quiz presentation and server-side grading.
- Basic XP and persistent progress.

## Technology stack

- **Frontend:** React, Vite, Tailwind CSS, and Motion.
- **Backend:** Python and Flask.
- **PDF processing:** PyMuPDF.
- **AI:** OpenAI Responses API, using `gpt-4.1-mini` by default.
- **Persistence:** SQLite is proposed for the MVP.

## Repository structure

```text
study-quest/
├── backend/          # Flask application, PDF extraction, and AI services
├── frontend/         # React application
├── tests/            # Backend automated tests
├── requirements.txt  # Python dependencies
└── README.md
```

## Development setup

See the component guides:

- [Backend setup and testing](backend/README.md)
- [Frontend setup and testing](frontend/README.md)

Backend commands run from the repository root. Frontend commands run
from `frontend/`.

## Current capabilities

The backend supports PDF text extraction, a hosted LLM connection check,
and structured MCQ generation through command-line tools.

Quiz generation includes structural validation, shuffled answer options,
and an insufficient-content outcome. Generated questions still require
review for factual accuracy, ambiguity, and source references.

The frontend and backend are developed separately. Mock frontend behavior
does not establish that the corresponding backend feature is connected.
End-to-end quiz generation, grading, XP, and persistence require integration.

## Supported study material

The initial quiz-generation workflow targets selectable-text lecture
slides and study notes.

OCR and syllabus-based study-ahead generation are not implemented.

## Secrets and API usage

Keep API credentials server-side and out of Git. Never place API keys in
frontend code.

Manual AI checks make paid OpenAI API requests. Automated backend tests
use mocked model responses and do not incur API charges.

## Collaboration

Develop independently reviewable features on feature branches and open
pull requests into `main`. Coordinate shared API contracts before
connecting frontend and backend features.