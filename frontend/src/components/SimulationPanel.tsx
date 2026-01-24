import { useState, useEffect } from "react";
import { Activity, Minus, TrendingUp, TrendingDown } from "lucide-react";
import type { ConceptNode, RelationshipEdge } from "@/types";

interface SimulationPanelProps {
  selectedNode: ConceptNode | null;
  selectedEdge: RelationshipEdge | null;
  sourceNode?: ConceptNode | null;
  targetNode?: ConceptNode | null;
  onClose: () => void;
}

export function SimulationPanel({
  selectedNode,
  selectedEdge,
  sourceNode,
  targetNode,
  onClose,
}: SimulationPanelProps) {
  // If no edge is selected, show placeholder
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

  return (
    <ActiveSimulation
      state={{ edge: selectedEdge, source: sourceNode, target: targetNode }}
      onClose={onClose}
    />
  );
}

function ActiveSimulation({
  state,
  onClose,
}: {
  state: {
    edge: RelationshipEdge;
    source?: ConceptNode | null;
    target?: ConceptNode | null;
  };
  onClose: () => void;
}) {
  const { edge, source, target } = state;

  // Mock simulation state
  const [inputValue, setInputValue] = useState(50);
  const [outputValue, setOutputValue] = useState(50);
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate effect
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);

    // Advanced Simulation Logic
    // 1. Determine relationship strength (default 1.0)
    let strength = 1.0;
    if (
      edge.description.toLowerCase().includes("strong") ||
      edge.description.toLowerCase().includes("key")
    )
      strength = 1.5;
    if (
      edge.description.toLowerCase().includes("weak") ||
      edge.description.toLowerCase().includes("minor")
    )
      strength = 0.5;

    // 2. Base calculation
    let val = 50;
    if (edge.relationship_type === "inverse") {
      // Inverse: Input 0 -> Output 100, Input 100 -> Output 0
      // With strength: stronger inverse means sharper drop
      val = 100 - inputValue * strength;
    } else {
      // Direct: Input 0 -> Output 0
      val = inputValue * strength;
    }

    // 3. Clamp
    setOutputValue(Math.min(100, Math.max(0, val)));

    return () => clearTimeout(timer);
  }, [inputValue, edge]);

  return (
    <div className="h-full flex flex-col p-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Live Simulation
          </h3>
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium mt-1">
            Causal Analysis
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
          <Minus className="w-5 h-5" />
        </button>
      </div>

      {/* Visual Flow */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Source Input */}
        <div className="bg-slate-800/40 rounded-xl p-5 border border-blue-500/20 shadow-[0_4px_20px_rgba(59,130,246,0.05)] transition-all hover:border-blue-500/40">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
              CAUSE (Input)
            </span>
            <span className="text-blue-400 font-mono font-bold">
              {inputValue}%
            </span>
          </div>
          <div
            className="text-xl font-bold text-white mb-1 truncate"
            title={source?.label}>
            {source?.label || "Source Node"}
          </div>
          <div className="text-xs text-slate-500 mb-5 uppercase tracking-wider">
            {source?.semantic_type || "Variable"}
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={inputValue}
            onChange={(e) => setInputValue(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-colors"
          />
          <div className="flex justify-between text-[10px] uppercase font-bold text-slate-600 mt-2">
            <span>Low Impact</span>
            <span>High Impact</span>
          </div>
        </div>

        {/* Connection Visual */}
        <div className="flex flex-col items-center justify-center gap-1 text-slate-500 py-2 relative">
          {/* Animated flow line */}
          <div className="absolute top-0 bottom-0 w-[2px] bg-slate-800 -z-10"></div>
          <div
            className={`absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-blue-500 to-purple-500 -z-10 transition-opacity duration-300 ${isAnimating ? "opacity-100" : "opacity-30"}`}></div>

          <div className="bg-[#050510] border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-xl z-10">
            {edge.relationship_type === "direct" ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
            <span className="text-xs uppercase tracking-wider font-bold text-slate-300">
              {edge.relationship_type} Relation
            </span>
          </div>
          <div className="text-[10px] text-slate-500 max-w-[200px] text-center bg-[#050510]/80 backdrop-blur px-2 py-1 rounded">
            "{edge.description}"
          </div>
        </div>

        {/* Target Output */}
        <div className="bg-slate-800/40 rounded-xl p-5 border border-purple-500/20 shadow-[0_4px_20px_rgba(168,85,247,0.05)] transition-all hover:border-purple-500/40">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"></span>
              EFFECT (Output)
            </span>
            <span
              className="text-purple-400 font-mono font-bold transition-all duration-300"
              style={{ transform: isAnimating ? "scale(1.1)" : "scale(1)" }}>
              {outputValue.toFixed(1)}%
            </span>
          </div>
          <div
            className="text-xl font-bold text-white mb-1 truncate"
            title={target?.label}>
            {target?.label || "Target Node"}
          </div>
          <div className="text-xs text-slate-500 mb-5 uppercase tracking-wider">
            {target?.semantic_type || "Outcome"}
          </div>

          {/* Visual Bar */}
          <div className="h-4 bg-slate-900/50 rounded-full overflow-hidden border border-white/5 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex justify-between px-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-[1px] h-full bg-white/5"></div>
              ))}
            </div>
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(236,72,153,0.5)]"
              style={{ width: `${outputValue}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
