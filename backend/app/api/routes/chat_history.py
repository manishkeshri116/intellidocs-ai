
import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.logging import log_exception
from app.core.security import get_current_user
from app.models.user import User
from app.models.chat_history import ChatConversation, ChatMessage
from app.schemas.chat import (
    ChatConversationCreate,
    ChatMessageCreate,
    ChatConversationResponse,
    ChatConversationDetailResponse,
    ChatMessageResponse,
    ATTACHMENT_MESSAGE_PREFIX
)

router = APIRouter(
    prefix="/chat-history",
    tags=["Chat History"]
)
logger = logging.getLogger("app.chat_history")


@router.post("/", response_model=ChatConversationResponse)
def create_conversation(
    request: ChatConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conversation = ChatConversation(
        title=request.title,
        user_id=current_user.id
    )

    try:
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    except Exception as error:
        db.rollback()
        log_exception(
            logger,
            "Conversation creation failed",
            error,
            event="chat_history_operation_failed",
            operation="create_conversation",
        )
        raise

    logger.info(
        "Conversation created",
        extra={
            "event": "chat_conversation_created",
            "operation": "create_conversation",
            "conversation_id": conversation.id,
        },
    )
    return conversation


@router.post("/{conversation_id:int}/messages")
def add_message(
    conversation_id: int,
    request: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id,
        ChatConversation.user_id == current_user.id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if request.role not in ["user", "assistant"]:
        raise HTTPException(status_code=400, detail="Invalid message role")

    message = ChatMessage(
        conversation_id=conversation_id,
        role=request.role,
        content=request.content
    )

    try:
        db.add(message)
        db.commit()
        db.refresh(message)
    except Exception as error:
        db.rollback()
        log_exception(
            logger,
            "Saving chat message failed",
            error,
            event="chat_history_operation_failed",
            operation="save_message",
            conversation_id=conversation_id,
        )
        raise

    logger.info(
        "Chat message saved",
        extra={
            "event": "chat_message_saved",
            "operation": "save_message",
            "conversation_id": conversation_id,
        },
    )
    return {
        "id": message.id,
        "conversation_id": conversation_id,
        "role": message.role,
        "content": message.content,
        "created_at": message.created_at
    }


@router.get("/", response_model=list[ChatConversationResponse])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    latest_message_at = func.max(ChatMessage.created_at)
    conversations = db.query(ChatConversation).outerjoin(
        ChatMessage,
        ChatMessage.conversation_id == ChatConversation.id
    ).filter(
        ChatConversation.user_id == current_user.id
    ).group_by(
        ChatConversation.id
    ).order_by(
        func.coalesce(latest_message_at, ChatConversation.created_at).desc(),
        ChatConversation.id.desc()
    ).all()
    logger.info(
        "Conversation list loaded",
        extra={
            "event": "chat_conversation_list_loaded",
            "operation": "list_conversations",
            "result_count": len(conversations),
        },
    )
    return conversations


@router.get("/{conversation_id:int}", response_model=ChatConversationDetailResponse)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id,
        ChatConversation.user_id == current_user.id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation_id
    ).order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc()).all()

    serialized_messages = []
    for message in messages:
        content = message.content
        attachments = []
        if content.startswith(ATTACHMENT_MESSAGE_PREFIX):
            try:
                payload = json.loads(content[len(ATTACHMENT_MESSAGE_PREFIX):])
                content = payload["content"]
                attachments = payload["attachments"]
            except (KeyError, TypeError, json.JSONDecodeError):
                content = message.content

        serialized_messages.append({
            "id": message.id,
            "role": message.role,
            "content": content,
            "created_at": message.created_at,
            "attachments": attachments
        })

    logger.info(
        "Conversation details loaded",
        extra={
            "event": "chat_conversation_loaded",
            "operation": "get_conversation",
            "conversation_id": conversation_id,
            "result_count": len(serialized_messages),
        },
    )
    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at,
        "messages": serialized_messages
    }


@router.delete("/{conversation_id:int}")
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id,
        ChatConversation.user_id == current_user.id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    try:
        db.delete(conversation)
        db.commit()
    except Exception as error:
        db.rollback()
        log_exception(
            logger,
            "Conversation deletion failed",
            error,
            event="chat_history_operation_failed",
            operation="delete_conversation",
            conversation_id=conversation_id,
        )
        raise

    logger.info(
        "Conversation deleted",
        extra={
            "event": "chat_conversation_deleted",
            "operation": "delete_conversation",
            "conversation_id": conversation_id,
        },
    )
    return {"message": "Conversation deleted successfully"}


@router.delete("/")
def delete_all_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        deleted_count = db.query(ChatConversation).filter(
            ChatConversation.user_id == current_user.id
        ).delete(synchronize_session=False)
        db.commit()
    except Exception as error:
        db.rollback()
        log_exception(
            logger,
            "Bulk conversation deletion failed",
            error,
            event="chat_history_operation_failed",
            operation="delete_all_conversations",
        )
        raise

    logger.info(
        "All user conversations deleted",
        extra={
            "event": "chat_conversations_deleted",
            "operation": "delete_all_conversations",
            "result_count": deleted_count,
        },
    )
    return {"message": "All conversations deleted successfully"}
