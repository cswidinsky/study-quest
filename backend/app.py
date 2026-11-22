import uuid
from pathlib import Path
from tempfile import TemporaryDirectory

import pymupdf
from dotenv import load_dotenv
from flask import Flask, jsonify, request

from backend.services.llm import LLMError
from backend.services.pdf_extraction import extract_pdf_text
from backend.services.quiz_generation import QuizValidationError, generate_quiz

load_dotenv()


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/api/extract")
def extract():
    if "file" not in request.files:
        return jsonify({
            "error": "Upload a PDF using the 'file' field."
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
        "error": "Upload exceeds the 10 MiB request limit. Choose a smaller PDF."
    }), 413
    
quizzes = {}


@app.post("/api/quizzes")
def create_quiz():
    if "file" not in request.files:
        return jsonify({"error": "Upload a PDF using the 'file' field."}), 400

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

    try:
        questions = generate_quiz(text)["questions"]
    except (LLMError, QuizValidationError) as error:
        return jsonify({"error": str(error)}), 502
    except ValueError as error:
        return jsonify({"error": str(error)}), 422

    quiz_id = str(uuid.uuid4())
    quizzes[quiz_id] = questions
    return jsonify({"id": quiz_id, "questions": strip_answers(questions)}), 201


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
def get_quiz(quiz_id):
    questions = quizzes.get(quiz_id)
    if questions is None:
        return jsonify({"error": "Quiz not found."}), 404
    return jsonify({"id": quiz_id, "questions": strip_answers(questions)})


@app.post("/api/quizzes/<quiz_id>/submit")
def submit_quiz(quiz_id):
    questions = quizzes.get(quiz_id)
    if questions is None:
        return jsonify({"error": "Quiz not found."}), 404

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get("answers"), dict):
        return jsonify({"error": "Send your selections in an answers object."}), 400

    submitted = payload["answers"]
    question_ids = {str(question["id"]) for question in questions}
    if set(submitted) != question_ids:
        return jsonify({"error": "Select one answer for every question."}), 400

    results = []
    for question in questions:
        question_id = question["id"]
        selected = submitted[str(question_id)]
        if type(selected) is not int or not 0 <= selected < len(question["options"]):
            return jsonify({"error": f"Invalid option for question {question_id}."}), 400

        results.append({
            "id": question_id,
            "correct": selected == question["correctIndex"],
            "correct_answer": question["correctIndex"],
            "explanation": question["explanation"],
            "sourcePage": question["sourcePage"],
            "sourceSnippet": question["sourceSnippet"],
        })

    score = sum(result["correct"] for result in results)
    return jsonify({"score": score, "total": len(questions), "results": results})
