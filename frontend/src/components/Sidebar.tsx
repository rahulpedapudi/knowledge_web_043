import { useState, useEffect } from "react";
import { MessageSquare, Plus, FileText, Loader2, Search } from "lucide-react";
import { listDocuments } from "@/api/client";
import type { Document } from "@/types";

interface SidebarProps {
  onHomeClick?: () => void;
  onResourceSelect?: (documentId: string, title: string) => void;
  selectedDocumentId?: string | null;
}

export function Sidebar({
  onHomeClick,
  onResourceSelect,
  selectedDocumentId,
}: SidebarProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const docs = await listDocuments();
        setDocuments(docs);
      } catch (error) {
        console.error("Failed to fetch documents:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDocuments();
  }, []);

  return (
    <div className="w-[260px] flex-shrink-0 h-full bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col hidden md:flex">
      {/* New Chat / Home Button */}
      <div className="p-3">
        <button
          onClick={onHomeClick}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </div>
          <span className="font-medium">New chat</span>
          <span className="ml-auto text-white/50">
            <MessageSquare className="w-4 h-4" />
          </span>
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        {/* Search */}
        <div className="space-y-1">
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-white/90 hover:bg-white/10 rounded-lg transition-colors text-left">
            <Search className="w-4 h-4" />
            <span>Search resources</span>
          </button>
        </div>

        {/* Resources List */}
        <div className="space-y-1">
          <div className="px-3 text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">
            Your Resources
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="px-3 text-sm text-white/30">
              No resources yet
            </div>
          ) : (
            documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onResourceSelect?.(doc.id, doc.title)}
                className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors text-left group ${
                  selectedDocumentId === doc.id
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <FileText className={`w-4 h-4 ${
                  selectedDocumentId === doc.id ? "text-blue-400" : "text-white/40"
                }`} />
                <span className="truncate flex-1">{doc.title}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* User / Footer */}
      <div className="p-3 border-t border-white/10">
        <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors text-left">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-medium">
            RO
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="truncate font-medium">Rahul</div>
            <div className="truncate text-xs text-white/50">Go</div>
          </div>
        </button>
      </div>
    </div>
  );
}
