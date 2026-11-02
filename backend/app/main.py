
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI

from app.core.config import settings
from app.core.logging import RequestLoggingMiddleware, configure_logging

from app.api.routes.chat import router as chat_router
from app.api.routes.chat_history import router as chat_history_router
from app.api.routes.auth import router as auth_router
from app.api.routes.documents import router as documents_router

logger = logging.getLogger("app.lifecycle")


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    logger.info(
        "Application startup complete",
        extra={"event": "application_started", "operation": "startup"},
    )
    try:
        yield
    finally:
        logger.info(
            "Application shutdown complete",
            extra={"event": "application_stopped", "operation": "shutdown"},
        )


app = FastAPI(
    title=settings.APP_NAME,
    description="IntelliDocs AI is an AI-powered document management system that allows users to upload, search, and manage their documents with ease.",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)
app.add_middleware(RequestLoggingMiddleware)


@app.get("/")
def home():
    return {
        "message": "Welcome to IntelliDocs AI!",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "message": "The API is running smoothly.",
    }


app.include_router(chat_router)
app.include_router(chat_history_router)
app.include_router(auth_router)
app.include_router(documents_router)
