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

// ============ Documents API ============

export async function uploadPdf(
  file: File,
  title?: string,
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (title) {
    formData.append("title", title);
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
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("text", text);
  if (title) {
    formData.append("title", title);
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
