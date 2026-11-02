import contextvars
import json
import logging
import os
import sys
import time
import traceback
import uuid
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any

from dotenv import dotenv_values


_request_id: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id",
    default="-",
)
_HANDLER_MARKER = "_intellidocs_managed_handler"
_STRUCTURED_FIELDS = (
    "event",
    "method",
    "path",
    "status_code",
    "duration_ms",
    "operation",
    "entity_type",
    "entity_id",
    "file_type",
    "file_size_bytes",
    "page_count",
    "chunk_count",
    "conversation_id",
    "attachment_count",
    "result_count",
    "error_type",
    "stack_trace",
)


class RequestContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = _request_id.get()
        return True


class StructuredJsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(
                record.created,
                tz=timezone.utc,
            ).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }

        for field in _STRUCTURED_FIELDS:
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value

        if record.exc_info:
            payload["exception_type"] = record.exc_info[0].__name__

        return json.dumps(payload, ensure_ascii=True, separators=(",", ":"))


class ReadableFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        message = (
            f"{self.formatTime(record, self.datefmt)} "
            f"{record.levelname:<8} [{record.name}] "
            f"[request_id={getattr(record, 'request_id', '-')}] "
            f"{record.getMessage()}"
        )
        fields = [
            f"{field}={getattr(record, field)}"
            for field in _STRUCTURED_FIELDS
            if getattr(record, field, None) is not None
        ]
        if fields:
            message = f"{message} {' '.join(fields)}"
        return message


def _environment_integer(name: str, default: int, minimum: int = 0) -> int:
    try:
        return max(minimum, int(_environment_value(name, str(default))))
    except (TypeError, ValueError):
        return default


def _environment_value(name: str, default: str) -> str:
    value = os.getenv(name)
    if value is not None:
        return value

    try:
        file_value = dotenv_values(".env").get(name)
    except (OSError, ValueError):
        return default
    return file_value if file_value is not None else default


def _configure_logging() -> None:
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    level_name = _environment_value("LOG_LEVEL", "INFO").strip().upper()
    level = getattr(logging, level_name, logging.INFO)
    if not isinstance(level, int):
        level = logging.INFO
    root_logger.setLevel(level)

    app_environment = _environment_value("APP_ENV", "development").strip().lower()
    requested_format = _environment_value("LOG_FORMAT", "auto").strip().lower()
    use_json = (
        requested_format == "json"
        or (requested_format == "auto" and app_environment in {"prod", "production"})
    )
    formatter: logging.Formatter = (
        StructuredJsonFormatter() if use_json else ReadableFormatter()
    )
    request_filter = RequestContextFilter()

    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)
        if getattr(handler, _HANDLER_MARKER, False):
            try:
                handler.close()
            except OSError:
                pass

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(request_filter)
    setattr(console_handler, _HANDLER_MARKER, True)
    root_logger.addHandler(console_handler)

    log_directory = Path(_environment_value("LOG_DIR", "logs"))
    max_bytes = _environment_integer("LOG_MAX_BYTES", 10 * 1024 * 1024, minimum=1)
    backup_count = _environment_integer("LOG_BACKUP_COUNT", 5)
    try:
        log_directory.mkdir(mode=0o750, parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            log_directory / "intellidocs-ai.log",
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding="utf-8",
        )
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        file_handler.addFilter(request_filter)
        setattr(file_handler, _HANDLER_MARKER, True)
        root_logger.addHandler(file_handler)
    except (OSError, ValueError) as error:
        try:
            sys.stderr.write(
                "WARNING: application log file is unavailable "
                f"({type(error).__name__}); continuing with console logging only.\n"
            )
        except OSError:
            pass

    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").disabled = True


def configure_logging() -> None:
    """Configure application logging without allowing logging setup to break startup."""
    try:
        _configure_logging()
    except Exception as error:
        try:
            root_logger = logging.getLogger()
            if not root_logger.handlers:
                root_logger.addHandler(logging.StreamHandler(sys.stdout))
            sys.stderr.write(
                "WARNING: logging configuration failed "
                f"({type(error).__name__}); continuing with console logging.\n"
            )
        except OSError:
            pass


def log_exception(
    logger: logging.Logger,
    message: str,
    error: BaseException,
    **fields: Any,
) -> None:
    """Log exception type and traceback frames without unsafe exception messages."""
    if getattr(error, "_intellidocs_logged", False):
        return

    frames = traceback.extract_tb(error.__traceback__) if error.__traceback__ else []
    stack_trace = "Traceback (most recent call last):\n" + "".join(
        f'  File "{frame.filename}", line {frame.lineno}, in {frame.name}\n'
        for frame in frames
    )
    logger.error(
        message,
        extra={
            **fields,
            "error_type": type(error).__name__,
            "stack_trace": stack_trace.rstrip(),
        },
    )
    try:
        setattr(error, "_intellidocs_logged", True)
    except (AttributeError, TypeError):
        pass


def _safe_request_path(path: Any) -> str:
    value = str(path)
    safe_value = "".join(
        character if character.isprintable() else f"\\u{ord(character):04x}"
        for character in value
    )
    return safe_value[:1024]


class RequestLoggingMiddleware:
    """ASGI middleware that logs one sanitized access/error event per request."""

    def __init__(self, app: Any) -> None:
        self.app = app
        self.logger = logging.getLogger("app.request")

    async def __call__(self, scope: dict, receive: Any, send: Any) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = str(uuid.uuid4())
        token = _request_id.set(request_id)
        started = time.perf_counter()
        status_code = 500
        method = scope.get("method", "UNKNOWN")
        path = _safe_request_path(scope.get("path", "/"))

        async def send_with_request_id(message: dict) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode("ascii")))
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        except Exception as error:
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            log_exception(
                self.logger,
                "Unhandled request exception",
                error,
                event="request_failed",
                method=method,
                path=path,
                status_code=status_code,
                duration_ms=duration_ms,
            )
            raise
        else:
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            self.logger.info(
                "HTTP request completed",
                extra={
                    "event": "request_completed",
                    "method": method,
                    "path": path,
                    "status_code": status_code,
                    "duration_ms": duration_ms,
                },
            )
        finally:
            _request_id.reset(token)
