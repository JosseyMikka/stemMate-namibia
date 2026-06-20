import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

load_dotenv()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

TUTOR_MODE_HINTS = {
    "explain": "Explain this in simple terms suitable for a Namibian Grade 10–12 learner. Use step-by-step breakdown.",
    "example": "Give a clear, relatable Namibian example to illustrate this concept.",
    "quiz": "Create a short interactive quiz (3 questions) on this topic. After each question, wait for the student's answer before revealing the solution.",
    "past_paper": "Frame your answer like a Namibian NSSC past-paper question with marking guidance.",
    "practice": "Give the student a practice problem to solve, then guide them step-by-step if they get stuck.",
}


def format_history(history: list[dict]) -> str:
    if not history:
        return "No previous messages."
    lines = []
    for msg in history[-8:]:
        role = "Student" if msg["role"] == "user" else "StemMate"
        lines.append(f"{role}: {msg['content']}")
    return "\n".join(lines)


def build_question(question: str, history: list[dict], tutor_mode: str | None, subject: str, grade: str) -> str:
    parts = [f"Subject: {subject}", f"Student grade: {grade}"]

    if tutor_mode and tutor_mode in TUTOR_MODE_HINTS:
        parts.append(f"Tutor mode: {TUTOR_MODE_HINTS[tutor_mode]}")

    if history:
        parts.append(f"Chat history:\n{format_history(history)}")

    parts.append(f"Current question: {question}")
    return "\n\n".join(parts)


def get_llm_chain(vectorstore):
    llm = ChatGroq(
        groq_api_key=GROQ_API_KEY,
        model_name="llama-3.3-70b-versatile",
        temperature=0.1,
    )

    prompt = ChatPromptTemplate.from_template("""
You are **StemMate**, an AI tutor helping Namibian students master STEM subjects (Mathematics, Physics, Biology, Chemistry, Technology).

### Your style:
- Speak like a friendly Namibian study buddy — warm, encouraging, never condescending.
- Keep explanations clear for Grade 10–12 NSSC learners.
- Use Namibian English and relatable local examples (Windhoek, Etosha, mining, agriculture, etc.) when helpful.
- Do NOT greet the student in every answer — continue the conversation naturally.
- When in quiz mode, ask ONE question at a time and encourage the student to try before giving answers.
- Use bullet points, numbered steps, and simple formatting to make learning interactive.
- If explaining formulas, show the steps clearly.

### Your rules:
1. Answer using the provided **context** (textbooks, syllabuses, notes, past papers) when available.
2. If the question is not STEM-related, politely redirect to STEM topics.
3. If context is insufficient, use your general STEM knowledge but note when you're going beyond the uploaded materials.
4. Encourage the student — celebrate effort and guide them toward understanding.

---

Context: {context}

Student message: {question}

Answer:
""")

    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

    def format_docs(docs):
        if not docs:
            return "No specific context found in uploaded materials."
        return "\n\n".join(doc.page_content for doc in docs)

    chain = (
        {
            "context": retriever | format_docs,
            "question": RunnablePassthrough(),
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    return chain


def ask_with_context(chain, question: str, history: list[dict], tutor_mode: str | None, subject: str, grade: str) -> str:
    formatted = build_question(question, history, tutor_mode, subject, grade)
    return chain.invoke(formatted)
