import copy
import unittest
import json
import os
from types import SimpleNamespace
from unittest.mock import patch

from backend.services.llm import LLMError
from backend.services.quiz_generation import (
    QuizValidationError,
    generate_quiz,
    shuffle_quiz_options,
    validate_quiz,
    InsufficientContentError,
    validate_generation_result,
)


def sample_quiz():
    return {
        "questions": [
            {
                "id": 1,
                "question": "What does passive transport require?",
                "options": [
                    "A concentration gradient",
                    "ATP consumption",
                    "Cell division",
                    "DNA replication",
                ],
                "correctIndex": 0,
                "explanation": (
                    "Passive transport moves substances down "
                    "a concentration gradient without cellular energy."
                ),
                "sourcePage": 1,
                "topic": "Membrane transport",
            }
        ]
    }


class TestQuizValidation(unittest.TestCase):
    def test_accepts_valid_quiz(self):
        quiz = sample_quiz()

        result = validate_quiz(
            quiz,
            question_count=1,
            source_pages={1},
        )

        self.assertEqual(result, quiz)

    def test_rejects_wrong_question_count(self):
        with self.assertRaises(QuizValidationError):
            validate_quiz(
                sample_quiz(),
                question_count=5,
                source_pages={1},
            )

    def test_rejects_invalid_question_fields(self):
        invalid_fields = [
            ("id", True),
            ("question", ""),
            ("options", ["A", "B", "C"]),
            ("options", ["A", " a ", "B", "C"]),
            ("correctIndex", 4),
            ("correctIndex", True),
            ("explanation", " "),
            ("sourcePage", 99),
            ("topic", None),
        ]

        for field, value in invalid_fields:
            with self.subTest(field=field, value=value):
                quiz = sample_quiz()
                quiz["questions"][0][field] = value

                with self.assertRaises(QuizValidationError):
                    validate_quiz(
                        quiz,
                        question_count=1,
                        source_pages={1},
                    )

    def test_rejects_duplicate_questions(self):
        quiz = sample_quiz()
        duplicate = copy.deepcopy(quiz["questions"][0])
        duplicate["id"] = 2
        quiz["questions"].append(duplicate)

        with self.assertRaises(QuizValidationError):
            validate_quiz(
                quiz,
                question_count=2,
                source_pages={1},
            )
    def test_shuffle_updates_correct_index(self):
        quiz = sample_quiz()
        original_answer = quiz["questions"][0]["options"][0]

        def reverse_options(options):
            options.reverse()

        with patch(
            "backend.services.quiz_generation.random.shuffle",
            side_effect=reverse_options,
        ):
            result = shuffle_quiz_options(quiz)

        question = result["questions"][0]

        self.assertEqual(question["correctIndex"], 3)
        self.assertEqual(
            question["options"][question["correctIndex"]],
            original_answer,
        )

class TestQuizGeneration(unittest.TestCase):
    SOURCE = "--- Page 1 ---\nPassive transport follows a concentration gradient."

    def test_generates_and_validates_quiz(self):
        with patch.dict(
            os.environ,
            {"LLM_API_KEY": "test-only-key", "LLM_MODEL": "test-model"},
        ):
            with patch(
                "backend.services.quiz_generation.OpenAI"
            ) as factory:
                client = factory.return_value.__enter__.return_value
                client.responses.create.return_value = SimpleNamespace(
                    status="completed",
                    output_text=json.dumps({
                        "status": "ready",
                        "reason": None,
                        **sample_quiz(),
                    }),
                )

                result = generate_quiz(self.SOURCE, question_count=1)

                question = result["questions"][0]
                original = sample_quiz()["questions"][0]

                self.assertCountEqual(
                    question["options"],
                    original["options"],
                )
                self.assertEqual(
                    question["options"][question["correctIndex"]],
                    original["options"][original["correctIndex"]],
                )

                request = client.responses.create.call_args.kwargs
                self.assertEqual(request["input"], self.SOURCE)
                self.assertTrue(request["text"]["format"]["strict"])
                self.assertFalse(request["store"])

    def test_rejects_invalid_input_before_api_call(self):
        invalid_cases = [
            ("", 5),
            ("Text without page markers", 5),
            (self.SOURCE, 0),
            (self.SOURCE, 11),
            (self.SOURCE, True),
        ]

        with patch("backend.services.quiz_generation.OpenAI") as factory:
            for text, count in invalid_cases:
                with self.subTest(text=text, count=count):
                    with self.assertRaises(ValueError):
                        generate_quiz(text, question_count=count)

            factory.assert_not_called()

    def test_rejects_incomplete_response(self):
        with patch.dict(
            os.environ,
            {"LLM_API_KEY": "test-only-key"},
        ):
            with patch(
                "backend.services.quiz_generation.OpenAI"
            ) as factory:
                client = factory.return_value.__enter__.return_value
                client.responses.create.return_value = SimpleNamespace(
                    status="incomplete",
                    output_text="",
                )

                with self.assertRaises(LLMError):
                    generate_quiz(self.SOURCE, question_count=1)

    def test_rejects_generated_question_with_invalid_answer(self):
        quiz = sample_quiz()
        quiz["questions"][0]["correctIndex"] = 9

        with patch.dict(
            os.environ,
            {"LLM_API_KEY": "test-only-key"},
        ):
            with patch(
                "backend.services.quiz_generation.OpenAI"
            ) as factory:
                client = factory.return_value.__enter__.return_value
                client.responses.create.return_value = SimpleNamespace(
                    status="completed",
                    output_text=json.dumps({
                        "status": "ready",
                        "reason": None,
                        **quiz,
                    }),
                )

                with self.assertRaises(QuizValidationError):
                    generate_quiz(self.SOURCE, question_count=1)
    def test_reports_insufficient_content(self):
        response = {
            "status": "insufficient_content",
            "reason": "Only a title is available.",
            "questions": [],
        }

        with self.assertRaises(InsufficientContentError):
            validate_generation_result(
                response,
                question_count=5,
                source_pages={1},
            )

    def test_rejects_inconsistent_generation_outcomes(self):
        invalid_responses = [
            {
                "status": "ready",
                "reason": None,
                "questions": [],
            },
            {
                "status": "ready",
                "reason": "Not enough material.",
                **sample_quiz(),
            },
            {
                "status": "insufficient_content",
                "reason": "",
                "questions": [],
            },
            {
                "status": "insufficient_content",
                "reason": "Not enough material.",
                **sample_quiz(),
            },
            {
                "status": "unknown",
                "reason": None,
                "questions": [],
            },
        ]

        for response in invalid_responses:
            with self.subTest(response=response):
                with self.assertRaises(QuizValidationError):
                    validate_generation_result(
                        response,
                        question_count=1,
                        source_pages={1},
                    )

if __name__ == "__main__":
    unittest.main()