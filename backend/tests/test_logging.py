import json
import logging
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.core.logging import (
    RequestContextFilter,
    RequestLoggingMiddleware,
    StructuredJsonFormatter,
    configure_logging,
)


class LoggingConfigurationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.root = logging.getLogger()
        self.original_handlers = list(self.root.handlers)
        self.original_level = self.root.level

    def tearDown(self) -> None:
        for handler in list(self.root.handlers):
            if getattr(handler, "_intellidocs_managed_handler", False):
                self.root.removeHandler(handler)
                handler.close()
        self.root.handlers[:] = self.original_handlers
        self.root.setLevel(self.original_level)

    def test_production_json_configuration_and_rotation(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(
                os.environ,
                {
                    "APP_ENV": "production",
                    "LOG_FORMAT": "auto",
                    "LOG_LEVEL": "DEBUG",
                    "LOG_DIR": directory,
                    "LOG_MAX_BYTES": "1",
                    "LOG_BACKUP_COUNT": "1",
                },
                clear=False,
            ):
                configure_logging()
                logging.getLogger("test.logging").debug(
                    "safe test event",
                    extra={"event": "test_event", "operation": "unit_test"},
                )
                logging.getLogger("test.logging").debug(
                    "second event triggers rotation",
                    extra={"event": "rotation_test"},
                )

            log_file = Path(directory) / "intellidocs-ai.log"
            self.assertTrue(log_file.exists())
            payload = json.loads(Path(f"{log_file}.1").read_text(encoding="utf-8").splitlines()[-1])
            self.assertEqual(payload["message"], "safe test event")
            self.assertEqual(payload["event"], "test_event")
            self.assertEqual(payload["operation"], "unit_test")
            self.assertIn("request_id", payload)
            self.assertTrue(log_file.stat().st_size > 0)

    def test_log_directory_failure_falls_back_without_raising(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            blocking_file = Path(directory) / "not-a-directory"
            blocking_file.write_text("x", encoding="utf-8")
            with patch.dict(
                os.environ,
                {
                    "APP_ENV": "development",
                    "LOG_DIR": str(blocking_file / "logs"),
                },
                clear=False,
            ):
                configure_logging()
                logging.getLogger("test.logging").warning("console fallback is active")

    def test_json_formatter_omits_unapproved_extra_fields(self) -> None:
        record = logging.LogRecord(
            name="app.test",
            level=logging.INFO,
            pathname=__file__,
            lineno=1,
            msg="request completed",
            args=(),
            exc_info=None,
        )
        record.request_id = "request-id"
        record.password = "must-not-appear"

        payload = json.loads(StructuredJsonFormatter().format(record))

        self.assertNotIn("password", payload)


class RequestLoggingMiddlewareTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.logger = logging.getLogger("app.request")
        self.original_handlers = list(self.logger.handlers)
        self.original_propagate = self.logger.propagate
        self.original_level = self.logger.level
        self.records: list[logging.LogRecord] = []
        self.handler = logging.Handler()
        self.handler.emit = self.records.append
        self.handler.addFilter(RequestContextFilter())
        self.logger.handlers[:] = [self.handler]
        self.logger.propagate = False
        self.logger.setLevel(logging.INFO)

    def tearDown(self) -> None:
        self.logger.handlers[:] = self.original_handlers
        self.logger.propagate = self.original_propagate
        self.logger.setLevel(self.original_level)

    async def _invoke(self, app, path: str = "/health") -> list[dict]:
        sent: list[dict] = []
        scope = {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "GET",
            "scheme": "http",
            "path": path,
            "raw_path": path.encode("ascii"),
            "query_string": b"private=query",
            "root_path": "",
            "headers": [],
            "client": ("127.0.0.1", 1234),
            "server": ("testserver", 80),
        }

        async def receive() -> dict:
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(message: dict) -> None:
            sent.append(message)

        await RequestLoggingMiddleware(app)(scope, receive, send)
        return sent

    async def test_logs_response_metadata_and_adds_request_id_header(self) -> None:
        async def app(scope, receive, send) -> None:
            await send({"type": "http.response.start", "status": 204, "headers": []})
            await send({"type": "http.response.body", "body": b""})

        sent = await self._invoke(app)

        response_headers = dict(sent[0]["headers"])
        self.assertIn(b"x-request-id", response_headers)
        record = self.records[-1]
        self.assertEqual(record.status_code, 204)
        self.assertEqual(record.method, "GET")
        self.assertEqual(record.path, "/health")
        self.assertEqual(record.request_id, response_headers[b"x-request-id"].decode())
        self.assertNotIn("private=query", record.getMessage())

    async def test_unhandled_exception_logs_traceback_without_exception_message(self) -> None:
        async def app(scope, receive, send) -> None:
            raise ValueError("private document text must not be logged")

        with self.assertRaisesRegex(ValueError, "private document text"):
            await self._invoke(app)

        record = self.records[-1]
        self.assertEqual(record.status_code, 500)
        self.assertEqual(record.error_type, "ValueError")
        self.assertIn("Traceback", record.stack_trace)
        self.assertNotIn("private document text", record.stack_trace)


if __name__ == "__main__":
    unittest.main()
