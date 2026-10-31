
from fastapi import (
    APIRouter,
    HTTPException,
    File,
    Form,
    UploadFile,
    Depends
)
import json
import os

from google.genai import types

from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    FileChatResponse,
    ChatAttachment,
    ATTACHMENT_MESSAGE_PREFIX
)

from app.services.gemini_service import (
    generate_ai_response,
    generate_file_chat_response
)

from app.core.security import get_current_user
from app.models.user import User

from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.chat_history import ChatConversation, ChatMessage

router = APIRouter(
    prefix="/chat",
    tags=["AI Chat"]
)

@router.post("/", response_model=ChatResponse)
def chat_with_ai(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        if request.conversation_id is not None:
            conversation = db.query(ChatConversation).filter(
                ChatConversation.id == request.conversation_id,
                ChatConversation.user_id == current_user.id
            ).first()

            if not conversation:
                raise HTTPException(
                    status_code=404,
                    detail="Conversation not found"
                )
        else:
            conversation = ChatConversation(
                title=request.message[:50],
                user_id=current_user.id
            )
            db.add(conversation)
            db.flush()

        user_message = ChatMessage(
            conversation_id=conversation.id,
            role="user",
            content=request.message
        )
        db.add(user_message)

        answer = generate_ai_response(request.message)

        assistant_message = ChatMessage(
            conversation_id=conversation.id,
            role="assistant",
            content=answer
        )
        db.add(assistant_message)
        db.commit()

        return ChatResponse(
            conversation_id=conversation.id,
            question=request.message,
            answer=answer
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print("GEMINI ERROR:", repr(e))
        raise HTTPException(
            status_code=502,
            detail="AI chat failed. Check backend terminal."
        )

@router.post("/with-files", response_model=FileChatResponse)
def chat_with_files(
    message: str = Form(..., min_length=1, max_length=5000),
    files: list[UploadFile] = File(default=[]),
    conversation_id: int | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not message.strip():
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    if len(files) > 5:
        raise HTTPException(
            status_code=400,
            detail="Maximum 5 files are allowed."
        )

    allowed_types = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp"
    }

    signatures = {
        ".pdf": lambda data: data.startswith(b"%PDF-"),
        ".jpg": lambda data: data.startswith(b"\xff\xd8\xff"),
        ".jpeg": lambda data: data.startswith(b"\xff\xd8\xff"),
        ".png": lambda data: data.startswith(b"\x89PNG\r\n\x1a\n"),
        ".webp": lambda data: (
            data.startswith(b"RIFF") and data[8:12] == b"WEBP"
        )
    }

    validated_files = []
    file_parts = []

    for upload in files:
        extension = os.path.splitext(upload.filename or "")[1].lower()

        if extension not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {extension}"
            )

        content = upload.file.read(10 * 1024 * 1024 + 1)

        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail=f"{upload.filename} exceeds the 10 MB limit."
            )

        if not signatures[extension](content):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file: {upload.filename}"
            )

        file_parts.append(
            types.Part.from_bytes(
                data=content,
                mime_type=allowed_types[extension]
            )
        )

        validated_files.append(
            ChatAttachment(
                filename=upload.filename or "unnamed",
                file_type=extension.lstrip(".")
            )
        )

    try:
        if conversation_id is not None:
            conversation = db.query(ChatConversation).filter(
                ChatConversation.id == conversation_id,
                ChatConversation.user_id == current_user.id
            ).first()

            if not conversation:
                raise HTTPException(
                    status_code=404,
                    detail="Conversation not found"
                )
        else:
            conversation = ChatConversation(
                title=message[:50],
                user_id=current_user.id
            )
            db.add(conversation)
            db.flush()

        user_content = message
        if validated_files:
            user_content = ATTACHMENT_MESSAGE_PREFIX + json.dumps({
                "content": message,
                "attachments": [item.model_dump() for item in validated_files]
            })
        db.add(ChatMessage(
            conversation_id=conversation.id,
            role="user",
            content=user_content
        ))

        if file_parts:
            answer = generate_file_chat_response(
                question=message,
                file_parts=file_parts
            )
        else:
            answer = generate_ai_response(message)

        db.add(ChatMessage(
            conversation_id=conversation.id,
            role="assistant",
            content=answer
        ))
        db.commit()

        return FileChatResponse(
            conversation_id=conversation.id,
            question=message,
            answer=answer,
            attachments=validated_files
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print("FILE CHAT ERROR:", repr(e))

        raise HTTPException(
            status_code=502,
            detail="AI file chat failed. Check backend terminal."
        )
