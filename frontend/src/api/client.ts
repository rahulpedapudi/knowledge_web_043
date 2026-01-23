import axios from "axios";
import type {
  Document,
  DocumentUploadResponse,
  GraphData,
  SimulationConfig,
  SimulationResult,
} from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function deleteChat(chatId: string): Promise<void> {
  await api.delete(`/chat/${chatId}`);
}

// ============ Documents API ============

export async function uploadPdf(
  file: File,
  title?: string,
  focusConcepts?: string[],
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (title) {
    formData.append("title", title);
  }
  if (focusConcepts && focusConcepts.length > 0) {
    if (typeof focusConcepts === "string") {
      formData.append("focus_concepts", focusConcepts);
    } else {
      formData.append("focus_concepts", JSON.stringify(focusConcepts));
    }
  }

  const response = await api.post("/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function pasteText(
  text: string,
  title?: string,
  focusConcepts?: string[],
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("text", text);
  if (title) {
    formData.append("title", title);
  }
  if (focusConcepts && focusConcepts.length > 0) {
    if (typeof focusConcepts === "string") {
      formData.append("focus_concepts", focusConcepts);
    } else {
      formData.append("focus_concepts", JSON.stringify(focusConcepts));
    }
  }

  const response = await api.post("/documents/paste", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function createDemo(): Promise<DocumentUploadResponse> {
  const response = await api.post("/documents/demo");
  return response.data;
}

export async function generateFromTopic(
  topics: string[],
): Promise<DocumentUploadResponse> {
  const response = await api.post("/documents/generate", {
    topics,
  });
  return response.data;
}

export async function getDocument(documentId: string): Promise<Document> {
  const response = await api.get(`/documents/${documentId}`);
  return response.data;
}

export async function getDocumentGraph(documentId: string): Promise<GraphData> {
  const response = await api.get(`/documents/${documentId}/graph`);
  return response.data;
}

export async function listDocuments(): Promise<Document[]> {
  const response = await api.get("/documents/");
  return response.data;
}

// ============ Simulations API ============

export async function getSimulationConfig(
  relationshipId: string,
): Promise<SimulationConfig> {
  const response = await api.get(`/simulations/${relationshipId}`);
  return response.data;
}

export async function calculateSimulation(
  relationshipId: string,
  inputValue: number,
): Promise<SimulationResult> {
  const response = await api.post("/simulations/calculate", {
    relationship_id: relationshipId,
    input_value: inputValue,
  });
  return response.data;
}

// ============ Auth API ============

import type { AuthResponse, LoginCredentials, SignupData, User } from "@/types";

const TOKEN_KEY = "genzpulse_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Add auth header interceptor
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function signup(data: SignupData): Promise<AuthResponse> {
  const response = await api.post("/auth/signup", data);
  const authData = response.data as AuthResponse;
  setStoredToken(authData.access_token);
  return authData;
}

export async function login(
  credentials: LoginCredentials,
): Promise<AuthResponse> {
  const response = await api.post("/auth/login", credentials);
  const authData = response.data as AuthResponse;
  setStoredToken(authData.access_token);
  return authData;
}

export async function getProfile(): Promise<User> {
  const response = await api.get("/auth/profile");
  return response.data;
}

export function logout(): void {
  removeStoredToken();
}

// ============ Google OAuth API ============

export async function getGoogleOAuthUrl(): Promise<string> {
  const response = await api.get("/auth/google/login");
  return response.data.url;
}

export async function handleGoogleCallback(token: string): Promise<User> {
  // Token is already provided by backend redirect, just store it
  setStoredToken(token);
  // Fetch user profile with the token
  return await getProfile();
}

// ============ Chat API ============

export async function sendChatMessage(
  documentId: string,
  conceptId: string,
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<{ response: string; context_used: string[] }> {
  const response = await api.post("/chat/message", {
    document_id: documentId,
    concept_id: conceptId,
    message,
    history,
  });
  return response.data;
}

export async function getChatHistory(): Promise<
  Array<{ id: string; title: string; document_id: string; created_at: string }>
> {
  const response = await api.get("/chat/history");
  return response.data;
}

export async function getChatSession(chatId: string): Promise<{
  id: string;
  title: string;
  document_id: string;
  created_at: string;
  messages: any[];
}> {
  const response = await api.get(`/chat/${chatId}`);
  return response.data;
}

// ============ Quiz API ============

export async function generateQuiz(
  conceptId: string,
  documentId: string,
): Promise<{
  id: string;
  concept_id: string;
  questions: Array<{
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
  }>;
}> {
  const response = await api.post("/quiz/generate", {
    concept_id: conceptId,
    document_id: documentId,
  });
  return response.data;
}

export async function generateFlashcards(
  conceptId: string,
  documentId: string,
): Promise<{
  id: string;
  concept_id: string;
  cards: Array<{
    front: string;
    back: string;
  }>;
}> {
  const response = await api.post("/quiz/flashcards/generate", {
    concept_id: conceptId,
    document_id: documentId,
  });
  return response.data;
}
