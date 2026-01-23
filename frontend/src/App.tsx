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

  // Global Parallax State
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

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
      <div className="flex items-center justify-center h-screen bg-[#0a0a0f] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
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
    <div className="relative flex h-screen bg-[#0a0a0f] overflow-hidden font-sans text-slate-200 selection:bg-purple-500/30">

      {/* GLOBAL BACKGROUND LAYERS (Behind content) */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        <div className="absolute top-[-20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-purple-600/10 blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[10%] w-[45vw] h-[45vw] rounded-full bg-blue-600/10 blur-[100px] animate-float" />
        <div className="absolute top-[40%] left-[-10%] w-[30vw] h-[30vw] rounded-full bg-pink-500/5 blur-[80px] animate-float-delayed" />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute top-[15%] right-[20%] w-20 h-20 border border-white/5 rounded-full animate-float-delayed"
          style={{ transform: `translate(${mousePos.x * -40}px, ${mousePos.y * -40}px)` }}
        />
      </div>

      {/* Sidebar (Z-Index 20 to sit above background but maybe glass?) */}
      <div className="relative z-20 h-full flex-none">
        <Sidebar />
      </div>

      {/* Main Content Area (Z-Index 10) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 glass-content">
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

import { Loader2 } from "lucide-react"; // Import missing Loader2

export default App;
