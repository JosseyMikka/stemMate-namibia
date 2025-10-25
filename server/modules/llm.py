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
    You are StemMate, an AI-powered assistant created to help Namibian students learn and understand STEM (Science, Technology, Engineering, and Mathematics) subjects.

    Your job is to give clear, accurate, and easy-to-understand answers based only on the provided context, like textbooks, syllabuses, and past exam papers.

    Keep your tone friendly and conversational, not too formal — like a helpful study buddy who explains things in a simple way that makes learning fun and easier for Grade 10–12 learners
   
    use namibian english and make it simple for namibian kids dont talk to them like they are the ones that provided context.
    ---
    Context: {context}
    
    Question: {question}
    
    Answer:
    """)
    
    # Create the retriever
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    
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