from google import genai
from app.core.config import settings
from google.genai import types

client = genai.Client(
    api_key=settings.GEMINI_API_KEY,
    http_options={"timeout": 15000}
)

def generate_ai_response(prompt: str) -> str:
    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt
    )

    return response.text or "No response generated."

def generate_document_summary(document_text: str) -> str:
    prompt = f"""
    You are an expert document analyst.

    Analyze the following document and create a clear summary.

    Include:
    1. Main topic
    2. Key points
    3. Important facts and figures
    4. Final conclusion

    Use simple English and clear headings.

    Document:
    {document_text}
    """

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt
    )

    return response.text or "Summary could not be generated."

def ask_document_question(
    document_text: str,
    question: str
) -> str:
    prompt = f"""
    You are an AI document assistant.

    Answer the user's question using ONLY the provided document.

    Rules:
    1. Do not use outside knowledge.
    2. If the answer is not available in the document, clearly say so.
    3. Give clear and concise answers.
    4. Do not invent facts.

    DOCUMENT:
    {document_text}

    QUESTION:
    {question}
    """

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt
    )

    return response.text or "No answer generated."

def generate_embedding(
    text: str,
    task_type: str = "RETRIEVAL_DOCUMENT"
) -> list[float]:

    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config=types.EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=768
        )
    )

    return response.embeddings[0].values


def generate_rag_answer(
    question: str,
    context: str
) -> str:

    prompt = f"""
    You are an AI document assistant.

    Answer the user's question using ONLY the provided context.

    Rules:
1. Do not use outside knowledge.
2. If the answer is not available in the context, clearly say so.
3. Do not invent facts.
4. Give clear and concise answers.
5. Use simple English.
6. Add page citations for every factual statement.
7. Use the citation format [Page X].
8. Use only page numbers provided in the context.
9. If multiple pages support the answer, cite all relevant pages.
    CONTEXT:
    {context}

    QUESTION:
    {question}

    ANSWER:
    """

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt
    )

    return response.text or "No answer generated."


def generate_file_chat_response(
    question: str,
    file_parts: list
) -> str:

    prompt = f"""
    You are IntelliDocs AI, an intelligent AI assistant.

    Answer the user's question using the attached PDF documents
    and images whenever provided.

    Instructions:
    1. Understand the attached files carefully.
    2. Answer the user's question clearly.
    3. Do not invent facts.
    4. If information is missing, say so.
    5. Use simple and clear English.
    6. For PDF-related answers, mention page numbers when possible.
    7. If images are attached, analyze their visible content.

    USER QUESTION:
    {question}
    """

    contents = [prompt, *file_parts]

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=contents
    )

    return response.text or "No response generated."
