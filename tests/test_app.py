import unittest
from io import BytesIO
from unittest.mock import patch

import pymupdf

from backend.app import app, quizzes
from backend.services.quiz_generation import InsufficientContentError

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
            {"error": "Upload a PDF using the 'file' field."},
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
                    "The PDF contains no extractable text. "
                    "It may be blank or contain scanned images requiring OCR."
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
    def setUp(self):
        self.client = app.test_client()
        self.enterContext(patch.dict(quizzes, clear=True))
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

    def upload_pdf(self):
        with pymupdf.open() as document:
            page = document.new_page()
            page.insert_text((72, 72), self.question["sourceSnippet"])
            pdf_bytes = document.tobytes()

        return self.client.post(
            "/api/quizzes",
            data={"file": (BytesIO(pdf_bytes), "lecture.pdf")},
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
        fetched = self.client.get(url)
        self.assertEqual(fetched.status_code, 200)
        self.assertEqual(fetched.get_json(), quiz)

        submitted = self.client.post(f"{url}/submit", json={"answers": {"1": 1}})
        self.assertEqual(submitted.status_code, 200)
        self.assertEqual(submitted.get_json(), {
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

    def test_invalid_submissions_return_bad_request(self):
        quizzes["test-quiz"] = [self.question]
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
                response = self.client.post("/api/quizzes/test-quiz/submit", json=payload)
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
        self.assertEqual(quizzes, {})


if __name__ == "__main__":
    unittest.main()
