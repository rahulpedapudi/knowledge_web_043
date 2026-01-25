import { useState, useEffect } from "react";
import { Activity, Minus, Loader2 } from "lucide-react";
import type { ConceptNode, RelationshipEdge, SimulationConfig } from "@/types";
import { getSimulationConfig, calculateSimulation } from "@/api/client";
import { SimulationFallback } from "./SimulationFallback";
import { ActiveSimulation } from "./ActiveSimulation";

interface SimulationPanelProps {
  selectedNode: ConceptNode | null;
  selectedEdge: RelationshipEdge | null;
  sourceNode?: ConceptNode | null;
  targetNode?: ConceptNode | null;
  onClose: () => void;
}

export function SimulationPanel({
  selectedEdge,
  sourceNode,
  targetNode,
  onClose,
}: SimulationPanelProps) {
  const [config, setConfig] = useState<SimulationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (selectedEdge) {
      loadConfig(selectedEdge.id);
    }
  }, [selectedEdge]);

  const loadConfig = async (edgeId: string) => {
    setIsLoading(true);
    setError(false);
    setConfig(null);
    try {
      const data = await getSimulationConfig(edgeId);
      setConfig(data);
    } catch (err) {
      console.error("Failed to load simulation config:", err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedEdge) {
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
            <Activity className="w-8 h-8 text-slate-600" />
          </div>
          <h4 className="text-white font-medium mb-2">No Simulation Active</h4>
          <p className="text-sm max-w-[240px]">
            Click on a connection line (edge) in the graph to simulate the
            causal relationship.
          </p>
        </div>
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="h-full flex flex-col p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Simulation
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
            <Minus className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
          <p className="text-slate-300 font-medium">Initializing Model...</p>
          <p className="text-xs text-slate-500 mt-2">Generating parameters with AI</p>
        </div>
      </div>
    );
  }

  // Fallback Logic: If no config, error, or no equation -> specific fallback UI
  if (error || !config || !config.equation) {
    return (
      <SimulationFallback
        edge={selectedEdge}
        source={sourceNode}
        target={targetNode}
        onClose={onClose}
      />
    );
  }

  // Active Simulation
  return (
    <ActiveSimulation
      // Use config data if available, falling back to props
      source={config.source_concept || sourceNode}
      target={config.target_concept || targetNode}
      edge={selectedEdge}
      equation={config.equation}
      onClose={onClose}
    />
  );
}
