import { useState } from "react";
import {
  Zap,
  BookOpen,
  BrainCircuit,
  ArrowLeft,
  Share2,
  Info,
  ChevronRight
} from "lucide-react";
import { SimulationPanel } from "./SimulationPanel";
import { QuizDialog } from "./QuizDialog";
import { FlashcardDialog } from "./FlashcardDialog";
import type { ConceptNode, RelationshipEdge } from "@/types";

interface ExplorePanelProps {
  documentId: string | null;
  selectedNode: ConceptNode | null;
  selectedEdge: RelationshipEdge | null;
  sourceNode?: ConceptNode | null;
  targetNode?: ConceptNode | null;
  neighbors?: Array<{ node: ConceptNode; relationship: RelationshipEdge }>;
  onClose: () => void;
}

type ExploreView = "menu" | "quiz" | "flashcards" | "simulation" | "simulation_select";

export function ExplorePanel({
  documentId,
  selectedNode,
  selectedEdge,
  sourceNode,
  targetNode,
  neighbors = [],
  onClose,
}: ExplorePanelProps) {
  const [view, setView] = useState<ExploreView>("menu");
  const [tempEdge, setTempEdge] = useState<RelationshipEdge | null>(null);
  const [tempSource, setTempSource] = useState<ConceptNode | null>(null);
  const [tempTarget, setTempTarget] = useState<ConceptNode | null>(null);

  const goBack = () => {
    setView("menu");
    setTempEdge(null);
  };

  const handleSimulationStart = () => {
    if (selectedEdge) {
      setView("simulation");
      return;
    }

    if (selectedNode && neighbors.length > 0) {
      if (neighbors.length === 1) {
        // Auto-select the only neighbor
        const { node: otherNode, relationship } = neighbors[0];
        setTempEdge(relationship);

        // Determine source/target
        // If selectedNode is source
        if (relationship.source === selectedNode.id) {
          setTempSource(selectedNode);
          setTempTarget(otherNode);
        } else {
          setTempSource(otherNode);
          setTempTarget(selectedNode);
        }

        setView("simulation");
      } else {
        // Show selection menu
        setView("simulation_select");
      }
    }
  };

  const handleNeighborSelect = (neighbor: { node: ConceptNode; relationship: RelationshipEdge }) => {
    setTempEdge(neighbor.relationship);
    if (neighbor.relationship.source === selectedNode?.id) {
      setTempSource(selectedNode);
      setTempTarget(neighbor.node);
    } else {
      setTempSource(neighbor.node);
      setTempTarget(selectedNode!);
    }
    setView("simulation");
  }

  if (view === "simulation") {
    // Use either the directly selected edge/nodes OR the temporary ones selected from the menu
    const activeEdge = selectedEdge || tempEdge;
    const activeSource = sourceNode || tempSource;
    const activeTarget = targetNode || tempTarget;

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
            selectedEdge={activeEdge}
            selectedNode={selectedNode}
            sourceNode={activeSource}
            targetNode={activeTarget}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  if (view === "simulation_select") {
    return (
      <div className="h-full flex flex-col">
        <div className="p-2 border-b border-slate-700/50 flex items-center gap-2">
          <button
            onClick={goBack}
            className="p-1 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-slate-300">
            Select Simulation
          </span>
        </div>
        <div className="p-4 overflow-y-auto">
          <p className="text-sm text-slate-400 mb-4">
            Which relationship do you want to simulate?
          </p>
          <div className="flex flex-col gap-3">
            {neighbors.map((neighbor) => (
              <div
                key={neighbor.relationship.id}
                onClick={() => handleNeighborSelect(neighbor)}
                className="p-4 bg-slate-800/40 border border-white/5 rounded-xl hover:bg-slate-700/50 hover:border-blue-500/30 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {neighbor.relationship.relationship_type}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400" />
                </div>
                <div className="text-sm text-white font-medium mt-1">
                  {selectedNode?.label} → {neighbor.node.label}
                </div>
                <div className="text-xs text-slate-400 mt-2 line-clamp-2">
                  {neighbor.relationship.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
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
          className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedNode && documentId
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
          className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedNode && documentId
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
          onClick={handleSimulationStart}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedEdge || (selectedNode && neighbors.length > 0)
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
                {selectedEdge
                  ? "Run interactive sim"
                  : selectedNode && neighbors.length > 0
                    ? "Simulate relationship"
                    : "Select a connected node"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
