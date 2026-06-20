import { useCallback, useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Chat from "../components/Chat";
import {
  createConversation,
  deleteConversation,
  getConversations,
} from "../api/stemmateApi";
import type { Conversation } from "../types/chat";

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [initializing, setInitializing] = useState(true);

  const refreshConversations = useCallback(async () => {
    const convs = await getConversations();
    setConversations(convs);
    return convs;
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const convs = await refreshConversations();
        if (convs.length > 0) {
          setActiveConversation(convs[0]);
        } else {
          const newConv = await createConversation();
          setConversations([newConv]);
          setActiveConversation(newConv);
        }
      } catch {
        const newConv = await createConversation();
        setConversations([newConv]);
        setActiveConversation(newConv);
      } finally {
        setInitializing(false);
      }
    };
    init();
  }, [refreshConversations]);

  const handleNewChat = async () => {
    const conv = await createConversation();
    setConversations((prev) => [conv, ...prev]);
    setActiveConversation(conv);
  };

  const handleDelete = async (id: number) => {
    await deleteConversation(id);
    const remaining = conversations.filter((c) => c.id !== id);
    setConversations(remaining);

    if (activeConversation?.id === id) {
      if (remaining.length > 0) {
        setActiveConversation(remaining[0]);
      } else {
        const conv = await createConversation();
        setConversations([conv]);
        setActiveConversation(conv);
      }
    }
  };

  const handleConversationUpdate = async () => {
    const convs = await refreshConversations();
    if (activeConversation) {
      const updated = convs.find((c) => c.id === activeConversation.id);
      if (updated) setActiveConversation(updated);
    }
  };

  if (initializing) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        conversations={conversations}
        activeId={activeConversation?.id ?? null}
        onSelect={(id) => {
          const conv = conversations.find((c) => c.id === id);
          if (conv) setActiveConversation(conv);
        }}
        onNewChat={handleNewChat}
        onDelete={handleDelete}
      />
      <main className="main-content">
        <Chat
          conversation={activeConversation}
          onConversationUpdate={handleConversationUpdate}
        />
      </main>
    </div>
  );
}
