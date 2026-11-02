
import logging
import os
import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    UploadFile,
    HTTPException
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.logging import log_exception
from app.core.security import get_current_user

from app.models.document import Document
from app.models.user import User

from app.utils.file_validator import validate_file

from app.services.document_service import (
    extract_pdf_text,
    save_document_chunks,
    search_similar_chunks
)

from app.services.gemini_service import (
    generate_document_summary,
    generate_rag_answer
)

from app.schemas.chat import (
    DocumentQuestionRequest,
    DocumentQuestionResponse
)


router = APIRouter(
    prefix="/documents",
    tags=["Documents"]
)
logger = logging.getLogger("app.documents")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# --------------------------------
# Upload Document
# --------------------------------

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    extension = await validate_file(file)

    unique_filename = f"{uuid.uuid4()}{extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        # Save uploaded file
        with open(file_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                buffer.write(chunk)

        # Extract PDF text page-wise
        extracted_text = None
        pages = []

        if extension == ".pdf":
            pages = extract_pdf_text(file_path)

            extracted_text = "\n\n".join(
                f"--- Page {page['page_number']} ---\n{page['text']}"
                for page in pages
            )

        # Create document record
        document = Document(
            filename=file.filename,
            file_type=extension.lstrip("."),
            file_path=file_path,
            user_id=current_user.id,
            extracted_text=extracted_text
        )

        db.add(document)
        db.flush()

        # Generate and save chunks
        total_chunks = 0

        if pages:
            total_chunks = save_document_chunks(
                db=db,
                document_id=document.id,
                pages=pages
            )

        # Commit transaction
        db.commit()
        db.refresh(document)

        logger.info(
            "Document uploaded and indexed",
            extra={
                "event": "document_upload_succeeded",
                "operation": "upload",
                "entity_type": "document",
                "entity_id": document.id,
                "file_type": extension.lstrip("."),
                "file_size_bytes": getattr(file, "size", None),
                "page_count": len(pages),
                "chunk_count": total_chunks,
            },
        )
        return {
            "message": "Document uploaded successfully",
            "document_id": document.id,
            "filename": document.filename,
            "total_chunks": total_chunks
        }

    except Exception as error:
        db.rollback()

        if os.path.exists(file_path):
            os.remove(file_path)

        log_exception(
            logger,
            "Document upload failed",
            error,
            event="document_upload_failed",
            operation="upload",
            file_type=extension.lstrip("."),
            file_size_bytes=getattr(file, "size", None),
        )

        raise HTTPException(
            status_code=500,
            detail="Document upload failed"
        )


# --------------------------------
# Generate Document Summary
# --------------------------------

@router.post("/{document_id}/summary")
def generate_summary(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    if document.summary:
        logger.info(
            "Returning cached document summary",
            extra={
                "event": "document_summary_cache_hit",
                "operation": "summary",
                "entity_type": "document",
                "entity_id": document.id,
            },
        )
        return {
            "document_id": document.id,
            "summary": document.summary,
            "cached": True
        }

    if not document.extracted_text:
        raise HTTPException(
            status_code=400,
            detail="Document text is not available"
        )

    try:
        summary = generate_document_summary(
            document.extracted_text
        )

        document.summary = summary

        db.commit()
        db.refresh(document)

        logger.info(
            "Document summary generated",
            extra={
                "event": "document_summary_succeeded",
                "operation": "summary",
                "entity_type": "document",
                "entity_id": document.id,
            },
        )
        return {
            "document_id": document.id,
            "summary": summary,
            "cached": False
        }

    except Exception as error:
        db.rollback()

        log_exception(
            logger,
            "Document summary generation failed",
            error,
            event="document_summary_failed",
            operation="summary",
            entity_type="document",
            entity_id=document.id,
        )

        raise HTTPException(
            status_code=502,
            detail="AI summary generation failed"
        )


# --------------------------------
# Ask Questions About Document
# --------------------------------

@router.post(
    "/{document_id}/ask",
    response_model=DocumentQuestionResponse
)
def ask_document(
    document_id: int,
    request: DocumentQuestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    if not document.extracted_text:
        raise HTTPException(
            status_code=400,
            detail="Document text is not available"
        )

    try:
        relevant_chunks = search_similar_chunks(
            db=db,
            document_id=document.id,
            question=request.question,
            limit=3
        )

        if not relevant_chunks:
            raise HTTPException(
                status_code=404,
                detail="No relevant document chunks found"
            )
        # Build context with page numbers
        context = "\n\n".join(
            f"[Page {item['chunk'].page_number}]\n{item['chunk'].content}"
            for item in relevant_chunks
        )

        answer = generate_rag_answer(
            question=request.question,
            context=context
        )

        sources = [
            {
                "page_number": item["chunk"].page_number,
                "content": item["chunk"].content,
                "similarity_score": item["similarity_score"]
            }
            for item in relevant_chunks
        ]

        logger.info(
            "Document question answered",
            extra={
                "event": "document_rag_succeeded",
                "operation": "rag_question",
                "entity_type": "document",
                "entity_id": document.id,
                "chunk_count": len(relevant_chunks),
            },
        )
        return DocumentQuestionResponse(
            document_id=document.id,
            question=request.question,
            answer=answer,
            sources=sources
        )

    except HTTPException:
        raise

    except Exception as error:
        log_exception(
            logger,
            "Document RAG question failed",
            error,
            event="document_rag_failed",
            operation="rag_question",
            entity_type="document",
            entity_id=document.id,
        )

        raise HTTPException(
            status_code=502,
            detail="RAG document question failed"
        )


@router.get("/")
def get_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    documents = db.query(Document).filter(
        Document.user_id == current_user.id
    ).order_by(
        Document.created_at.desc()
    ).all()

    return {
        "total": len(documents),
        "documents": [
            {
                "id": document.id,
                "filename": document.filename,
                "file_type": document.file_type,
                "created_at": document.created_at,
                "summary_available": bool(document.summary)
            }
            for document in documents
        ]
    }

@router.get("/{document_id}")
def get_document_details(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    return {
        "id": document.id,
        "filename": document.filename,
        "file_type": document.file_type,
        "created_at": document.created_at,
        "summary_available": bool(document.summary),
        "extracted_text_available": bool(document.extracted_text)
    }

@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    try:
        if os.path.exists(document.file_path):
            os.remove(document.file_path)

        db.delete(document)
        db.commit()

    except Exception as error:
        db.rollback()
        log_exception(
            logger,
            "Document deletion failed",
            error,
            event="document_delete_failed",
            operation="delete",
            entity_type="document",
            entity_id=document_id,
        )

        raise HTTPException(
            status_code=500,
            detail="Document deletion failed"
        )

    logger.info(
        "Document deleted",
        extra={
            "event": "document_delete_succeeded",
            "operation": "delete",
            "entity_type": "document",
            "entity_id": document_id,
        },
    )
    return {
        "message": "Document deleted successfully",
        "document_id": document_id
    }