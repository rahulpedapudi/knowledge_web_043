import { Activity, Play } from "lucide-react";
import type { ConceptNode, RelationshipEdge } from "@/types";

interface SimulationPanelProps {
  selectedNode: ConceptNode | null;
  selectedEdge: RelationshipEdge | null;
  onClose: () => void;
}

export function SimulationPanel({
  selectedNode: _selectedNode,
  selectedEdge: _selectedEdge,
  onClose: _onClose,
}: SimulationPanelProps) {
  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Simulation
        </h3>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
        <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 border border-white/5">
          <Play className="w-8 h-8 text-slate-600" />
        </div>
        <h4 className="text-white font-medium mb-2">No Active Simulation</h4>
        <p className="text-sm max-w-[240px]">
          Select a relationship with a simulation equation to run a model.
        </p>
      </div>
    </div>
  );
}
