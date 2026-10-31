# IntelliDocs AI frontend

Responsive React + TypeScript dashboard for the IntelliDocs AI FastAPI service.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

By default, Vite proxies `/api` requests to `http://localhost:8000` so local development works without changing backend CORS settings. Set `VITE_BACKEND_URL` in `.env` if the backend listens elsewhere. Set `VITE_API_URL` to the API origin or proxy path appropriate for your deployment.

## Backend integration

The frontend uses the backend's existing `/auth/signup`, `/auth/login`, `/auth/me`, `/documents`, `/chat/`, `/chat/with-files`, and `/chat-history/` routes. Login uses the OAuth2 form-encoded `username` and `password` fields and stores the returned bearer access token in browser local storage. General AI chat sends `{ "message": "...", "conversation_id": 123 }` to `POST /chat/` when continuing a chat (omitting the ID for a new conversation), and displays the returned `question`, `answer`, and `conversation_id`.

Password reset, document preview, and extracted-text retrieval are not exposed by the current API. General AI conversation history and messages are loaded from PostgreSQL through `/chat-history/`; the active conversation is restored from its URL. Text-only turns use `POST /chat/`; turns with PDF/image attachments use multipart `POST /chat/with-files`, with the prompt in `message`, the optional active conversation ID in `conversation_id`, and each file appended under the repeated `files` field. The chat route saves both messages automatically. Document Q&A remains a separate feature, and its history is retained in browser-local storage.
