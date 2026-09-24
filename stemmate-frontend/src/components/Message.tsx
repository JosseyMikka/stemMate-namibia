import type { ChatMessage } from "../types/chat";

interface Props {
  message: ChatMessage;
}

export default function Message({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser
          ? "flex-end"
          : "flex-start",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          maxWidth: "80%",
        }}
      >
        {!isUser && (
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg,#003580,#009543)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
            }}
          >
            SM
          </div>
        )}

        <div
          style={{
            padding: "14px 18px",
            borderRadius: "16px",
            background: isUser
              ? "#003580"
              : "white",
            color: isUser ? "white" : "#111827",
            border: isUser
              ? "none"
              : "1px solid #e5e7eb",
            lineHeight: 1.6,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}