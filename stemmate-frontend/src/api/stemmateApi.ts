import axios from "axios";
import type { ChatResponse } from "../types/chat";

const API_URL = "http://localhost:8000";

export const uploadPDFs = async (files: File[]) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await axios.post(
    `${API_URL}/upload_pdfs/`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const askQuestion = async (
  question: string
): Promise<ChatResponse> => {
  const formData = new FormData();
  formData.append("question", question);

  const response = await axios.post(
    `${API_URL}/ask/`,
    formData
  );

  return response.data;
};