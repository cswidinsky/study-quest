from pathlib import Path
from tempfile import TemporaryDirectory

import pymupdf
from flask import Flask, jsonify, request

from backend.services.pdf_extraction import extract_pdf_text

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
        questions = generate_questions(text[:15000])
    except ValueError:
        return jsonify({"error": "The AI returned an unusable quiz. Please try again."}), 502
    except Exception:
        return jsonify({"error": "Quiz generation failed. Please try again."}), 502

    for i, q in enumerate(questions, start=1):
        q["id"] = i

    quiz_id = str(uuid.uuid4())
    quizzes[quiz_id] = questions
    return jsonify({"id": quiz_id, "questions": strip_answers(questions)}), 201


def strip_answers(questions):
    return [{"id": q["id"], "text": q["text"], "choices": q["choices"]} for q in questions]


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

    submitted = (request.get_json(silent=True) or {}).get("answers", {})
    results = [
        {"id": q["id"], "correct": submitted.get(str(q["id"])) == q["answer"],
         "correct_answer": q["answer"]}
        for q in questions
    ]
    score = sum(r["correct"] for r in results)
    return jsonify({"score": score, "total": len(questions), "results": results})
