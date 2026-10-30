# study-quest
Gamified study application

## Backend

Flask backend with PDF text extraction using PyMuPDF.
Supports selectable text only; OCR is not included.

### Setup

Run from the repository root (Windows PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### Run

```powershell
.\.venv\Scripts\python.exe -m flask --app backend.app run --debug
```

Local development server: http://127.0.0.1:5000

### Tests

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -t . -v
```

### Endpoints

- `GET /api/health` — returns `{"status": "ok"}`.
- `POST /api/extract` — accepts a PDF in multipart field `file`;
  returns `{"text": "..."}`.
- Errors return `{"error": "..."}` with status 400.
- Requests exceeding 10 MiB return status 413.

### Code locations

- `backend/app.py` — Flask routes.
- `backend/services/` — PDF extraction and future LLM integration.
- `tests/` — automated tests.