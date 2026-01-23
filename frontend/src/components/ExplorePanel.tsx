import { useState } from "react";
import { Zap, BookOpen, BrainCircuit, ArrowLeft } from "lucide-react";
import { SimulationPanel } from "./SimulationPanel";
import { QuizDialog } from "./QuizDialog";
import { FlashcardDialog } from "./FlashcardDialog";
import type { ConceptNode, RelationshipEdge } from "@/types";

interface ExplorePanelProps {
  documentId: string | null;
  selectedNode: ConceptNode | null;
  selectedEdge: RelationshipEdge | null;
  onClose: () => void;
}

type ExploreView = "menu" | "quiz" | "flashcards" | "simulation";

export function ExplorePanel({
  documentId,
  selectedNode,
  selectedEdge,
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
    // Quiz Logic using new Dialog
    return (
      <QuizDialog
        conceptId={selectedNode.id}
        documentId={documentId}
        conceptLabel={selectedNode.label}
        onClose={goBack}
      />
    );
  }

  // Flashcards view
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
    <div className="h-full w-full flex flex-col bg-slate-800/50 p-4 space-y-4 overflow-y-auto">
      <h2 className="text-xl font-semibold text-white mb-2">Explore</h2>

      {/* Quiz Card */}
      <div
        onClick={() => selectedNode && setView("quiz")}
        className={`group relative overflow-hidden p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 transition-all ${
          selectedNode
            ? "hover:border-blue-500/50 cursor-pointer hover:bg-slate-800/80"
            : "opacity-50 cursor-not-allowed"
        }`}>
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
        </div>
        <h3 className="text-lg font-medium text-white mb-1">Generate a Quiz</h3>
        <p className="text-sm text-slate-400">
          Test your knowledge with AI-generated questions based on this concept.
        </p>
        {!selectedNode && (
          <p className="text-xs text-red-400 mt-2">
            Select a concept to enable
          </p>
        )}
      </div>

      {/* Flashcards Card */}
      <div
        onClick={() => setView("flashcards")}
        className="group relative overflow-hidden p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-emerald-500/50 cursor-pointer transition-all hover:bg-slate-800/80">
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:scale-110 transition-transform">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
        </div>
        <h3 className="text-lg font-medium text-white mb-1">
          Generate Flashcards
        </h3>
        <p className="text-sm text-slate-400">
          Create study sets to memorize key terms and concepts efficiently.
        </p>
      </div>

      {/* Live Simulations Card */}
      <div
        onClick={() => setView("simulation")}
        className="group relative overflow-hidden p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-yellow-500/50 cursor-pointer transition-all hover:bg-slate-800/80">
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400 group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6" />
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
        </div>
        <h3 className="text-lg font-medium text-white mb-1">
          Live Simulations
        </h3>
        <p className="text-sm text-slate-400">
          Interact with dynamic models to see how variables affect the system.
        </p>
      </div>
    </div>
  );
}
