import type { Conversation } from "../types/chat";
import { useAuth } from "../context/AuthContext";

interface Props {
  conversations: Conversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNewChat: () => void;
  onDelete: (id: number) => void;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
}: Props) {
  const { user, logout } = useAuth();

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">SM</div>
          <div>
            <div className="sidebar-brand-text">StemMate</div>
            <div className="sidebar-brand-sub">Namibian STEM Tutor</div>
          </div>
        </div>
        <button type="button" className="new-chat-btn" onClick={onNewChat}>
          <span>+</span> New chat
        </button>
      </div>

      <div className="sidebar-conversations">
        <div className="sidebar-section-label">Your chats</div>
        {conversations.length === 0 && (
          <p style={{ padding: "8px 12px", fontSize: 13, color: "#64748b" }}>
            No chats yet — start learning!
          </p>
        )}
        {conversations.map((conv) => (
          <div key={conv.id} className="conversation-row">
            <button
              type="button"
              className={`conversation-item ${activeId === conv.id ? "active" : ""}`}
              onClick={() => onSelect(conv.id)}
            >
              <span>💬</span>
              <span className="conversation-item-title">{conv.title}</span>
              <span
                className="conversation-delete"
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }
                }}
                title="Delete chat"
              >
                ✕
              </span>
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{initials}</div>
          <div className="user-details">
            <div className="user-name">{user?.full_name}</div>
            <div className="user-grade">{user?.grade}</div>
          </div>
        </div>
        <button type="button" className="logout-btn" onClick={logout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
