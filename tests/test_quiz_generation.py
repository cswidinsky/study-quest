import copy
import unittest
import json
import os
import re
import threading
from types import SimpleNamespace
from unittest.mock import patch

from openai import APITimeoutError, AuthenticationError, OpenAIError, RateLimitError

from backend.services.llm import LLMError
from backend.services.quiz_generation import (
    QuizValidationError,
    generate_quiz,
    merge_questions,
    page_ranges,
    shuffle_quiz_options,
    split_into_batches,
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

    def test_slide_bullets_glued_to_words(self):
        # Handout PDFs export bullets as private-use glyphs or symbols stuck to the next word.
        self.assert_accepted(
            snippet="Must study observable behaviour. Ignore unobservable phenomena",
            page_text="Must study observable \nbehaviour\nIgnore unobservable \nphenomena",
        )
        self.assert_accepted(
            snippet="They aren't necessary for an understanding of human nature",
            page_text="○They aren’t necessary for an \nunderstanding of human \nnature",
        )

    def test_near_verbatim_quote_is_accepted(self):
        # US spelling for a UK-spelled slide, and a dash turned into a colon.
        self.assert_accepted(
            snippet="Relatively permanent change in behavior that occurs through experience",
            page_text="Relatively permanent change in behaviour that occurs through \nexperience",
        )
        self.assert_accepted(
            snippet="Associative learning: where we make a connection or association between two events",
            page_text="Associative learning – Where we make a connection or \nassociation between two events",
        )

    def test_invented_or_short_inexact_quotes_are_rejected(self):
        page = "Learning occurs when you recognize that one event predicts another"
        for snippet in (
            "Pavlov discovered that dogs can be trained to play the piano",
            "Reinforcement always weakens the behaviour that comes before it",
            "Learning occurs predictably",  # too short to match loosely
        ):
            with self.subTest(snippet=snippet):
                quiz, pages = quiz_with_snippet(snippet, page)
                with self.assertRaises(QuizValidationError):
                    validate_quiz(quiz, question_count=1, source_pages=pages)

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


def five_questions(bad_ids=(), count=5, first=1):
    """`count` valid questions (default five); the ids in bad_ids get a snippet that isn't in the lecture.

    Their text is numbered from `first` ("Question number 11?"), so batches can be told apart.
    """
    snippets = [
        (1, "Passive transport follows a concentration gradient."),
        (2, "Osmosis is the movement of water"),
        (3, "Active transport uses ATP"),
        (2, "toward higher solute concentration"),
        (3, "move solutes against their gradient"),
    ]
    questions = []
    for number in range(1, count + 1):
        page, snippet = snippets[(number - 1) % len(snippets)]
        label = first + number - 1
        questions.append({
            "id": number,
            "question": f"Question number {label}?",
            "options": [f"Right {label}", f"Wrong A{label}", f"Wrong B{label}", f"Wrong C{label}"],
            "correctIndex": 0,
            "difficulty": "easy",
            "explanation": f"Explanation {label}.",
            "sourcePage": page,
            "sourceSnippet": "This sentence is not in the PDF." if number in bad_ids else snippet,
            "topic": "Transport",
        })
    return {"status": "ready", "reason": None, "questions": questions}


def repeated_questions(count, first=1):
    """`count` valid questions with different wording that all ask the same thing: same quote,
    same correct answer. Only one of them survives repeat removal."""
    quiz = five_questions(count=count, first=first)
    for q in quiz["questions"]:
        q["sourcePage"], q["sourceSnippet"] = 1, "Passive transport follows a concentration gradient."
        q["options"][0] = "Down the concentration gradient"
    return quiz


class TestGenerationKeepsGoodQuestions(unittest.TestCase):
    def generate(self, *responses, count=5):
        with (
            patch.dict(os.environ, {"LLM_API_KEY": "test-only-key"}),
            patch("backend.services.quiz_generation.OpenAI") as factory,
        ):
            client = factory.return_value.__enter__.return_value
            client.responses.create.side_effect = [
                SimpleNamespace(status="completed", output_text=json.dumps(r)) for r in responses
            ]
            try:
                return generate_quiz(LECTURE_TEXT, question_count=count)
            finally:
                self.calls = client.responses.create.call_count
                self.timeouts = [c.kwargs["timeout"] for c in factory.call_args_list]

    def test_ten_questions_keep_eight_without_retry(self):
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            result = self.generate(five_questions(bad_ids={4, 9}, count=10), count=10)

        self.assertEqual(self.calls, 1)  # 8 of 10 is 80%: enough
        self.assertEqual(len(result["questions"]), 8)

    def test_ten_questions_retry_below_eighty_percent(self):
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            result = self.generate(five_questions(bad_ids={1, 2, 3}, count=10), five_questions(count=10), count=10)

        self.assertEqual(self.calls, 2)  # 7 of 10 is too few
        self.assertEqual(len(result["questions"]), 10)

    def test_three_questions_need_all_three(self):
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            result = self.generate(five_questions(bad_ids={2}, count=3), five_questions(count=3), count=3)

        self.assertEqual(self.calls, 2)  # 2 of 3 is under 80%
        self.assertEqual(len(result["questions"]), 3)

    def test_more_questions_get_more_time(self):
        self.generate(five_questions(count=10), count=10)
        self.assertEqual(self.timeouts, [120.0])
        self.generate(five_questions(), count=5)
        self.assertEqual(self.timeouts, [70.0])

    def test_no_retry_when_the_time_budget_is_used_up(self):
        clock = iter([0.0, 0.0, 230.0])  # deadline set, attempt 1 starts, attempt 1 took 230 s
        with patch("backend.services.quiz_generation.time.monotonic", side_effect=lambda: next(clock)):
            with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
                with self.assertRaises(QuizValidationError):
                    self.generate(five_questions(bad_ids={1, 2, 3}), five_questions())

        self.assertEqual(self.calls, 1)

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

    # Review of PR #44, fix 1: a quiz needs at least 3 distinct questions (any request of 3+).

    def test_three_asked_one_returned_retries_then_fails(self):
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            with self.assertRaisesRegex(QuizValidationError, "needs at least 3"):
                self.generate(five_questions(count=1), five_questions(count=1), count=3)

        self.assertEqual(self.calls, 2)  # 1 of 1 passes the 80% rule, but 1 question is too few

    def test_three_asked_one_returned_then_three_on_retry(self):
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            result = self.generate(five_questions(count=1), five_questions(count=3), count=3)

        self.assertEqual(self.calls, 2)
        self.assertEqual(len(result["questions"]), 3)

    def test_three_valid_questions_that_repeat_each_other_count_as_one(self):
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            with self.assertRaises(QuizValidationError):
                self.generate(repeated_questions(3), repeated_questions(3), count=3)

        self.assertEqual(self.calls, 2)

    def test_repeats_inside_one_response_count_against_the_eighty_percent_rule(self):
        # 5 valid, but 3 of them are the same question: 3 distinct of 5 is under 80%.
        padded = five_questions()
        padded["questions"][2:] = repeated_questions(3, first=3)["questions"]
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            result = self.generate(padded, five_questions())

        self.assertEqual(self.calls, 2)
        self.assertEqual(len(result["questions"]), 5)

    def test_one_or_two_asked_need_only_one(self):
        # The 3-question minimum is for requests of 3 or more (the app asks for 3 to 20).
        result = self.generate(five_questions(count=1), count=2)
        self.assertEqual(self.calls, 1)
        self.assertEqual(len(result["questions"]), 1)

    # Review of PR #44, fix 2: an attempt that passes beats one that doesn't, even with fewer
    # questions; the number of valid questions only breaks ties.

    def test_a_retry_that_passes_is_kept_on_a_tie(self):
        # First: 7 of 10 valid (fails). Retry: the model says the PDF supports 7, all valid (passes).
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            result = self.generate(five_questions(bad_ids={1, 2, 3}, count=10), five_questions(count=7), count=10)

        self.assertEqual(self.calls, 2)
        self.assertEqual(sorted(q["question"] for q in result["questions"]), sorted(f"Question number {n}?" for n in range(1, 8)))

    def test_a_passing_attempt_beats_a_failing_one_with_more_questions(self):
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            result = self.generate(five_questions(bad_ids={1, 2, 3}, count=10), five_questions(count=6), count=10)

        self.assertEqual(len(result["questions"]), 6)

    def test_no_quiz_when_neither_attempt_passes(self):
        # 2 of 3 fails the 80% rule; the retry's 1 of 1 fails the 3-question minimum.
        # Neither passes, so there's no 1- or 2-question quiz: the friendly error instead.
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            with self.assertRaises(QuizValidationError):
                self.generate(five_questions(bad_ids={2}, count=3), five_questions(count=1), count=3)

        self.assertEqual(self.calls, 2)

    def test_fails_only_if_retry_is_still_too_short(self):
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            with self.assertRaises(QuizValidationError):
                self.generate(five_questions(bad_ids={1, 2, 3}), five_questions(bad_ids={2, 4}))

        self.assertEqual(self.calls, 2)


INSUFFICIENT = {"status": "insufficient_content", "reason": "Nothing more to ask.", "questions": []}


class TestBatchSplitting(unittest.TestCase):
    def test_batches_hold_at_most_ten_and_are_balanced(self):
        cases = {1: [1], 3: [3], 10: [10], 11: [6, 5], 15: [8, 7], 19: [10, 9], 20: [10, 10]}
        for count, sizes in cases.items():
            with self.subTest(count=count):
                self.assertEqual(split_into_batches(count), sizes)

    def test_pages_are_shared_between_batches(self):
        self.assertEqual(page_ranges([1, 2, 3], 2), [(1, 2), (3, 3)])
        self.assertEqual(page_ranges(range(1, 13), 2), [(1, 6), (7, 12)])
        self.assertIsNone(page_ranges([4], 2))  # one page can't be split
        self.assertIsNone(page_ranges([1, 2, 3], 1))


class TestLargeQuizzesAreWrittenInBatches(unittest.TestCase):
    """Over ten questions: parallel requests of at most ten, merged into one quiz."""

    def generate(self, parts, count=20, parallel=True):
        """parts maps a part number (1, 2) to the responses its requests get, in order."""
        queues = {part: list(responses) for part, responses in parts.items()}
        barrier = threading.Barrier(len(parts), timeout=5)
        lock = threading.Lock()
        self.requests = []

        def create(**request):
            part = int(re.search(r"PART (\d+) OF", request["instructions"]).group(1))
            with lock:
                self.requests.append((part, request))
                first_call = sum(1 for p, _ in self.requests if p == part) == 1
                response = queues[part].pop(0)
            if parallel and first_call:
                barrier.wait()  # every part's first request is in flight at the same time
            return SimpleNamespace(status="completed", output_text=json.dumps(response))

        with (
            patch.dict(os.environ, {"LLM_API_KEY": "test-only-key"}),
            patch("backend.services.quiz_generation.OpenAI") as factory,
        ):
            factory.return_value.__enter__.return_value.responses.create.side_effect = create
            try:
                return generate_quiz(LECTURE_TEXT, question_count=count)
            finally:
                self.timeouts = sorted(c.kwargs["timeout"] for c in factory.call_args_list)

    def calls(self, part=None):
        return sum(1 for p, _ in self.requests if part in (None, p))

    def test_twenty_questions_come_from_two_parallel_batches_of_ten(self):
        result = self.generate({1: [five_questions(count=10)], 2: [five_questions(count=10, first=11)]})

        questions = result["questions"]
        self.assertEqual(len(questions), 20)
        self.assertEqual([q["id"] for q in questions], list(range(1, 21)))
        self.assertCountEqual([q["question"] for q in questions], [f"Question number {n}?" for n in range(1, 21)])
        for q in questions:  # answers survive the merge and the shuffle
            self.assertEqual(q["options"][q["correctIndex"]], q["question"].replace("Question number ", "Right ").rstrip("?"))

        self.assertEqual(self.calls(), 2)
        for _, request in self.requests:
            self.assertEqual(request["text"]["format"]["schema"]["properties"]["questions"]["maxItems"], 10)
        self.assertEqual(self.timeouts, [120.0, 120.0])  # each batch gets a ten-question timeout

    def test_each_batch_is_pointed_at_its_own_pages(self):
        self.generate({1: [five_questions(count=8)], 2: [five_questions(count=7, first=9)]}, count=15)

        instructions = {part: request["instructions"] for part, request in self.requests}
        self.assertIn("8 of the quiz's 15 questions", instructions[1])
        self.assertIn("pages 1-2", instructions[1])
        self.assertIn("7 of the quiz's 15 questions", instructions[2])
        self.assertIn("page 3.", instructions[2])

    def test_repeats_across_batches_are_dropped_and_ids_renumbered(self):
        second = five_questions(count=10, first=11)
        second["questions"][0] = dict(five_questions(count=1)["questions"][0])  # batch 1's first question again
        second["questions"][1]["question"] = "Question number 2?"  # same wording as batch 1's second

        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            result = self.generate({1: [five_questions(count=10)], 2: [second]})

        texts = [q["question"] for q in result["questions"]]
        self.assertEqual(len(texts), 18)
        self.assertEqual(len(set(texts)), 18)
        self.assertEqual([q["id"] for q in result["questions"]], list(range(1, 19)))
        self.assertEqual(self.calls(), 2)  # repeats aren't a reason to retry

    def test_similar_wording_with_a_different_answer_is_not_a_repeat(self):
        def question(text, answer, snippet):
            return {"question": text, "options": [answer, "x", "y", "z"], "correctIndex": 0, "sourceSnippet": snippet}

        stem = "Which of the following best describes {} conditioning according to the lecture?"
        kept = merge_questions([
            [question(stem.format("classical"), "Learning by pairing two stimuli", "Pavlov paired a bell with food")],
            [
                question(stem.format("operant"), "Learning from consequences", "Skinner rewarded lever presses"),
                # Reworded repeat of the first one, quoting another line, same answer: dropped.
                question(stem.format("classical") + " Explain", "Learning by pairing two stimuli", "Classical conditioning pairs stimuli"),
            ],
        ])
        self.assertEqual([q["id"] for q in kept], [1, 2])
        self.assertIn("operant", kept[1]["question"])

    def test_a_short_pdf_returns_as_many_good_questions_as_it_can(self):
        # The model says each half of the PDF only supports six questions: 12 of 20, no retries.
        result = self.generate({1: [five_questions(count=6)], 2: [five_questions(count=6, first=11)]})

        self.assertEqual(len(result["questions"]), 12)
        self.assertEqual([q["id"] for q in result["questions"]], list(range(1, 13)))
        self.assertEqual(self.calls(), 2)

    def test_a_batch_with_nothing_left_to_ask_is_skipped(self):
        result = self.generate({1: [five_questions(count=10)], 2: [INSUFFICIENT]}, parallel=False)

        self.assertEqual(len(result["questions"]), 10)
        self.assertEqual(self.calls(), 2)

    def test_every_batch_insufficient_means_insufficient_content(self):
        with self.assertRaises(InsufficientContentError):
            self.generate({1: [INSUFFICIENT], 2: [INSUFFICIENT]}, parallel=False)

    def test_only_the_batch_below_eighty_percent_retries(self):
        # 10 + 5 = 15 of 20 fails the quiz's 80% rule; only batch 2 (5 of 10) asks again.
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            result = self.generate({
                1: [five_questions(count=10)],
                2: [five_questions(bad_ids={1, 2, 3, 4, 5}, count=10, first=11), five_questions(count=10, first=11)],
            })

        self.assertEqual(self.calls(1), 1)
        self.assertEqual(self.calls(2), 2)
        self.assertEqual(len(result["questions"]), 20)

    def test_no_retry_when_the_whole_quiz_already_passes(self):
        # Batch 2 keeps only 7 of 10, but 17 of 20 passes: no extra wait for a retry.
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            result = self.generate({1: [five_questions(count=10)], 2: [five_questions(bad_ids={1, 2, 3}, count=10, first=11)]})

        self.assertEqual(self.calls(), 2)
        self.assertEqual(len(result["questions"]), 17)

    def test_eighty_percent_rule_counts_the_whole_quiz(self):
        # Batch 2 keeps 7 of 10 even after its retry: 17 of 20 is still 85%, so the quiz is kept.
        bad = {1, 2, 3}
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            result = self.generate({
                1: [five_questions(count=10)],
                2: [five_questions(bad_ids=bad, count=10, first=11), five_questions(bad_ids=bad, count=10, first=11)],
            })
        self.assertEqual(len(result["questions"]), 17)

        # Both batches keep 7 of 10 twice: 14 of 20 is under 80%, so there's no quiz.
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            with self.assertRaises(QuizValidationError):
                self.generate({
                    1: [five_questions(bad_ids=bad, count=10), five_questions(bad_ids=bad, count=10)],
                    2: [five_questions(bad_ids=bad, count=10, first=11), five_questions(bad_ids=bad, count=10, first=11)],
                })

    def test_the_best_mix_of_attempts_is_chosen_across_batches(self):
        # Batch 2's first try keeps 5 of 10, its retry 4 of 7: neither passes on its own, and the
        # retry has fewer questions. But 10 + 4 = 14 of 17 passes the quiz's 80% rule, while
        # 10 + 5 = 15 of 20 doesn't, so the retry is the one used.
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            result = self.generate({
                1: [five_questions(count=10)],
                2: [five_questions(bad_ids={1, 2, 3, 4, 5}, count=10, first=11), five_questions(bad_ids={1, 2, 3}, count=7, first=11)],
            })

        self.assertEqual(len(result["questions"]), 14)

    def test_too_few_questions_overall_retries_the_batches_that_can_help(self):
        # 20 asked: batch 1 writes 1 question, batch 2 says its pages have nothing to ask.
        # 1 question is too few, so batch 1 tries again (batch 2 isn't asked twice).
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            result = self.generate({1: [five_questions(count=1), five_questions(count=4)], 2: [INSUFFICIENT]}, parallel=False)

        self.assertEqual(self.calls(1), 2)
        self.assertEqual(self.calls(2), 1)
        self.assertEqual(len(result["questions"]), 4)

    def test_repeats_across_batches_can_make_a_quiz_too_small(self):
        # 11 asked (6 + 5). Each batch writes the same 2 questions: 2 distinct, so both retry.
        with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
            result = self.generate(
                {1: [five_questions(count=2), five_questions(count=6)], 2: [five_questions(count=2), five_questions(count=5, first=7)]},
                count=11,
            )

        self.assertEqual(self.calls(), 4)
        self.assertEqual(len(result["questions"]), 11)

    def test_a_timed_out_batch_fails_the_quiz_with_its_message(self):
        def create(**request):
            if "PART 2 OF" in request["instructions"]:
                raise APITimeoutError(SimpleNamespace())
            return SimpleNamespace(status="completed", output_text=json.dumps(five_questions(count=10)))

        with (
            patch.dict(os.environ, {"LLM_API_KEY": "test-only-key"}),
            patch("backend.services.quiz_generation.OpenAI") as factory,
        ):
            factory.return_value.__enter__.return_value.responses.create.side_effect = create
            with self.assertLogs("backend.services.quiz_generation", level="WARNING"):
                with self.assertRaisesRegex(LLMError, "took too long"):
                    generate_quiz(LECTURE_TEXT, question_count=20)


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
            (APITimeoutError(request), "took too long"),
            (
                RateLimitError(
                    provider_message,
                    response=SimpleNamespace(request=request, status_code=429, headers={}),
                    body=None,
                ),
                "busy right now",
            ),
            (
                AuthenticationError(
                    provider_message,
                    response=SimpleNamespace(request=request, status_code=401, headers={}),
                    body=None,
                ),
                "isn't available right now",
            ),
            (OpenAIError(provider_message), "couldn't write your quiz"),
        )
        with (
            patch.dict(os.environ, {"LLM_API_KEY": "test-only-key"}),
            patch("backend.services.quiz_generation.OpenAI") as factory,
        ):
            client = factory.return_value.__enter__.return_value
            for error, message in errors:
                with self.subTest(error=type(error).__name__):
                    client.responses.create.side_effect = error
                    with (
                        self.assertLogs("backend.services.quiz_generation", level="WARNING"),
                        self.assertRaisesRegex(LLMError, message) as raised,
                    ):
                        generate_quiz(self.SOURCE, question_count=1)
                    self.assertNotIn(provider_message, str(raised.exception))
                    for jargon in ("OpenAI", "LLM_API_KEY", "quota", "API"):
                        self.assertNotIn(jargon, str(raised.exception))

    def test_rejects_invalid_input_before_api_call(self):
        invalid_cases = [
            ("", 5),
            ("Text without page markers", 5),
            (self.SOURCE, 0),
            (self.SOURCE, 21),
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
