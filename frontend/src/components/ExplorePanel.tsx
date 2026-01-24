import { useState } from "react";
import {
  Zap,
  BookOpen,
  BrainCircuit,
  ArrowLeft,
  Share2,
  // Activity,
  Info,
} from "lucide-react";
import { SimulationPanel } from "./SimulationPanel";
import { QuizDialog } from "./QuizDialog";
import { FlashcardDialog } from "./FlashcardDialog";
import type { ConceptNode, RelationshipEdge } from "@/types";

interface ExplorePanelProps {
  documentId: string | null;
  selectedNode: ConceptNode | null;
  selectedEdge: RelationshipEdge | null;
  neighbors?: Array<{ node: ConceptNode; relationship: RelationshipEdge }>;
  onClose: () => void;
}

type ExploreView = "menu" | "quiz" | "flashcards" | "simulation";

export function ExplorePanel({
  documentId,
  selectedNode,
  selectedEdge,
  neighbors = [],
  onClose,
}: ExplorePanelProps) {
  const [view, setView] = useState<ExploreView>("menu");

  const goBack = () => setView("menu");

  if (view === "simulation") {
    return (
      <div className="h-full flex flex-col">
        <div className="p-2 border-b border-slate-700/50 flex items-center gap-2">
          <button
            onClick={goBack}
            className="p-1 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-slate-300">
            Back to Explore
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <SimulationPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  if (view === "quiz" && selectedNode && documentId) {
    return (
      <QuizDialog
        conceptId={selectedNode.id}
        documentId={documentId}
        conceptLabel={selectedNode.label}
        onClose={goBack}
      />
    );
  }

  if (view === "flashcards" && selectedNode && documentId) {
    return (
      <FlashcardDialog
        conceptId={selectedNode.id}
        documentId={documentId}
        conceptLabel={selectedNode.label}
        onClose={goBack}
      />
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-y-auto">
      {/* Node Details Section */}
      {selectedNode && (
        <div className="p-4 border-b border-slate-700/50 space-y-4">
          <div>
            <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
              Selected Concept
            </div>
            <h2 className="text-xl font-bold text-white mb-1">
              {selectedNode.label}
            </h2>
            {selectedNode.description && (
              <p className="text-slate-400 text-sm leading-relaxed">
                {selectedNode.description}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="flex gap-2">
            {/* <div className="bg-slate-800/50 px-3 py-2 rounded-lg border border-white/5">
              <div className="text-[10px] text-slate-500 uppercase">Type</div>
              <div className="text-xs font-mono text-blue-300">
                {selectedNode.semantic_type || "Entity"}
              </div>
            </div> */}
            {selectedNode.unit && (
              <div className="bg-slate-800/50 px-3 py-2 rounded-lg border border-white/5">
                <div className="text-[10px] text-slate-500 uppercase">Unit</div>
                <div className="text-xs font-mono text-emerald-300">
                  {selectedNode.unit}
                </div>
              </div>
            )}
          </div>

          {/* Connections */}
          {neighbors.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                <Share2 className="w-3 h-3" />
                Connected to ({neighbors.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {neighbors.slice(0, 5).map(({ node }) => (
                  <span
                    key={node.id}
                    className="px-2 py-1 text-xs bg-slate-700/50 text-slate-300 rounded-full border border-white/5">
                    {node.label}
                  </span>
                ))}
                {neighbors.length > 5 && (
                  <span className="px-2 py-1 text-xs text-slate-500">
                    +{neighbors.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edge Details */}
      {!selectedNode && selectedEdge && (
        <div className="p-4 border-b border-slate-700/50">
          <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
            Selected Relationship
          </div>
          <p className="text-white mb-2">{selectedEdge.description}</p>
          {selectedEdge.equation && (
            <code className="text-sm bg-black/30 px-2 py-1 rounded text-blue-300 font-mono">
              {selectedEdge.equation}
            </code>
          )}
        </div>
      )}

      {/* No Selection Placeholder */}
      {!selectedNode && !selectedEdge && (
        <div className="p-6 border-b border-slate-700/50 flex flex-col items-center text-center">
          <Info className="w-10 h-10 text-slate-700 mb-3" />
          <p className="text-slate-500 text-sm">
            Select a node or edge to see details
          </p>
        </div>
      )}

      {/* Explore Actions */}
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Actions
        </h3>

        {/* Quiz Card */}
        <div
          onClick={() => selectedNode && documentId && setView("quiz")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedNode && documentId
              ? "bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50 hover:border-purple-500/30"
              : "bg-slate-800/30 border-slate-700/30 opacity-50 cursor-not-allowed"
          }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-medium text-white text-sm">Generate Quiz</h3>
              <p className="text-xs text-slate-500">Test your knowledge</p>
            </div>
          </div>
        </div>

        {/* Flashcards Card */}
        <div
          onClick={() => selectedNode && documentId && setView("flashcards")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedNode && documentId
              ? "bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50 hover:border-emerald-500/30"
              : "bg-slate-800/30 border-slate-700/30 opacity-50 cursor-not-allowed"
          }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-medium text-white text-sm">Flashcards</h3>
              <p className="text-xs text-slate-500">Study with cards</p>
            </div>
          </div>
        </div>

        {/* Simulation Card */}
        <div
          onClick={() => selectedEdge && setView("simulation")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedEdge?.has_simulation
              ? "bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50 hover:border-blue-500/30"
              : "bg-slate-800/30 border-slate-700/30 opacity-50 cursor-not-allowed"
          }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-white text-sm">
                Live Simulation
              </h3>
              <p className="text-xs text-slate-500">
                {selectedEdge?.has_simulation
                  ? "Run interactive sim"
                  : "Select a relationship"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
