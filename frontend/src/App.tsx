import { useState } from "react";
import { DocumentUpload } from "@/components/DocumentUpload";
import { AuthPage } from "@/components/AuthPage";
import { GoogleCallback } from "@/components/GoogleCallback";
import { Sidebar } from "@/components/Sidebar";
import { KnowledgeGraphPage } from "@/components/KnowledgeGraphPage";
import { useAuth } from "@/context/AuthContext";
import type { DocumentUploadResponse } from "@/types";

type AppView = "upload" | "knowledge";

function App() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [view, setView] = useState<AppView>("upload");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string>("");

  const handleDocumentProcessed = (response: DocumentUploadResponse) => {
    setDocumentId(response.document_id);
    setDocumentTitle(response.title);
    setView("knowledge");
  };

  const handleResourceSelect = (docId: string, title: string) => {
    setDocumentId(docId);
    setDocumentTitle(title);
    setView("knowledge");
  };

  const handleHomeClick = () => {
    setView("upload");
    setDocumentId(null);
    setDocumentTitle("");
  };

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Check if this is OAuth callback route
  const isOAuthCallback = window.location.pathname === "/auth/callback";
  if (isOAuthCallback) {
    return <GoogleCallback />;
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="flex h-screen w-full bg-[#050510] text-white overflow-hidden font-sans">
      {/* Global Sidebar */}
      <Sidebar
        onHomeClick={handleHomeClick}
        onResourceSelect={handleResourceSelect}
        selectedDocumentId={documentId}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {view === "upload" ? (
          <div className="flex-1 bg-[#212121]">
            <DocumentUpload onDocumentProcessed={handleDocumentProcessed} />
          </div>
        ) : (
          <KnowledgeGraphPage
            initialDocumentId={documentId}
            initialDocumentTitle={documentTitle}
          />
        )}
      </main>
    </div>
  );
}

export default App;
