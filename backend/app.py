import uuid
from functools import wraps
from pathlib import Path
from tempfile import TemporaryDirectory

import pymupdf
from dotenv import load_dotenv
from flask import Flask, jsonify, make_response, request

from backend.services.llm import LLMError
from backend.services.pdf_extraction import extract_pdf_text
from backend.services.quiz_generation import MAX_QUESTIONS, QuizValidationError, generate_quiz
from backend.services.quiz_store import InvalidSessionError, QuizStore, QuizStoreError

load_dotenv()

QUIZ_BUILD_FAILED = "We couldn't build a quiz from that PDF. Try again, or try a different file."


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/api/extract")
def extract():
    if "file" not in request.files:
        return jsonify({
            "error": "Choose a PDF to upload."
        }), 400

    uploaded_file = request.files["file"]

    if not uploaded_file.filename:
        return jsonify({"error": "No file was selected."}), 400

    with TemporaryDirectory() as folder:
        pdf_path = Path(folder) / "upload.pdf"
        uploaded_file.save(str(pdf_path))

        try:
            text = extract_pdf_text(str(pdf_path))

        except pymupdf.FileDataError:
            response = jsonify({
                "error": "The uploaded file could not be read as a PDF."
            })
            status_code = 400

        except ValueError as error:
            response = jsonify({"error": str(error)})
            status_code = 400

        else:
            response = jsonify({"text": text})
            status_code = 200

    return response, status_code


@app.errorhandler(413)
def upload_too_large(_error):
    return jsonify({
        "error": "That PDF is too big to upload. Choose one under 4 MB."
    }), 413


def require_quiz_user(route):
    @wraps(route)
    def protected_route(**params):
        authorization = request.authorization
        if not authorization or authorization.type != "bearer" or not authorization.token:
            return jsonify({"error": "Sign in to access quizzes."}), 401

        try:
            store = QuizStore.from_environment()
            owner_id = store.authenticate(authorization.token)
            response = make_response(route(store, owner_id, **params))
        except InvalidSessionError:
            return jsonify({"error": "Your sign-in expired or is invalid. Sign in again."}), 401
        except QuizStoreError as error:
            app.logger.warning("Supabase quiz request failed (status %s)", error.status)
            return jsonify({"error": str(error)}), 503

        response.headers["Cache-Control"] = "no-store"
        return response

    return protected_route


# How many questions to ask for: the form field "question_count", clamped to 1–MAX_QUESTIONS (20; default 5).
DEFAULT_QUESTION_COUNT = 5


def requested_question_count(raw):
    try:
        count = int(str(raw).strip())
    except (TypeError, ValueError):
        return DEFAULT_QUESTION_COUNT
    return max(1, min(MAX_QUESTIONS, count))


@app.post("/api/quizzes")
@require_quiz_user
def create_quiz(store, owner_id):
    if "file" not in request.files:
        return jsonify({"error": "Choose a PDF to upload."}), 400

    uploaded_file = request.files["file"]
    if not uploaded_file.filename:
        return jsonify({"error": "No file was selected."}), 400

    with TemporaryDirectory() as folder:
        pdf_path = Path(folder) / "upload.pdf"
        uploaded_file.save(str(pdf_path))
        try:
            text = extract_pdf_text(str(pdf_path))
        except pymupdf.FileDataError:
            return jsonify({"error": "The uploaded file could not be read as a PDF."}), 400
        except ValueError as error:
            return jsonify({"error": str(error)}), 400

    question_count = requested_question_count(request.form.get("question_count"))
    try:
        questions = generate_quiz(text, question_count=question_count)["questions"]
    except QuizValidationError as error:
        # The details (which check failed) are for us, not the student.
        app.logger.warning("Quiz generation produced no usable quiz: %s", error)
        return jsonify({"error": QUIZ_BUILD_FAILED}), 502
    except LLMError as error:
        return jsonify({"error": str(error)}), 502
    except ValueError as error:
        return jsonify({"error": str(error)}), 422

    quiz_id = str(uuid.uuid4())
    store.create_quiz(quiz_id, owner_id, questions)
    # "requested": how many were asked for; fewer can come back when some fail the source check.
    return jsonify({"id": quiz_id, "requested": question_count, "questions": strip_answers(questions)}), 201


def strip_answers(questions):
    return [
        {
            "id": question["id"],
            "text": question["question"],
            "choices": question["options"],
            "difficulty": question["difficulty"],
        }
        for question in questions
    ]


@app.get("/api/quizzes/<quiz_id>")
@require_quiz_user
def get_quiz(store, owner_id, quiz_id):
    questions = store.get_quiz(quiz_id, owner_id)
    if questions is None:
        return jsonify({"error": "Quiz not found."}), 404
    return jsonify({"id": quiz_id, "questions": strip_answers(questions)})


@app.post("/api/quizzes/<quiz_id>/submit")
@require_quiz_user
def submit_quiz(store, owner_id, quiz_id):
    questions = store.get_quiz(quiz_id, owner_id)
    if questions is None:
        return jsonify({"error": "Quiz not found."}), 404

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get("answers"), dict):
        return jsonify({"error": "Something went wrong sending your answers. Try submitting again."}), 400

    submitted = payload["answers"]
    question_ids = {str(question["id"]) for question in questions}
    if set(submitted) != question_ids:
        return jsonify({"error": "Select one answer for every question."}), 400

    results = []
    for question in questions:
        question_id = question["id"]
        selected = submitted[str(question_id)]
        if type(selected) is not int or not 0 <= selected < len(question["options"]):
            return jsonify({"error": "One of your answers couldn't be read. Check your answers and submit again."}), 400

        results.append({
            "id": question_id,
            "correct": selected == question["correctIndex"],
            "correct_answer": question["correctIndex"],
            "explanation": question["explanation"],
            "sourcePage": question["sourcePage"],
            "sourceSnippet": question["sourceSnippet"],
        })

    score = sum(result["correct"] for result in results)
    return jsonify(store.save_result(quiz_id, owner_id, {
        "answers": submitted,
        "score": score,
        "total": len(questions),
        "results": results,
    }))


@app.get("/api/quizzes/<quiz_id>/result")
@require_quiz_user
def get_result(store, owner_id, quiz_id):
    result = store.get_result(quiz_id, owner_id)
    if result is None:
        return jsonify({"error": "Quiz result not found."}), 404
    return jsonify(result)
