import pymupdf
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.chunk import DocumentChunk
from app.services.gemini_service import generate_embedding


def extract_pdf_text(file_path: str) -> list[dict]:
    pages = []

    with pymupdf.open(file_path) as pdf:
        for page_number, page in enumerate(pdf, start=1):
            page_text = page.get_text("text")

            lines = page_text.splitlines()
            cleaned_lines = []
            seen_lines = set()

            for line in lines:
                line = line.strip()

                if not line:
                    continue

                # Remove duplicate lines
                if line in seen_lines:
                    continue

                seen_lines.add(line)

                # Remove common PDF footer lines
                if "billdesk payment gateway" in line.lower():
                    continue

                if "www.billdesk.com" in line.lower():
                    continue

                if line.startswith("http://") or line.startswith("https://"):
                    continue

                if line in {"1/2", "2/2"}:
                    continue

                cleaned_lines.append(line)

            cleaned_text = "\n".join(cleaned_lines)

            if cleaned_text:
                pages.append({
                    "page_number": page_number,
                    "text": cleaned_text
                })

    return pages


def split_text_into_chunks(
    pages: list[dict],
    chunk_size: int = 1000,
    overlap: int = 200
) -> list[dict]:

    chunks = []

    for page in pages:
        text = page["text"]
        page_number = page["page_number"]

        start = 0

        while start < len(text):
            end = start + chunk_size
            chunk_text = text[start:end].strip()

            if chunk_text:
                chunks.append({
                    "content": chunk_text,
                    "page_number": page_number
                })

            start += chunk_size - overlap

    return chunks

def save_document_chunks(
    db: Session,
    document_id: int,
    pages: list[dict]
):
    chunks = split_text_into_chunks(pages)

    for chunk in chunks:
        embedding = generate_embedding(
            chunk["content"],
            task_type="RETRIEVAL_DOCUMENT"
        )

        document_chunk = DocumentChunk(
            document_id=document_id,
            content=chunk["content"],
            page_number=chunk["page_number"],
            embedding=embedding
        )

        db.add(document_chunk)

    return len(chunks)


def search_similar_chunks(
    db: Session,
    document_id: int,
    question: str,
    limit: int = 3,
    threshold: float = 0.40
):
    question_embedding = generate_embedding(
        question,
        task_type="RETRIEVAL_QUERY"
    )

    similarity = DocumentChunk.embedding.cosine_distance(
        question_embedding
    )

    statement = (
        select(
            DocumentChunk,
            (1 - similarity).label("similarity_score")
        )
        .where(DocumentChunk.document_id == document_id)
        .order_by(similarity)
        .limit(limit)
    )

    results = db.execute(statement).all()

    
    relevant_chunks = [
        {
            "chunk": chunk,
            "similarity_score": round(float(score), 4)
        }
        for chunk, score in results
        if score >= threshold
        and len(chunk.content.strip()) >= 100
    ]

    return relevant_chunks
