import { useState } from "react";
import {
  MessageSquare,
  Compass,
  MousePointer2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ExplorePanel } from "./ExplorePanel";
import { ChatPanel } from "./ChatPanel";
import type { ConceptNode, RelationshipEdge } from "@/types";

interface RightPanelProps {
  documentId: string | null;
  selectedNode: ConceptNode | null;
  selectedEdge: RelationshipEdge | null;
  neighbors?: Array<{ node: ConceptNode; relationship: RelationshipEdge }>;
  isCollapsed?: boolean;
  onToggle?: () => void;
  onClose: () => void;
}

export function RightPanel({
  documentId,
  selectedNode,
  selectedEdge,
  neighbors = [],
  isCollapsed = false,
  onToggle,
  onClose,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<"explore" | "chat">("explore");

  const canChat = !!selectedNode;

  // Collapsed state
  if (isCollapsed) {
    return (
      <div className="w-[60px] shrink-0 flex flex-col h-full bg-[#13131f]/40 backdrop-blur-xl border-l border-white/5 shadow-2xl transition-all duration-300">
        <div className="p-2">
          <button
            onClick={onToggle}
            className="w-full p-2 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Expand panel">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center py-4 gap-2">
          <button
            onClick={() => {
              onToggle?.();
              setActiveTab("explore");
            }}
            className={`w-full p-2 flex items-center justify-center rounded-lg transition-colors ${
              activeTab === "explore"
                ? "text-blue-400 bg-white/10"
                : "text-white/50 hover:text-white hover:bg-white/10"
            }`}
            title="Explore">
            <Compass className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              onToggle?.();
              setActiveTab("chat");
            }}
            className={`w-full p-2 flex items-center justify-center rounded-lg transition-colors ${
              activeTab === "chat"
                ? "text-emerald-400 bg-white/10"
                : "text-white/50 hover:text-white hover:bg-white/10"
            }`}
            title="Chat">
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded state
  return (
    <div className="w-[400px] shrink-0 flex flex-col h-full bg-[#13131f]/40 backdrop-blur-xl border-l border-white/5 shadow-2xl transition-all duration-300">
      {/* Tabs */}
      <div className="flex border-b border-white/10 shrink-0">
        <button
          onClick={onToggle}
          className="p-3 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          title="Collapse panel">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActiveTab("explore")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
            activeTab === "explore"
              ? "text-blue-400"
              : "text-white/60 hover:text-white hover:bg-white/5"
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
              ? "text-emerald-400"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}>
          <MessageSquare className="w-4 h-4" />
          Chat
          {activeTab === "chat" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === "explore" ? (
          <div className="flex-1 overflow-y-auto">
            <ExplorePanel
              documentId={documentId}
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              neighbors={neighbors}
              onClose={onClose}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {canChat && documentId && selectedNode ? (
              <ChatPanel
                key={selectedNode.id}
                documentId={documentId}
                conceptId={selectedNode.id}
                conceptLabel={selectedNode.label}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/40">
                <MousePointer2 className="w-12 h-12 text-white/20 mb-4" />
                <p>Select a concept to start chatting</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
