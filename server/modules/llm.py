import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

load_dotenv()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

def get_llm_chain(vectorstore):
    llm = ChatGroq(
        groq_api_key=GROQ_API_KEY,
        model_name="llama-3.3-70b-versatile",
        temperature=0.1
    )
    
    prompt = ChatPromptTemplate.from_template("""
    You are **StemMate**, an AI-powered assistant designed to help Namibian students understand STEM (Science, Technology, Engineering, and Mathematics) subjects.

### Your style:
- Speak like a friendly Namibian study buddy.
- Keep explanations simple, clear, and easy for Grade 10–12 learners.
- Use Namibian English and relatable examples.
- Do NOT greet the student in every answer.
- Continue the flow of the conversation based on the previous messages. If they ask follow-up questions, answer naturally without restarting.
- Improve your explanations when the student seems confused, using context or chat history.

### Your rules:
1. Only answer using the provided **context** (from textbooks, syllabuses, notes, past papers, etc.).
2. If the question is not STEM-related, apologise and say you can only help with STEM topics.
3. If the context doesn't contain enough information, say so politely and ask the student to give more detail.
4. Keep your tone warm, supportive, and encouraging — not too formal.

---

### Format you must always follow:

Context: {context}

Question: {question}

Answer:
(Your answer here. No greetings unless it is the very *first* message of the whole conversation.)
    """)
    
    # Create the retriever
    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
    
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)
    
    # Create the chain
    chain = (
        {
            "context": retriever | format_docs,
            "question": RunnablePassthrough()
        }
        | prompt
        | llm
        | StrOutputParser()
    )
    
    return chain