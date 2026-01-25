import { BookOpen, GitGraph, Lightbulb, Minus } from "lucide-react";
import type { ConceptNode, RelationshipEdge } from "@/types";

interface SimulationFallbackProps {
  edge: RelationshipEdge;
  source?: ConceptNode | null;
  target?: ConceptNode | null;
  onClose: () => void;
}

export function SimulationFallback({
  edge,
  source,
  target,
  onClose,
}: SimulationFallbackProps) {
  return (
    <div className="h-full flex flex-col pt-6 pb-2 px-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Concept Explorer
          </h3>
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium mt-1">
            Alternative Learning Mode
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 pb-4 custom-scrollbar">
        {/* Concept Relationship Card */}
        <div className="bg-slate-800/40 rounded-xl p-6 border border-white/10 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-400 uppercase tracking-wider">
                Relationship
              </span>
              <span className="text-sm font-medium text-white bg-slate-700/50 px-3 py-1 rounded-full border border-white/5">
                {edge.relationship_type.charAt(0).toUpperCase() +
                  edge.relationship_type.slice(1)}{" "}
                Correlation
              </span>
            </div>
            <GitGraph className="w-6 h-6 text-slate-600" />
          </div>

          <p className="text-slate-300 leading-relaxed text-sm">
            {edge.description ||
              `There is a ${edge.relationship_type} relationship between ${source?.label} and ${target?.label}. This means changes in one concept directly influence the other.`}
          </p>
        </div>

        {/* Guided Thought Exercise */}
        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-xl p-6 border border-indigo-500/20 shrink-0">
          <h4 className="text-indigo-300 font-medium mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Thought Experiment
          </h4>
          <p className="text-slate-300 text-sm leading-relaxed">
            Imagine a scenario where <strong>{source?.label}</strong> changes
            significantly. How would that impact the stability of{" "}
            <strong>{target?.label}</strong>? Consider the broader context of
            this system.
          </p>

          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Key Insight</div>
            <p className="text-white text-sm">
              Understanding this connection is crucial because it links the fundamental principles of {source?.category || 'the domain'} to the practical outcomes in {target?.category || 'the system'}.
            </p>
          </div>
        </div>

        {/* Concept Breakdown */}
        <div className="grid grid-cols-2 gap-4 shrink-0">
          <div className="bg-slate-800/30 p-4 rounded-lg border border-white/5">
            <div className="text-xs text-slate-500 mb-1">Source</div>
            <div className="font-medium text-blue-300 truncate" title={source?.label}>
              {source?.label}
            </div>
          </div>
          <div className="bg-slate-800/30 p-4 rounded-lg border border-white/5">
            <div className="text-xs text-slate-500 mb-1">Target</div>
            <div className="font-medium text-purple-300 truncate" title={target?.label}>
              {target?.label}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
