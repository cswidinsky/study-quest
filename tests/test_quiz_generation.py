import copy
import unittest
import json
import os
from types import SimpleNamespace
from unittest.mock import patch

from openai import APITimeoutError, AuthenticationError, OpenAIError, RateLimitError

from backend.services.llm import LLMError
from backend.services.quiz_generation import (
    QuizValidationError,
    generate_quiz,
    shuffle_quiz_options,
    validate_quiz,
    InsufficientContentError,
    validate_generation_result,
)

SOURCE_SNIPPET = "Passive transport follows a concentration gradient."
SOURCE_PAGES = {1: SOURCE_SNIPPET}


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
                "difficulty": "easy",
                "explanation": (
                    "Passive transport moves substances down "
                    "a concentration gradient without cellular energy."
                ),
                "sourcePage": 1,
                "sourceSnippet": SOURCE_SNIPPET,
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
            source_pages=SOURCE_PAGES,
        )

        self.assertEqual(result, quiz)

    def test_rejects_wrong_question_count(self):
        with self.assertRaises(QuizValidationError):
            validate_quiz(
                sample_quiz(),
                question_count=5,
                source_pages=SOURCE_PAGES,
            )

    def test_rejects_invalid_question_fields(self):
        invalid_fields = [
            ("id", True),
            ("question", ""),
            ("options", ["A", "B", "C"]),
            ("options", ["A", " a ", "B", "C"]),
            ("correctIndex", 4),
            ("correctIndex", True),
            ("difficulty", "expert"),
            ("difficulty", ["easy"]),
            ("explanation", " "),
            ("sourceSnippet", " \n "),
            ("sourceSnippet", "Words that appear nowhere in the lecture."),
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
                        source_pages=SOURCE_PAGES,
                    )

    def test_corrects_source_page_when_snippet_is_on_another_page(self):
        for wrong_page in (1, 99):
            with self.subTest(source_page=wrong_page):
                quiz = sample_quiz()
                quiz["questions"][0]["sourcePage"] = wrong_page

                result = validate_quiz(
                    quiz,
                    question_count=1,
                    source_pages={1: "Cell membranes regulate transport.", 2: SOURCE_SNIPPET},
                )

                self.assertEqual(result["questions"][0]["sourcePage"], 2)

    def test_rejects_duplicate_questions(self):
        quiz = sample_quiz()
        duplicate = copy.deepcopy(quiz["questions"][0])
        duplicate["id"] = 2
        quiz["questions"].append(duplicate)

        with self.assertRaises(QuizValidationError):
            validate_quiz(
                quiz,
                question_count=2,
                source_pages=SOURCE_PAGES,
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

def quiz_with_snippet(snippet, page_text, source_page=1):
    quiz = sample_quiz()
    quiz["questions"][0]["sourceSnippet"] = snippet
    quiz["questions"][0]["sourcePage"] = source_page
    return quiz, {1: page_text}


class TestSnippetMatching(unittest.TestCase):
    """The snippet check tolerates the ways real PDF text differs from a copied quote."""

    def assert_accepted(self, snippet, page_text):
        quiz, pages = quiz_with_snippet(snippet, page_text)
        result = validate_quiz(quiz, question_count=1, source_pages=pages)
        self.assertEqual(result["questions"][0]["sourcePage"], 1)

    def test_curly_quotes_and_apostrophes(self):
        self.assert_accepted(
            snippet='The "pump" doesn\'t rest.',
            page_text="The “pump” doesn’t rest.",
        )
        self.assert_accepted(
            snippet="The “pump” doesn’t rest.",
            page_text='The "pump" doesn\'t rest.',
        )

    def test_word_split_by_hyphen_at_line_break(self):
        self.assert_accepted(
            snippet="Passive transport follows a concentration gradient.",
            page_text="Passive transport follows a concen-\ntration gradient.",
        )
        self.assert_accepted(
            snippet="Passive transport follows a concentration gradient.",
            page_text="Passive transport follows a concen-\r\n   tration gradient.",
        )
        # PyMuPDF often extracts the break as a soft hyphen (seen with an embedded Arial font).
        self.assert_accepted(
            snippet="Passive transport follows a concentration gradient.",
            page_text="Passive\xa0transport\xa0follows\xa0a\xa0concen\xad\ntration\xa0gradient.",
        )

    def test_compound_word_hyphen_at_line_break(self):
        self.assert_accepted(
            snippet="Use self-assessment after each lecture.",
            page_text="Use self-\nassessment after each lecture.",
        )

    def test_ligatures(self):
        self.assert_accepted(
            snippet="The first flow is efficient.",
            page_text="The ﬁrst ﬂow is eﬃcient.",
        )

    def test_different_capitalization(self):
        self.assert_accepted(
            snippet="passive transport follows a concentration gradient.",
            page_text="PASSIVE TRANSPORT FOLLOWS A CONCENTRATION GRADIENT.",
        )

    def test_whitespace_dashes_and_soft_hyphens(self):
        self.assert_accepted(
            snippet="Osmosis - the movement of water - needs no ATP.",
            page_text="Osmosis – the move­ment of water —\n needs no   ATP.",
        )

    def test_rejects_snippet_found_nowhere(self):
        quiz, pages = quiz_with_snippet(
            "Glucose enters through aquaporins.",
            "Passive transport follows a concentration gradient.",
        )
        with self.assertRaises(QuizValidationError):
            validate_quiz(quiz, question_count=1, source_pages=pages)


LECTURE_PAGES = {
    1: "Passive transport follows a concentration gradient.",
    2: "Osmosis is the movement of water toward higher solute concentration.",
    3: "Active transport uses ATP to move solutes against their gradient.",
}
LECTURE_TEXT = "\n\n".join(f"--- Page {n} ---\n{text}" for n, text in LECTURE_PAGES.items())


def five_questions(bad_ids=()):
    """Five valid questions; the ids in bad_ids get a snippet that isn't in the lecture."""
    snippets = [
        (1, "Passive transport follows a concentration gradient."),
        (2, "Osmosis is the movement of water"),
        (3, "Active transport uses ATP"),
        (2, "toward higher solute concentration"),
        (3, "move solutes against their gradient"),
    ]
    questions = []
    for number, (page, snippet) in enumerate(snippets, start=1):
        questions.append({
            "id": number,
            "question": f"Question number {number}?",
            "options": [f"Right {number}", f"Wrong A{number}", f"Wrong B{number}", f"Wrong C{number}"],
            "correctIndex": 0,
            "difficulty": "easy",
            "explanation": f"Explanation {number}.",
            "sourcePage": page,
            "sourceSnippet": "This sentence is not in the PDF." if number in bad_ids else snippet,
            "topic": "Transport",
        })
    return {"status": "ready", "reason": None, "questions": questions}


class TestGenerationKeepsGoodQuestions(unittest.TestCase):
    def generate(self, *responses):
        with (
            patch.dict(os.environ, {"LLM_API_KEY": "test-only-key"}),
            patch("backend.services.quiz_generation.OpenAI") as factory,
        ):
            client = factory.return_value.__enter__.return_value
            client.responses.create.side_effect = [
                SimpleNamespace(status="completed", output_text=json.dumps(r)) for r in responses
            ]
            try:
                return generate_quiz(LECTURE_TEXT, question_count=5)
            finally:
                self.calls = client.responses.create.call_count

    def test_one_bad_question_out_of_five_is_dropped(self):
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            result = self.generate(five_questions(bad_ids={3}))

        self.assertEqual(self.calls, 1)  # 4 of 5 is enough: no retry
        questions = result["questions"]
        self.assertEqual([q["id"] for q in questions], [1, 2, 3, 4])
        self.assertNotIn("Question number 3?", [q["question"] for q in questions])
        for q in questions:
            self.assertEqual(q["options"][q["correctIndex"]], q["question"].replace("Question number ", "Right ").rstrip("?"))

    def test_retries_once_when_too_few_questions_survive(self):
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            result = self.generate(five_questions(bad_ids={1, 2, 3}), five_questions())

        self.assertEqual(self.calls, 2)
        self.assertEqual(len(result["questions"]), 5)

    def test_retries_once_after_unusable_response(self):
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            result = self.generate({"status": "ready", "reason": None, "questions": []}, five_questions())

        self.assertEqual(self.calls, 2)
        self.assertEqual(len(result["questions"]), 5)

    def test_fails_only_if_retry_is_still_too_short(self):
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            with self.assertRaises(QuizValidationError):
                self.generate(five_questions(bad_ids={1, 2, 3}), five_questions(bad_ids={2, 4}))

        self.assertEqual(self.calls, 2)


class TestQuizGeneration(unittest.TestCase):
    SOURCE = (
        "--- Page 1 ---\r\nCell membranes regulate transport.\r\n\r\n"
        "--- Page 2 ---\r\nPassive transport follows a\r\nconcentration gradient."
    )

    def test_generates_and_validates_quiz(self):
        with patch.dict(
            os.environ,
            {"LLM_API_KEY": "test-only-key", "LLM_MODEL": "test-model"},
        ):
            with patch(
                "backend.services.quiz_generation.OpenAI"
            ) as factory:
                client = factory.return_value.__enter__.return_value
                quiz = sample_quiz()
                quiz["questions"][0]["sourcePage"] = 2
                client.responses.create.return_value = SimpleNamespace(
                    status="completed",
                    output_text=json.dumps({
                        "status": "ready",
                        "reason": None,
                        **quiz,
                    }),
                )

                result = generate_quiz(self.SOURCE, question_count=1)

                question = result["questions"][0]
                original = quiz["questions"][0]

                self.assertCountEqual(
                    question["options"],
                    original["options"],
                )
                self.assertEqual(
                    question["options"][question["correctIndex"]],
                    original["options"][original["correctIndex"]],
                )
                self.assertEqual(question["sourcePage"], 2)
                self.assertEqual(question["sourceSnippet"], SOURCE_SNIPPET)
                self.assertEqual(question["difficulty"], "easy")

                request = client.responses.create.call_args.kwargs
                self.assertEqual(request["input"], self.SOURCE)
                self.assertTrue(request["text"]["format"]["strict"])
                self.assertFalse(request["store"])
                schema = request["text"]["format"]["schema"]
                question_schema = schema["properties"]["questions"]["items"]
                self.assertIn("sourceSnippet", question_schema["required"])
                self.assertIn("difficulty", question_schema["required"])
                self.assertEqual(
                    question_schema["properties"]["difficulty"]["enum"],
                    ["easy", "medium", "hard"],
                )

    def test_reports_distinct_provider_errors(self):
        request = SimpleNamespace()
        provider_message = "Provider details that should stay private"
        errors = (
            (APITimeoutError(request), "timed out"),
            (
                RateLimitError(
                    provider_message,
                    response=SimpleNamespace(request=request, status_code=429, headers={}),
                    body=None,
                ),
                "rate limit reached",
            ),
            (
                AuthenticationError(
                    provider_message,
                    response=SimpleNamespace(request=request, status_code=401, headers={}),
                    body=None,
                ),
                "rejected the API key",
            ),
            (OpenAIError(provider_message), "Quiz generation failed"),
        )
        with (
            patch.dict(os.environ, {"LLM_API_KEY": "test-only-key"}),
            patch("backend.services.quiz_generation.OpenAI") as factory,
        ):
            client = factory.return_value.__enter__.return_value
            for error, message in errors:
                with self.subTest(error=type(error).__name__):
                    client.responses.create.side_effect = error
                    with self.assertRaisesRegex(LLMError, message) as raised:
                        generate_quiz(self.SOURCE, question_count=1)
                    self.assertNotIn(provider_message, str(raised.exception))

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
                source_pages=SOURCE_PAGES,
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
                        source_pages=SOURCE_PAGES,
                    )

if __name__ == "__main__":
    unittest.main()
