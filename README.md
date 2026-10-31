# IntelliDocs AI

IntelliDocs AI is an AI-powered document management and chat application. It combines a FastAPI backend with a responsive React dashboard for managing documents, generating summaries, asking questions about documents, and using general AI chat.

## Project structure

```text
intellidocs-ai/
├── backend/   # FastAPI API, PostgreSQL models, and migrations
└── frontend/  # React, TypeScript, Vite, and Tailwind CSS
```

## Requirements

- Python 3.10 or newer
- Node.js 20 or newer and npm
- PostgreSQL
- A Google Gemini API key

## Backend setup

1. Create a PostgreSQL database named `intellidocs_db` (or update the database URL in `backend/app/core/database.py`).
2. Create and activate a virtual environment, then install dependencies:

   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   python -m pip install -r requirements.txt
   ```

3. Create `backend/.env` with the required settings:

   ```dotenv
   GEMINI_API_KEY=your_gemini_api_key
   SECRET_KEY=replace_with_a_long_random_secret
   ```

   Keep this file private; it is excluded from Git.

4. Apply database migrations and start the API:

   ```bash
   alembic upgrade head
   fastapi dev app/main.py
   ```

The API runs at `http://localhost:8000`. Interactive API documentation is available at `http://localhost:8000/docs`.

## Frontend setup

In another terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Vite runs the frontend at `http://localhost:5173` and proxies `/api` requests to `http://localhost:8000`. To use a different backend URL, set `VITE_BACKEND_URL` in `frontend/.env`.

## Main capabilities

- Account signup and JWT-authenticated login
- Document upload and management for PDF, DOCX, and TXT
- AI-generated document summaries and document-grounded Q&A
- General AI chat with PDF and image attachments
- PostgreSQL-backed general chat history, conversation continuation, and deletion

## API areas

- Authentication: `/auth`
- Documents: `/documents`
- General AI chat: `/chat`
- Chat history: `/chat-history`

General chat and document-based Q&A are separate features. Chat messages use the authenticated user's conversations, while document Q&A operates on a selected document.

## Security notes

- Never commit `.env` files, API keys, database credentials, or production secrets.
- Use a unique, strong `SECRET_KEY` outside local development.
- Do not upload sensitive documents unless your deployment and data-handling requirements allow it.
