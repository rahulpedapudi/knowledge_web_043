import { useState } from "react";
import { MessageSquare, Compass, MousePointer2 } from "lucide-react";
import { ExplorePanel } from "./ExplorePanel";
import { ChatPanel } from "./ChatPanel";
import type { ConceptNode, RelationshipEdge } from "@/types";

interface RightPanelProps {
  documentId: string | null;
  selectedNode: ConceptNode | null;
  selectedEdge: RelationshipEdge | null;
  onClose: () => void;
}

export function RightPanel({
  documentId,
  selectedNode,
  selectedEdge,
  onClose,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<"explore" | "chat">("explore");

  // Determine availability
  const canChat = !!selectedNode;

  return (
    <div className="w-[400px] shrink-0 flex flex-col h-full border-l border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
      {/* Tabs */}
      <div className="flex border-b border-slate-700/50">
        <button
          onClick={() => setActiveTab("explore")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
            activeTab === "explore"
              ? "text-blue-400 bg-slate-800/50"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
          }`}>
          <Compass className="w-4 h-4" />
          Explore
          {activeTab === "explore" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
            activeTab === "chat"
              ? "text-emerald-400 bg-slate-800/50"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
          }`}>
          <MessageSquare className="w-4 h-4" />
          Chat
          {activeTab === "chat" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-0 bg-slate-900/30">
        {activeTab === "explore" ? (
          <ExplorePanel
            documentId={documentId}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onClose={onClose}
          />
        ) : (
          <div className="h-full">
            {canChat && documentId && selectedNode ? (
              <ChatPanel
                documentId={documentId}
                conceptId={selectedNode.id}
                conceptLabel={selectedNode.label}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                  <MousePointer2 className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-lg font-medium text-slate-300 mb-2">
                  Select a Concept
                </h3>
                <p className="text-sm">
                  Click on any node in the graph to start a context-aware chat
                  about that concept.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
