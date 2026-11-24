import argparse
import json
import sys

import pymupdf

from backend.services.llm import LLMError
from backend.services.pdf_extraction import extract_pdf_text
from backend.services.quiz_generation import generate_quiz


def main():
    parser = argparse.ArgumentParser(
        description="Generate and validate a quiz from a PDF using OpenAI."
    )
    parser.add_argument("--pdf", required=True, help="Path to the source PDF.")
    parser.add_argument(
        "--questions",
        type=int,
        choices=range(1, 21),
        default=5,
        help="Number of questions to generate, from 1 to 20 (default: 5).",
    )
    args = parser.parse_args()

    try:
        lecture_text = extract_pdf_text(args.pdf)
        quiz = generate_quiz(
            lecture_text,
            question_count=args.questions,
        )
    except (LLMError, ValueError, OSError, pymupdf.FileDataError) as error:
        print(f"Quiz generation failed: {error}", file=sys.stderr)
        return 1

    print(json.dumps(quiz, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())