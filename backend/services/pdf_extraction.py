import pymupdf


def extract_pdf_text(pdf_path):
    pages = []
    has_text = False

    with pymupdf.open(pdf_path) as document:
        if document.page_count == 0:
            raise ValueError("The PDF contains no pages.")

        for page_number, page in enumerate(document, start=1):
            page_text = page.get_text()

            if page_text.strip():
                has_text = True

            pages.append(f"--- Page {page_number} ---\n{page_text}")

    if not has_text:
        raise ValueError(
            "The PDF contains no extractable text. "
            "It may be blank or contain scanned images requiring OCR."
        )

    return "\n\n".join(pages)


if __name__ == "__main__":
    filename = "test_document.pdf"

    try:
        extracted_text = extract_pdf_text(filename)
        print(extracted_text)

    except pymupdf.FileNotFoundError:
        print(f"Extraction failed: File not found: {filename}")

    except pymupdf.FileDataError:
        print(
            "Extraction failed: The file could not be read as a PDF. "
            "It may be damaged or contain invalid data."
        )

    except ValueError as error:
        print(f"Extraction failed: {error}")
