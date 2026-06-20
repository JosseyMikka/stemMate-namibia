import type { ChatMessage } from "../types/chat";
import MessageContent from "./MessageContent";

interface Props {
  message: ChatMessage;
  isTyping?: boolean;
}

export default function Message({ message, isTyping }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`message-row ${isUser ? "user" : "assistant"}`}>
      {!isUser && <div className="message-avatar assistant">SM</div>}

      <div className={`message-bubble ${isUser ? "user" : "assistant"}`}>
        {isUser ? (
          message.content
        ) : (
          <MessageContent content={message.content} isTyping={isTyping} />
        )}
      </div>

      {isUser && (
        <div className="message-avatar user">
          {message.content.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
