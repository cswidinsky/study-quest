import argparse
import sys

import pymupdf

from backend.services.llm import LLMError, summarize_lecture
from backend.services.pdf_extraction import extract_pdf_text


SAMPLE_LECTURE = """
--- Page 1 ---
Cells are the basic units of life.
The cell membrane controls movement into and out of a cell.
Passive transport moves substances down a concentration gradient
without requiring cellular energy.
"""


def main():
    parser = argparse.ArgumentParser(
        description="Test OpenAI with sample text or extracted PDF text."
    )
    parser.add_argument(
        "--pdf",
        help="Path to a PDF whose extracted text will be sent to OpenAI.",
    )
    args = parser.parse_args()

    try:
        if args.pdf:
            lecture_text = extract_pdf_text(args.pdf)
        else:
            lecture_text = SAMPLE_LECTURE

        summary = summarize_lecture(lecture_text)

    except (LLMError, ValueError, OSError, pymupdf.FileDataError) as error:
        print(f"Connection check failed: {error}", file=sys.stderr)
        return 1

    print("OpenAI response:\n")
    print(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())