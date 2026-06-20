from fastapi import FastAPI, UploadFile, File, Form, Request, Depends, HTTPException
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel

from modules.load_vectorstore import load_vectorstore
from modules.llm import get_llm_chain, ask_with_context
from modules.database import init_db
from modules.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    create_user,
    get_user_by_email,
    verify_password,
    create_access_token,
    user_public,
    get_current_user,
)
from modules.conversations import (
    create_conversation,
    list_conversations,
    get_conversation,
    get_messages,
    add_message,
    delete_conversation,
    update_conversation_title,
    format_history_for_download,
)
from logger import logger

app = FastAPI(title="StemMate API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()
    logger.info("Database initialized")


@app.middleware("http")
async def catch_exception_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        logger.exception("UNHANDLED EXCEPTION")
        return JSONResponse(status_code=500, content={"error": str(exc)})


def get_vectorstore_chain():
    from langchain_community.vectorstores import Chroma
    from langchain_community.embeddings import HuggingFaceBgeEmbeddings
    from modules.load_vectorstore import PERSIST_DIR

    vectorstore = Chroma(
        persist_directory=PERSIST_DIR,
        embedding_function=HuggingFaceBgeEmbeddings(model_name="all-MiniLM-L12-v2"),
    )
    return get_llm_chain(vectorstore)


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    if get_user_by_email(data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user = create_user(data.email, data.password, data.full_name, data.grade)
    token = create_access_token(user["id"], user["email"])
    return TokenResponse(access_token=token, user=user_public(user))


@app.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = get_user_by_email(data.email)
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"])
    return TokenResponse(access_token=token, user=user_public(user))


@app.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user_public(user)


# ── Conversations ─────────────────────────────────────────────────────────────

class ConversationCreate(BaseModel):
    title: str = "New chat"
    subject: str = "General"


class ChatRequest(BaseModel):
    content: str
    tutor_mode: Optional[str] = None
    subject: Optional[str] = None


def auto_title(first_message: str) -> str:
    title = first_message.strip()[:48]
    if len(first_message) > 48:
        title += "…"
    return title or "New chat"


@app.get("/conversations/")
async def get_conversations(user: dict = Depends(get_current_user)):
    convs = list_conversations(user["id"])
    return {"conversations": convs}


@app.post("/conversations/")
async def new_conversation(data: ConversationCreate, user: dict = Depends(get_current_user)):
    conv = create_conversation(user["id"], data.title, data.subject)
    return conv


@app.get("/conversations/{conversation_id}")
async def get_conversation_detail(conversation_id: int, user: dict = Depends(get_current_user)):
    conv = get_conversation(conversation_id, user["id"])
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = get_messages(conversation_id)
    return {"conversation": conv, "messages": messages}


@app.delete("/conversations/{conversation_id}")
async def remove_conversation(conversation_id: int, user: dict = Depends(get_current_user)):
    if not delete_conversation(conversation_id, user["id"]):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Deleted"}


@app.get("/conversations/{conversation_id}/download")
async def download_conversation(conversation_id: int, user: dict = Depends(get_current_user)):
    conv = get_conversation(conversation_id, user["id"])
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = get_messages(conversation_id)
    text = format_history_for_download(conv, messages, user["full_name"])
    filename = f"stemmate_{conv['title'][:30].replace(' ', '_')}.txt"
    return PlainTextResponse(
        content=text,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/conversations/{conversation_id}/chat")
async def chat_in_conversation(
    conversation_id: int,
    data: ChatRequest,
    user: dict = Depends(get_current_user),
):
    conv = get_conversation(conversation_id, user["id"])
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    history = get_messages(conversation_id)
    user_msg = add_message(conversation_id, "user", data.content)

    if len(history) == 0:
        update_conversation_title(conversation_id, user["id"], auto_title(data.content))

    try:
        chain = get_vectorstore_chain()
        answer = ask_with_context(
            chain,
            data.content,
            history,
            data.tutor_mode,
            data.subject or conv.get("subject", "General"),
            user.get("grade", "Grade 10"),
        )
    except Exception as e:
        logger.exception("Error processing question")
        raise HTTPException(status_code=500, detail=str(e))

    assistant_msg = add_message(conversation_id, "assistant", answer)
    return {
        "user_message": user_msg,
        "assistant_message": assistant_msg,
        "answer": answer,
    }


# ── Legacy endpoints (still work without auth) ────────────────────────────────

@app.post("/upload_pdfs/")
async def upload_pdfs(files: List[UploadFile] = File(...)):
    try:
        logger.info(f"received {len(files)} files")
        load_vectorstore(files)
        logger.info("documents added to chroma")
        return {"message": "Files processed and vectorstore updated"}
    except Exception as e:
        logger.exception("Error during pdf upload")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/ask/")
async def ask_question(question: str = Form(...)):
    try:
        logger.info(f"User query: {question}")
        chain = get_vectorstore_chain()
        result = ask_with_context(chain, question, [], None, "General", "Grade 10")
        logger.info("Query successful")
        return {"answer": result}
    except Exception as e:
        logger.exception("Error processing question")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/test")
async def test():
    return {"message": "Testing successful..."}
