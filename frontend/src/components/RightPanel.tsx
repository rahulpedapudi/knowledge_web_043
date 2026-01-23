import { useState } from "react";
import { MessageSquare, Activity, MousePointer2, Info, Share2 } from "lucide-react";
import { SimulationPanel } from "./SimulationPanel";
import { ChatPanel } from "./ChatPanel";
import type { ConceptNode, RelationshipEdge } from "@/types";

interface RightPanelProps {
  documentId: string | null;
  selectedNode: ConceptNode | null;
  selectedEdge: RelationshipEdge | null;
  // We need the full graph to find neighbors, but props usually just pass selected items.
  // We might need to pass neighbor data or the whole graph.
  // For now, let's assume the parent passes relevant context or we just show what we have.
  // Ideally, KnowledgeGraphPage should pass "neighbors" or "relatedEdges" to this panel.
  // I will update the Props to include neighbors if possible, but for now I'll stick to what's available
  // or simple props. Wait, `onClose` is here.
  // To show neighbors, I really need the graph data or a list of neighbors.
  // I'll add `neighbors` to the props.
  neighbors?: Array<{ node: ConceptNode; relationship: RelationshipEdge }>;
  onClose: () => void;
}

export function RightPanel({
  documentId,
  selectedNode,
  selectedEdge,
  neighbors = [],
  onClose,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<"details" | "simulation" | "chat">("details");

  // Determine availability
  const canChat = !!selectedNode;

  return (
    <div className="w-[400px] shrink-0 flex flex-col h-full border-l border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
      {/* Tabs */}
      <div className="flex border-b border-slate-700/50">
        <button
          onClick={() => setActiveTab("details")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${activeTab === "details"
            ? "text-purple-400 bg-slate-800/50"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
            }`}>
          <Info className="w-4 h-4" />
          Details
          {activeTab === "details" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("simulation")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${activeTab === "simulation"
            ? "text-blue-400 bg-slate-800/50"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
            }`}>
          <Activity className="w-4 h-4" />
          Sim
          {activeTab === "simulation" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${activeTab === "chat"
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-0 bg-slate-900/30 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {activeTab === "details" && (
          <div className="p-6 space-y-6">
            {selectedNode ? (
              <>
                {/* Header */}
                <div>
                  <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">Selected Concept</div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedNode.label}</h2>
                  {selectedNode.description && (
                    <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-purple-500/30 pl-3">
                      {selectedNode.description}
                    </p>
                  )}
                </div>

                {/* Metdata */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-white/5">
                    <div className="text-xs text-slate-500 mb-1">Type</div>
                    <div className="text-sm font-mono text-blue-300">{selectedNode.semantic_type || "Entity"}</div>
                  </div>
                  {selectedNode.unit && (
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-white/5">
                      <div className="text-xs text-slate-500 mb-1">Unit</div>
                      <div className="text-sm font-mono text-emerald-300">{selectedNode.unit}</div>
                    </div>
                  )}
                </div>

                {/* Relationships */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-3 border-b border-white/5 pb-2">
                    <Share2 className="w-4 h-4" />
                    Connected to
                  </div>

                  {neighbors.length > 0 ? (
                    <div className="space-y-2">
                      {neighbors.map(({ node, relationship }) => (
                        <div key={node.id} className="group flex items-start gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 border border-white/5 transition-all">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shrink-0">
                            <Activity className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-200 text-sm">{node.label}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{relationship.description}</div>
                            {relationship.equation && (
                              <div className="mt-1.5 text-[10px] bg-black/30 px-2 py-1 rounded border border-white/5 font-mono text-slate-400 inline-block">
                                {relationship.equation}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600 italic text-center py-4">No direct connections visible</div>
                  )}
                </div>
              </>
            ) : selectedEdge ? (
              <div>
                <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Selected Relationship</div>
                <p className="text-lg text-white mb-4">{selectedEdge.description}</p>
                {selectedEdge.equation && (
                  <div className="bg-black/40 p-4 rounded-xl border border-blue-500/20 mb-4">
                    <div className="text-xs text-blue-400/70 mb-1 font-mono">Equation</div>
                    <code className="text-blue-300 font-mono text-lg">{selectedEdge.equation}</code>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <Info className="w-12 h-12 text-slate-700 mb-4" />
                <p className="text-slate-400 max-w-[200px]">Select a node or edge to view its details here.</p>
              </div>
            )}
          </div>
        )}

        {/* Other Tabs */}
        {activeTab === "simulation" && (
          <SimulationPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onClose={onClose}
          />
        )}

        {activeTab === "chat" && (
          <div className="h-full">
            {canChat && documentId && selectedNode ? (
              <ChatPanel
                documentId={documentId}
                conceptId={selectedNode.id}
                conceptLabel={selectedNode.label}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <MousePointer2 className="w-12 h-12 text-slate-700 mb-4" />
                <p>Select a concept to start chatting</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
