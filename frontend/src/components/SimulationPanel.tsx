import { useState, useEffect, useCallback } from "react";
import { X, ArrowRight, ArrowRightLeft, Zap } from "lucide-react";
import { getSimulationConfig, calculateSimulation } from "@/api/client";
import type { RelationshipEdge, SimulationConfig, ConceptNode } from "@/types";

interface SimulationPanelProps {
  selectedEdge: RelationshipEdge | null;
  selectedNode: ConceptNode | null;
  onClose: () => void;
}

export function SimulationPanel({
  selectedEdge,
  selectedNode,
  onClose,
}: SimulationPanelProps) {
  const [config, setConfig] = useState<SimulationConfig | null>(null);
  const [inputValue, setInputValue] = useState<number>(0);
  const [outputValue, setOutputValue] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load simulation config when edge is selected
  useEffect(() => {
    if (!selectedEdge) {
      setConfig(null);
      return;
    }

    const loadConfig = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const simConfig = await getSimulationConfig(selectedEdge.id);
        setConfig(simConfig);
        setInputValue(
          simConfig.source_concept.default_value ??
            simConfig.source_concept.min_value ??
            0,
        );
        setOutputValue(simConfig.target_concept.default_value ?? null);
      } catch (err) {
        setError("Failed to load simulation");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [selectedEdge]);

  // Calculate output when input changes
  const handleCalculate = useCallback(
    async (value: number) => {
      if (!config) return;

      try {
        const result = await calculateSimulation(config.relationship_id, value);
        setOutputValue(result.output_value);
      } catch (err) {
        console.error(err);
      }
    },
    [config],
  );

  // Debounced calculation
  useEffect(() => {
    if (!config) return;

    const timer = setTimeout(() => {
      handleCalculate(inputValue);
    }, 150);

    return () => clearTimeout(timer);
  }, [inputValue, config, handleCalculate]);

  if (!selectedEdge && !selectedNode) return null;

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-slate-800/95 backdrop-blur-lg border-l border-slate-700/50 shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h2 className="font-semibold text-white">Live Simulation</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-700 transition-colors">
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        ) : selectedNode && !selectedEdge ? (
          // Node info display
          <div className="space-y-4">
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
              <h3 className="text-lg font-medium text-white mb-2">
                {selectedNode.label}
              </h3>
              {selectedNode.description && (
                <p className="text-slate-400 text-sm mb-3">
                  {selectedNode.description}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedNode.unit && (
                  <div>
                    <span className="text-slate-500">Unit:</span>
                    <span className="text-slate-300 ml-2">
                      {selectedNode.unit}
                    </span>
                  </div>
                )}
                {selectedNode.min_value !== undefined && (
                  <div>
                    <span className="text-slate-500">Min:</span>
                    <span className="text-slate-300 ml-2">
                      {selectedNode.min_value}
                    </span>
                  </div>
                )}
                {selectedNode.max_value !== undefined && (
                  <div>
                    <span className="text-slate-500">Max:</span>
                    <span className="text-slate-300 ml-2">
                      {selectedNode.max_value}
                    </span>
                  </div>
                )}
                {selectedNode.default_value !== undefined && (
                  <div>
                    <span className="text-slate-500">Default:</span>
                    <span className="text-slate-300 ml-2">
                      {selectedNode.default_value}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-center text-slate-500 text-sm">
              Click on an edge (relationship) to run a simulation
            </p>
          </div>
        ) : config ? (
          // Simulation display
          <div className="space-y-6">
            {/* Relationship Info */}
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                  {config.source_concept.label}
                </span>
                <ArrowRightLeft
                  className={`w-4 h-4 ${
                    config.relationship_type === "direct"
                      ? "text-blue-400"
                      : "text-orange-400"
                  }`}
                />
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                  {config.target_concept.label}
                </span>
              </div>
              <p className="text-slate-400 text-sm">
                {selectedEdge?.description}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs ${
                    config.relationship_type === "direct"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-orange-500/20 text-orange-400"
                  }`}>
                  {config.relationship_type === "direct"
                    ? "↑ Direct"
                    : "↓ Inverse"}
                </span>
                {config.equation && (
                  <span className="text-slate-500 text-xs font-mono">
                    {config.equation}
                  </span>
                )}
              </div>
            </div>

            {/* Input Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">
                  {config.source_concept.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={inputValue}
                    onChange={(e) =>
                      setInputValue(parseFloat(e.target.value) || 0)
                    }
                    className="w-20 px-2 py-1 text-right bg-slate-900 border border-slate-600 rounded text-white text-sm"
                  />
                  <span className="text-slate-500 text-sm">
                    {config.source_concept.unit}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={config.source_concept.min_value ?? 0}
                max={config.source_concept.max_value ?? 100}
                step={(config.source_concept.max_value ?? 100) / 100}
                value={inputValue}
                onChange={(e) => setInputValue(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>{config.source_concept.min_value ?? 0}</span>
                <span>{config.source_concept.max_value ?? 100}</span>
              </div>
            </div>

            {/* Arrow Indicator */}
            <div className="flex justify-center">
              <ArrowRight
                className={`w-8 h-8 ${
                  config.relationship_type === "direct"
                    ? "text-blue-400"
                    : "text-orange-400"
                }`}
              />
            </div>

            {/* Output Display */}
            <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 text-center">
              <label className="text-sm font-medium text-slate-400 block mb-2">
                {config.target_concept.label}
              </label>
              <div className="text-4xl font-bold text-white mb-2">
                {outputValue !== null ? outputValue.toFixed(2) : "—"}
              </div>
              <span className="text-slate-500 text-sm">
                {config.target_concept.unit}
              </span>

              {/* Visual indicator */}
              <div className="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    config.relationship_type === "direct"
                      ? "bg-gradient-to-r from-blue-600 to-blue-400"
                      : "bg-gradient-to-r from-orange-600 to-orange-400"
                  }`}
                  style={{
                    width:
                      outputValue !== null && config.target_concept.max_value
                        ? `${Math.min(
                            100,
                            Math.max(
                              0,
                              ((outputValue -
                                (config.target_concept.min_value ?? 0)) /
                                ((config.target_concept.max_value ?? 100) -
                                  (config.target_concept.min_value ?? 0))) *
                                100,
                            ),
                          )}%`
                        : "50%",
                  }}
                />
              </div>
            </div>

            {/* Explanation */}
            <div className="p-3 bg-slate-900/30 rounded-lg text-center">
              <p className="text-xs text-slate-500">
                {config.relationship_type === "direct"
                  ? "↑ As input increases, output increases"
                  : "↓ As input increases, output decreases"}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
