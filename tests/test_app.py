import json
import unittest
from io import BytesIO
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlsplit
from unittest.mock import Mock, patch

import pymupdf

from backend.app import app
from backend.services.quiz_generation import InsufficientContentError, QuizValidationError

class TestApp(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_health(self):
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok"})

    def test_missing_upload(self):
        response = self.client.post("/api/extract")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {"error": "Choose a PDF to upload."},
        )

    def test_extract_valid_pdf(self):
        with pymupdf.open() as document:
            page = document.new_page()
            page.insert_text((72, 72), "Cells are the basic units of life.")
            pdf_bytes = document.tobytes()

        response = self.client.post(
            "/api/extract",
            data={
                "file": (BytesIO(pdf_bytes), "lecture.pdf"),
            },
            content_type="multipart/form-data",
        )

        self.assertEqual(response.status_code, 200)

        result = response.get_json()
        self.assertIn("text", result)
        self.assertIn("--- Page 1 ---", result["text"])
        self.assertIn(
            "Cells are the basic units of life.",
            result["text"],
        )

    def test_extract_invalid_pdf(self):
        response = self.client.post(
            "/api/extract",
            data={
                "file": (
                    BytesIO(b"This is not a valid PDF."),
                    "invalid.pdf",
                ),
            },
            content_type="multipart/form-data",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {"error": "The uploaded file could not be read as a PDF."},
        )

    def test_extract_pdf_without_text(self):
        with pymupdf.open() as document:
            document.new_page()
            pdf_bytes = document.tobytes()

        response = self.client.post(
            "/api/extract",
            data={
                "file": (BytesIO(pdf_bytes), "blank.pdf"),
            },
            content_type="multipart/form-data",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {
                "error": (
                    "We couldn't find any text in that PDF. It might be a scan or photos of slides. "
                    "Try a PDF exported from your slides or notes."
                )
            },
        )

    def test_empty_filename(self):
        response = self.client.post(
            "/api/extract",
            data={
                "file": (BytesIO(b""), ""),
            },
            content_type="multipart/form-data",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {"error": "No file was selected."},
        )

    def test_upload_too_large(self):
        with patch.dict(app.config, {"MAX_CONTENT_LENGTH": 1024}):
            response = self.client.post(
                "/api/extract",
                data={
                    "file": (
                        BytesIO(b"x" * 2048),
                        "oversized.pdf",
                    ),
                },
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 413)
        self.assertIn("error", response.get_json())    

class TestQuizRoutes(unittest.TestCase):
    OWNER = "00000000-0000-4000-8000-000000000001"
    OTHER_USER = "00000000-0000-4000-8000-000000000002"
    QUIZ_ID = "00000000-0000-4000-8000-000000000003"
    HEADERS = {"Authorization": "Bearer owner-token"}
    OTHER_HEADERS = {"Authorization": "Bearer other-token"}

    def setUp(self):
        self.client = app.test_client()
        self.quizzes = {}
        self.attempts = {}
        self.enterContext(patch.dict("os.environ", {
            "SUPABASE_URL": "https://quiz-test.example",
            "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_test",
            "SUPABASE_SECRET_KEY": "sb_secret_test",
        }))
        self.supabase = self.enterContext(patch("backend.services.quiz_store.build_opener"))
        self.supabase.return_value = Mock(open=Mock(side_effect=self.supabase_request))
        self.question = {
            "id": 1,
            "question": "What are the basic units of life?",
            "options": ["Organs", "Cells", "Tissues", "Organ systems"],
            "correctIndex": 1,
            "difficulty": "easy",
            "explanation": "Cells are the basic units of life.",
            "sourcePage": 1,
            "sourceSnippet": "Cells are the basic units of life.",
            "topic": "Cells",
        }

    def supabase_request(self, request, timeout):
        url = urlsplit(request.full_url)
        self.assertEqual((url.scheme, url.netloc), ("https", "quiz-test.example"))
        if url.path == "/auth/v1/user":
            self.assertEqual(request.get_header("Apikey"), "sb_publishable_test")
            users = {"Bearer owner-token": self.OWNER, "Bearer other-token": self.OTHER_USER}
            user_id = users.get(request.get_header("Authorization"))
            if user_id is None:
                raise HTTPError(request.full_url, 401, "Unauthorized", {}, None)
            return BytesIO(json.dumps({"id": user_id}).encode())

        self.assertEqual(request.get_header("Apikey"), "sb_secret_test")
        self.assertIsNone(request.get_header("Authorization"))
        is_quiz = url.path == "/rest/v1/quizzes"
        if not is_quiz:
            self.assertEqual(url.path, "/rest/v1/quiz_attempts")
        table = self.quizzes if is_quiz else self.attempts
        id_column = "id" if is_quiz else "quiz_id"
        query = parse_qs(url.query)

        if request.get_method() == "POST":
            row = json.loads(request.data)
            key = (row[id_column], row["owner_id"])
            if is_quiz:
                table[key] = row
                return BytesIO()
            self.assertEqual(request.get_header("Prefer"), "resolution=ignore-duplicates,return=representation")
            if key in table:
                return BytesIO(b"[]")
            table[key] = row
        else:
            key = (query[id_column][0].removeprefix("eq."), query["owner_id"][0].removeprefix("eq."))
            row = table.get(key)

        fields = query["select"][0].split(",")
        return BytesIO(json.dumps([{field: row[field] for field in fields}] if row else []).encode())

    def upload_pdf(self):
        with pymupdf.open() as document:
            page = document.new_page()
            page.insert_text((72, 72), self.question["sourceSnippet"])
            pdf_bytes = document.tobytes()

        return self.client.post(
            "/api/quizzes",
            data={"file": (BytesIO(pdf_bytes), "lecture.pdf")},
            headers=self.HEADERS,
        )

    def test_upload_fetch_and_grade_quiz(self):
        with patch(
            "backend.app.generate_quiz", return_value={"questions": [self.question]}
        ) as generate:
            created = self.upload_pdf()

        generate.assert_called_once()
        lecture_text = generate.call_args.args[0]
        self.assertIn("--- Page 1 ---", lecture_text)
        self.assertIn(self.question["sourceSnippet"], lecture_text)

        self.assertEqual(created.status_code, 201)
        quiz = created.get_json()
        self.assertEqual(quiz["questions"], [{
            "id": 1,
            "text": self.question["question"],
            "choices": self.question["options"],
            "difficulty": "easy",
        }])
        url = f"/api/quizzes/{quiz['id']}"
        self.assertEqual(self.quizzes[(quiz["id"], self.OWNER)]["questions"], [self.question])
        self.assertEqual(quiz.pop("requested"), 5)  # only the create response says how many were asked for
        fetched = app.test_client().get(url, headers=self.HEADERS)
        self.assertEqual(fetched.status_code, 200)
        self.assertEqual(fetched.get_json(), quiz)

        submitted = app.test_client().post(f"{url}/submit", json={"answers": {"1": 1}}, headers=self.HEADERS)
        self.assertEqual(submitted.status_code, 200)
        self.assertEqual(submitted.get_json(), {
            "answers": {"1": 1},
            "score": 1,
            "total": 1,
            "results": [{
                "id": 1,
                "correct": True,
                "correct_answer": 1,
                "explanation": self.question["explanation"],
                "sourcePage": 1,
                "sourceSnippet": self.question["sourceSnippet"],
            }],
        })
        reloaded = app.test_client().get(f"{url}/result", headers=self.HEADERS)
        self.assertEqual(reloaded.status_code, 200)
        self.assertEqual(reloaded.headers["Cache-Control"], "no-store")
        self.assertEqual(reloaded.get_json(), submitted.get_json())

        retry = self.client.post(f"{url}/submit", json={"answers": {"1": 0}}, headers=self.HEADERS)
        self.assertEqual(retry.status_code, 200)
        self.assertEqual(retry.get_json(), submitted.get_json())
        self.assertEqual(len(self.attempts), 1)

    def test_question_count_is_sent_to_generation_and_clamped(self):
        for raw, expected in (("10", 10), ("3", 3), ("99", 10), ("0", 1), ("abc", 5), (None, 5)):
            with self.subTest(raw=raw), patch(
                "backend.app.generate_quiz", return_value={"questions": [self.question]}
            ) as generate:
                with pymupdf.open() as document:
                    document.new_page().insert_text((72, 72), self.question["sourceSnippet"])
                    pdf_bytes = document.tobytes()
                data = {"file": (BytesIO(pdf_bytes), "lecture.pdf")}
                if raw is not None:
                    data["question_count"] = raw
                created = self.client.post("/api/quizzes", data=data, headers=self.HEADERS)

                self.assertEqual(created.status_code, 201)
                self.assertEqual(generate.call_args.kwargs["question_count"], expected)
                self.assertEqual(created.get_json()["requested"], expected)

    def test_invalid_submissions_return_bad_request(self):
        self.quizzes[(self.QUIZ_ID, self.OWNER)] = {"questions": [self.question]}
        invalid_payloads = (
            [1],
            {"answers": []},
            {"answers": {}},
            {"answers": {"2": 1}},
            {"answers": {"1": True}},
            {"answers": {"1": 4}},
        )
        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                response = self.client.post(f"/api/quizzes/{self.QUIZ_ID}/submit", json=payload, headers=self.HEADERS)
                self.assertEqual(response.status_code, 400)
                self.assertIn("error", response.get_json())

    def test_insufficient_content_returns_error_without_creating_quiz(self):
        with patch(
            "backend.app.generate_quiz",
            side_effect=InsufficientContentError("Try fewer questions."),
        ):
            response = self.upload_pdf()

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.get_json(), {"error": "Try fewer questions."})
        self.assertEqual(self.quizzes, {})

    def test_unusable_quiz_shows_friendly_message_not_validation_details(self):
        raw = "Question 3: sourceSnippet must appear on sourcePage."
        with (
            patch("backend.app.generate_quiz", side_effect=QuizValidationError(raw)),
            self.assertLogs("backend.app", level="WARNING"),
        ):
            response = self.upload_pdf()

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.get_json(),
            {"error": "We couldn't build a quiz from that PDF. Try again, or try a different file."},
        )
        self.assertNotIn("sourceSnippet", response.get_data(as_text=True))
        self.assertEqual(self.quizzes, {})

    def test_quiz_routes_require_a_valid_user_token(self):
        url = f"/api/quizzes/{self.QUIZ_ID}"
        for headers in ({}, {"Authorization": "Bearer expired-token"}):
            with self.subTest(headers=headers):
                self.assertEqual(self.client.post("/api/quizzes", headers=headers).status_code, 401)
                self.assertEqual(self.client.get(url, headers=headers).status_code, 401)
                self.assertEqual(self.client.post(f"{url}/submit", headers=headers).status_code, 401)
                self.assertEqual(self.client.get(f"{url}/result", headers=headers).status_code, 401)

    def test_other_users_cannot_read_or_grade_quizzes(self):
        self.quizzes[(self.QUIZ_ID, self.OWNER)] = {"questions": [self.question]}
        url = f"/api/quizzes/{self.QUIZ_ID}"
        self.assertEqual(self.client.get(f"{url}/result", headers=self.HEADERS).status_code, 404)
        graded = self.client.post(f"{url}/submit", json={"answers": {"1": 1}}, headers=self.HEADERS)
        self.assertEqual(graded.status_code, 200)

        self.assertEqual(self.client.get(url, headers=self.OTHER_HEADERS).status_code, 404)
        self.assertEqual(self.client.get(f"{url}/result", headers=self.OTHER_HEADERS).status_code, 404)
        rejected = self.client.post(f"{url}/submit", json={"answers": {"1": 0}}, headers=self.OTHER_HEADERS)
        self.assertEqual(rejected.status_code, 404)
        self.assertEqual(len(self.attempts), 1)


if __name__ == "__main__":
    unittest.main()
