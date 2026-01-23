import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DocumentUpload } from "@/components/DocumentUpload";
import { KnowledgeGraphPage } from "@/components/KnowledgeGraphPage";
import { AuthPage } from "@/components/AuthPage";
import { GoogleCallback } from "@/components/GoogleCallback";
import { useAuth } from "@/context/AuthContext";
import { getChatSession } from "@/api/client";
import type { DocumentUploadResponse } from "@/types";
import { useNavigate, useLocation } from "react-router-dom";

type AppView = "upload" | "graph";

function App() {
  const { user, isLoading: loading } = useAuth();
  const [view, setView] = useState<AppView>("upload");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  /* Routing Logic */
  useEffect(() => {
    const match = location.pathname.match(/^\/c\/([a-zA-Z0-9]+)$/);
    if (match) {
      const chatId = match[1];
      loadChatSession(chatId);
    } else if (location.pathname === "/") {
      handleBackToUpload();
    }
  }, [location.pathname]);

  const loadChatSession = async (chatId: string) => {
    try {
      const session = await getChatSession(chatId);
      setDocumentId(session.document_id);
      setDocumentTitle(session.title);
      setView("graph");
    } catch (err) {
      console.error("Failed to load session:", err);
      // Optional: navigate home on error
    }
  };

  const handleDocumentProcessed = async (response: DocumentUploadResponse) => {
    if (response.chat_id) {
      navigate(`/c/${response.chat_id}`);
    } else {
      // Fallback
      setDocumentId(response.document_id);
      setDocumentTitle(response.title);
      setView("graph");
    }
  };

  const handleBackToUpload = () => {
    if (location.pathname !== "/") {
      navigate("/");
      return;
    }
    setView("upload");
    setDocumentId(null);
    setDocumentTitle(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#111] text-white">
        Loading...
      </div>
    );
  }

  // Check for Google Callback FIRST (before auth check)
  // This handles the OAuth redirect with token
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");
  if (token || location.pathname === "/auth/callback") {
    return <GoogleCallback />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="flex h-screen bg-[#111] overflow-hidden font-sans text-slate-200">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {view === "upload" ? (
          <DocumentUpload onDocumentProcessed={handleDocumentProcessed} />
        ) : (
          <KnowledgeGraphPage
            initialDocumentId={documentId}
            initialDocumentTitle={documentTitle || undefined}
            onNavigateHome={handleBackToUpload}
          />
        )}
      </div>
    </div>
  );
}

export default App;
