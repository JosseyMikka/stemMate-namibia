import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Message from "./Message";
import UploadModal from "./UploadModal";
import { sendChatMessage, downloadConversation, getConversation } from "../api/stemmateApi";
import type { ChatMessage, Conversation, StemSubject, TutorMode } from "../types/chat";
import { SUBJECTS, TUTOR_MODES, WELCOME_MESSAGE } from "../types/chat";

const QUICK_PROMPTS = [
  "Explain photosynthesis simply",
  "Help me with quadratic equations",
  "What is Newton's first law?",
  "Quiz me on the periodic table",
];

interface Props {
  conversation: Conversation | null;
  onConversationUpdate: () => void;
}

export default function Chat({ conversation, onConversationUpdate }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tutorMode, setTutorMode] = useState<TutorMode>(null);
  const [subject, setSubject] = useState<StemSubject>("General");
  const [showUpload, setShowUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!conversation) {
      setMessages([WELCOME_MESSAGE]);
      return;
    }

    const load = async () => {
      const data = await getConversation(conversation.id);
      setSubject((data.conversation.subject as StemSubject) || "General");
      if (data.messages.length === 0) {
        setMessages([WELCOME_MESSAGE]);
      } else {
        setMessages(data.messages);
      }
    };
    load();
  }, [conversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || !conversation || loading) return;

    const userMessage: ChatMessage = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      setLoading(true);
      const response = await sendChatMessage(conversation.id, content, tutorMode, subject);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.answer },
      ]);
      onConversationUpdate();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't answer that right now. Please check that the server is running and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleDownload = async () => {
    if (!conversation) return;
    try {
      const blob = await downloadConversation(conversation.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stemmate_${conversation.title.slice(0, 30).replace(/\s/g, "_")}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not download chat history.");
    }
  };

  const showQuickPrompts = messages.length <= 1 && !loading;

  return (
    <>
      <header className="chat-header">
        <div className="chat-header-left">
          <select
            className="subject-select"
            value={subject}
            onChange={(e) => setSubject(e.target.value as StemSubject)}
            title="Subject focus"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s === "General" ? "📚 All subjects" : s}
              </option>
            ))}
          </select>
        </div>
        <div className="chat-header-actions">
          <button type="button" className="header-btn" onClick={() => setShowUpload(true)}>
            📄 Upload PDFs
          </button>
          {conversation && messages.length > 1 && (
            <button type="button" className="header-btn" onClick={handleDownload}>
              ⬇ Download
            </button>
          )}
        </div>
      </header>

      <div className="messages-container">
        <div className="messages-inner">
          {showQuickPrompts && (
            <div className="quick-prompts">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="quick-prompt-btn"
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {messages.map((message, index) => (
            <Message key={message.id ?? index} message={message} />
          ))}

          {loading && (
            <Message
              message={{ role: "assistant", content: "" }}
              isTyping
            />
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="chat-input-area">
        <div className="tutor-modes">
          {TUTOR_MODES.map((mode) => (
            <button
              key={mode.label}
              type="button"
              className={`tutor-mode-btn ${tutorMode === mode.id ? "active" : ""}`}
              onClick={() => setTutorMode(mode.id)}
            >
              {mode.icon} {mode.label}
            </button>
          ))}
        </div>

        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              tutorMode === "quiz"
                ? "Ask for a quiz on any topic…"
                : "Ask your STEM question… (Enter to send)"
            }
            rows={1}
            disabled={!conversation || loading}
          />
          <button
            type="button"
            className="send-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim() || !conversation || loading}
            title="Send"
          >
            ➤
          </button>
        </div>
        <p className="chat-disclaimer">
          StemMate tutors using NSSC-aligned materials. Always verify with your teacher.
        </p>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </>
  );
}
