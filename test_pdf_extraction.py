from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

import pymupdf

from pdf_extraction import extract_pdf_text


class TestPDFExtractionErrors(unittest.TestCase):
    def test_missing_file(self):
        with TemporaryDirectory() as folder:
            missing_pdf = Path(folder) / "missing.pdf"

            with self.assertRaises(pymupdf.FileNotFoundError):
                extract_pdf_text(str(missing_pdf))

    def test_corrupted_file(self):
        with TemporaryDirectory() as folder:
            corrupted_pdf = Path(folder) / "corrupted.pdf"
            corrupted_pdf.write_bytes(
                b"This is not a valid PDF document.\n"
            )

            with self.assertRaises(pymupdf.FileDataError):
                extract_pdf_text(str(corrupted_pdf))


if __name__ == "__main__":
    unittest.main()