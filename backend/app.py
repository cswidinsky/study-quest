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