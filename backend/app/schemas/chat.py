
from pydantic import BaseModel, Field
from datetime import datetime

ATTACHMENT_MESSAGE_PREFIX = "INTELLIDOCS_CHAT_ATTACHMENTS_V1:"

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=5000)
    conversation_id: int | None = None


class ChatAttachment(BaseModel):
    filename: str
    file_type: str


class ChatResponse(BaseModel):
    conversation_id: int
    question: str
    answer: str
    attachments: list[ChatAttachment] = Field(default_factory=list)


class DocumentQuestionRequest(BaseModel):
    question: str = Field(
        min_length=1,
        max_length=5000
    )


class DocumentSource(BaseModel):
    page_number: int
    content: str
    similarity_score: float


class DocumentQuestionResponse(BaseModel):
    document_id: int
    question: str
    answer: str
    sources: list[DocumentSource]


class FileChatResponse(BaseModel):
    conversation_id: int
    question: str
    answer: str
    attachments: list[ChatAttachment] = Field(default_factory=list)

class ChatConversationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class ChatMessageCreate(BaseModel):
    role: str
    content: str


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime
    attachments: list[ChatAttachment] = Field(default_factory=list)


class ChatConversationResponse(BaseModel):
    id: int
    title: str
    created_at: datetime


class ChatConversationDetailResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    messages: list[ChatMessageResponse]
