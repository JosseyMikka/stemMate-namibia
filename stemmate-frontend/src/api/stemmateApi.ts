import axios from "axios";
import type { AuthResponse, LoginData, RegisterData, User } from "../types/auth";
import type { ChatMessage, ChatResponse, Conversation, TutorMode } from "../types/chat";

const API_URL = "http://localhost:8000";

const api = axios.create({ baseURL: API_URL });

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/register", data);
  return response.data;
};

export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/login", data);
  return response.data;
};

export const getMe = async (): Promise<User> => {
  const response = await api.get<User>("/auth/me");
  return response.data;
};

export const getConversations = async (): Promise<Conversation[]> => {
  const response = await api.get<{ conversations: Conversation[] }>("/conversations/");
  return response.data.conversations;
};

export const createConversation = async (
  title = "New chat",
  subject = "General"
): Promise<Conversation> => {
  const response = await api.post<Conversation>("/conversations/", { title, subject });
  return response.data;
};

export const getConversation = async (
  id: number
): Promise<{ conversation: Conversation; messages: ChatMessage[] }> => {
  const response = await api.get(`/conversations/${id}`);
  return response.data;
};

export const deleteConversation = async (id: number): Promise<void> => {
  await api.delete(`/conversations/${id}`);
};

export const sendChatMessage = async (
  conversationId: number,
  content: string,
  tutorMode: TutorMode = null,
  subject?: string
): Promise<{ answer: string; user_message: ChatMessage; assistant_message: ChatMessage }> => {
  const response = await api.post(`/conversations/${conversationId}/chat`, {
    content,
    tutor_mode: tutorMode,
    subject,
  });
  return response.data;
};

export const downloadConversation = async (conversationId: number): Promise<Blob> => {
  const response = await api.get(`/conversations/${conversationId}/download`, {
    responseType: "blob",
  });
  return response.data;
};

export const uploadPDFs = async (files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const response = await api.post("/upload_pdfs/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const askQuestion = async (question: string): Promise<ChatResponse> => {
  const formData = new FormData();
  formData.append("question", question);
  const response = await api.post("/ask/", formData);
  return response.data;
};

export { API_URL };
