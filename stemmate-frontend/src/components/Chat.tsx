import { useState } from "react";
import { askQuestion } from "../api/stemmateApi";
import Message from "./Message";
import type { ChatMessage } from "../types/chat";

export default function Chat() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "👋 Welcome to StemMate! I'm your Namibian STEM tutor. Ask me anything about Mathematics, Physics, Biology, Chemistry, or Technology.",
    },
  ]);

  const sendMessage = async () => {
    if (!question.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: question,
    };

    setMessages((prev) => [...prev, userMessage]);

    const currentQuestion = question;
    setQuestion("");

    try {
      setLoading(true);

      const response = await askQuestion(currentQuestion);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.answer,
        },
      ]);
    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't answer that right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        maxWidth: "900px",
        width: "100%",
        margin: "0 auto",
      }}
    >
      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px",
        }}
      >
        {messages.map((message, index) => (
          <Message key={index} message={message} />
        ))}

        {loading && (
          <Message
            message={{
              role: "assistant",
              content: "Thinking...",
            }}
          />
        )}
      </div>

      {/* Input */}
      <div
        style={{
          padding: "20px",
          borderTop: "1px solid #e5e7eb",
          background: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "10px",
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && sendMessage()
            }
            placeholder="Ask a STEM question..."
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "12px",
              border: "1px solid #d1d5db",
              fontSize: "15px",
            }}
          />

          <button
            onClick={sendMessage}
            disabled={loading}
            style={{
              background: "#003580",
              color: "white",
              border: "none",
              padding: "0 20px",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}