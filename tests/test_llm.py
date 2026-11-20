import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from openai import OpenAIError

from backend.services.llm import LLMError, generate_questions, summarize_lecture


class TestLLMService(unittest.TestCase):
    def test_empty_input_does_not_contact_openai(self):
        with patch("backend.services.llm.OpenAI") as client:
            with self.assertRaises(ValueError):
                summarize_lecture("   ")

            client.assert_not_called()

    def test_missing_key_does_not_contact_openai(self):
        with patch.dict(os.environ, {}, clear=True):
            with patch("backend.services.llm.OpenAI") as client:
                with self.assertRaises(LLMError):
                    summarize_lecture("Cells are the basic units of life.")

                client.assert_not_called()

    def test_returns_summary(self):
        source = "--- Page 1 ---\nCells are the basic units of life."

        with patch.dict(
            os.environ,
            {"LLM_API_KEY": "test-only-key", "LLM_MODEL": "test-model"},
        ):
            with patch("backend.services.llm.OpenAI") as factory:
                client = factory.return_value.__enter__.return_value
                client.responses.create.return_value = SimpleNamespace(
                    status="completed",
                    output_text="  Cells are the basic units of life.  ",
                )

                summary = summarize_lecture(source)

                self.assertEqual(
                    summary,
                    "Cells are the basic units of life.",
                )
                request = client.responses.create.call_args.kwargs
                self.assertEqual(request["input"], source)
                self.assertEqual(request["model"], "test-model")
                self.assertFalse(request["store"])

    def test_generate_questions_returns_questions(self):
        payload = '{"questions": [{"text": "Q?", "choices": ["A", "B"], "answer": 1}]}'

        with patch.dict(
            os.environ,
            {"LLM_API_KEY": "test-only-key", "LLM_MODEL": "test-model"},
        ):
            with patch("backend.services.llm.OpenAI") as factory:
                client = factory.return_value.__enter__.return_value
                client.chat.completions.create.return_value = SimpleNamespace(
                    choices=[SimpleNamespace(message=SimpleNamespace(content=payload))]
                )

                questions = generate_questions("Cells are the basic units of life.")

        self.assertEqual(questions[0]["answer"], 1)

    def test_malformed_output_raises_llm_error(self):
        with patch.dict(
            os.environ,
            {"LLM_API_KEY": "test-only-key", "LLM_MODEL": "test-model"},
        ):
            with patch("backend.services.llm.OpenAI") as factory:
                client = factory.return_value.__enter__.return_value
                client.chat.completions.create.return_value = SimpleNamespace(
                    choices=[SimpleNamespace(message=SimpleNamespace(content="not json"))]
                )

                with self.assertRaises(LLMError):
                    generate_questions("Cells are the basic units of life.")

    def test_generate_questions_empty_input_does_not_contact_openai(self):
        with patch("backend.services.llm.OpenAI") as client:
            with self.assertRaises(ValueError):
                generate_questions("   ")

            client.assert_not_called()

    def test_invalid_answer_index_raises_llm_error(self):
        payload = '{"questions": [{"text": "Q?", "choices": ["A", "B"], "answer": 5}]}'

        with patch.dict(
            os.environ,
            {"LLM_API_KEY": "test-only-key", "LLM_MODEL": "test-model"},
        ):
            with patch("backend.services.llm.OpenAI") as factory:
                client = factory.return_value.__enter__.return_value
                client.chat.completions.create.return_value = SimpleNamespace(
                    choices=[SimpleNamespace(message=SimpleNamespace(content=payload))]
                )

                with self.assertRaises(LLMError):
                    generate_questions("Cells are the basic units of life.")

    def test_api_error_raises_llm_error(self):
        with patch.dict(
            os.environ,
            {"LLM_API_KEY": "test-only-key", "LLM_MODEL": "test-model"},
        ):
            with patch("backend.services.llm.OpenAI") as factory:
                client = factory.return_value.__enter__.return_value
                client.chat.completions.create.side_effect = OpenAIError("boom")

                with self.assertRaises(LLMError):
                    generate_questions("Cells are the basic units of life.")

if __name__ == "__main__":
    unittest.main()