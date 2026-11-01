import unittest
import pymupdf
from backend.app import app
from io import BytesIO
from unittest.mock import patch

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

if __name__ == "__main__":
    unittest.main()