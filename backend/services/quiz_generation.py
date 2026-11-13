import json
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.environ["GROQ_API_KEY"],
)

def generate_questions(text: str, count: int = 5) -> list[dict]:
    prompt = (
        f"Write {count} multiple-choice questions from the text below. "
        'Reply with only JSON in this shape: {"questions": [{"text": "...", '
        '"choices": ["A", "B", "C", "D"], "answer": 0}]}. '
        "answer is the index of the correct choice.\n\n" + text
    )
    response = client.chat.completions.create(
        model="MODEL_NAME_FROM_GROQ_CONSOLE",
        messages=[{"role": "user", "content": prompt}],
    )
    data = json.loads(response.choices[0].message.content)
    questions = data["questions"]

    for q in questions:
        if (
            not isinstance(q.get("text"), str)
            or not isinstance(q.get("choices"), list)
            or len(q["choices"]) < 2
            or not isinstance(q.get("answer"), int)
            or not 0 <= q["answer"] < len(q["choices"])
        ):
            raise ValueError("The AI returned a malformed question.")

    return questions