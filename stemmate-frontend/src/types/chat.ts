export interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface ChatResponse {
  answer: string;
  sources?: string[];
}

export interface Conversation {
  id: number;
  user_id: number;
  title: string;
  subject: string;
  created_at: string;
  updated_at: string;
}

export type TutorMode = "explain" | "example" | "quiz" | "past_paper" | "practice" | null;

export type StemSubject =
  | "General"
  | "Mathematics"
  | "Physics"
  | "Biology"
  | "Chemistry"
  | "Technology";

export const SUBJECTS: StemSubject[] = [
  "General",
  "Mathematics",
  "Physics",
  "Biology",
  "Chemistry",
  "Technology",
];

export const GRADES = ["Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

export const TUTOR_MODES: { id: TutorMode; label: string; icon: string }[] = [
  { id: null, label: "Chat", icon: "💬" },
  { id: "explain", label: "Explain simply", icon: "📖" },
  { id: "example", label: "Give example", icon: "🌍" },
  { id: "quiz", label: "Quiz me", icon: "❓" },
  { id: "past_paper", label: "Past paper", icon: "📝" },
  { id: "practice", label: "Practice", icon: "✏️" },
];

export const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "👋 **Welcome to StemMate!** I'm your Namibian STEM tutor.\n\nI can help you with **Mathematics, Physics, Biology, Chemistry, and Technology** — aligned with the NSSC syllabus.\n\nTry asking a question, or pick a **tutor mode** below to make learning interactive:\n- **Explain simply** — step-by-step breakdown\n- **Quiz me** — test your knowledge\n- **Past paper** — exam-style questions\n\nWhat would you like to learn today?",
};
