import { useState, useEffect, useMemo } from "react";
import { Minus, Zap, BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";
import type { ConceptNode, RelationshipEdge, SimulationConfig, SimulationFeedback } from "@/types";
import { calculateSimulation, getSimulationConfig } from "@/api/client";

interface ActiveSimulationProps {
    source?: ConceptNode | null;
    target?: ConceptNode | null;
    edge: RelationshipEdge;
    equation?: string;
    onClose: () => void;
}

export function ActiveSimulation({
    source,
    target,
    edge,
    equation: initialEquation,
    onClose,
}: ActiveSimulationProps) {
    const [config, setConfig] = useState<SimulationConfig | null>(null);
    const [loading, setLoading] = useState(true);

    // Initial values from props, updated by config when loaded
    const [inputValue, setInputValue] = useState(
        source?.default_value ?? ((source?.min_value ?? 0) + (source?.max_value ?? 100)) / 2
    );
    const [outputValue, setOutputValue] = useState(
        target?.default_value ?? ((target?.min_value ?? 0) + (target?.max_value ?? 100)) / 2
    );

    // Fetch full rich data on mount
    useEffect(() => {
        async function loadConfig() {
            try {
                setLoading(true);
                const data = await getSimulationConfig(edge.id);
                setConfig(data);

                // Update range if changed by backend generation
                if (data.source_concept.min_value !== undefined && data.source_concept.max_value !== undefined) {
                    // ensure current input is within new bounds
                    const min = data.source_concept.min_value;
                    const max = data.source_concept.max_value;
                    setInputValue(prev => Math.min(Math.max(prev, min), max));
                }
            } catch (err) {
                console.error("Failed to load simulation config", err);
            } finally {
                setLoading(false);
            }
        }
        loadConfig();
    }, [edge.id]);

    // Use props as fallback if config not yet loaded
    const activeEquation = config?.equation || initialEquation;
    const minVal = config?.source_concept.min_value ?? source?.min_value ?? 0;
    const maxVal = config?.source_concept.max_value ?? source?.max_value ?? 100;
    const range = maxVal - minVal || 100;
    const unit = config?.source_concept.unit || source?.unit || "Units";

    // Dynamic Feedback Logic
    const currentFeedback = useMemo(() => {
        if (!config?.feedback_rules) return null;

        // Find matching rule
        const rule = config.feedback_rules.find(r =>
            inputValue >= r.min_value && inputValue <= r.max_value
        );
        return rule;
    }, [inputValue, config]);

    // Generate curve points (MathML logic reused)
    const curvePoints = useMemo(() => {
        if (!activeEquation) return [];
        const points = [];
        const steps = 50;

        const safeEval = (x: number) => {
            try {
                let eqBody = activeEquation.trim();
                if (eqBody.includes("=")) eqBody = eqBody.split("=")[1].trim();
                const jsEq = eqBody.toLowerCase()
                    .replace(/\bexp\(/g, 'Math.exp(').replace(/\blog\(/g, 'Math.log(')
                    .replace(/\bsqrt\(/g, 'Math.sqrt(').replace(/\bpow\(/g, 'Math.pow(')
                    .replace(/\^/g, '**');
                return new Function('x', `return ${jsEq}`)(x);
            } catch { return 0; }
        };

        for (let i = 0; i <= steps; i++) {
            const x = minVal + (range * (i / steps));
            points.push({ x, y: safeEval(x) });
        }
        return points;
    }, [activeEquation, minVal, range]);

    const svgPath = useMemo(() => {
        if (curvePoints.length === 0) return "";
        const yValues = curvePoints.map(p => p.y);
        const minY = Math.min(...yValues);
        const maxY = Math.max(...yValues);
        const yRange = maxY - minY || 1;

        return curvePoints.map((p, i) => {
            const nX = ((p.x - minVal) / range) * 100;
            const nY = 90 - (((p.y - minY) / yRange) * 80);
            return `${i === 0 ? 'M' : 'L'} ${nX} ${nY}`;
        }).join(" ");
    }, [curvePoints, minVal, range]);

    // Update output value API call
    useEffect(() => {
        const timer = setTimeout(async () => {
            try {
                const res = await calculateSimulation(edge.id, inputValue);
                setOutputValue(res.output_value);
            } catch (e) { console.error(e); }
        }, 150);
        return () => clearTimeout(timer);
    }, [inputValue, edge.id]);


    if (loading) {
        return <div className="p-8 text-slate-400 flex items-center gap-2 animate-pulse"><Zap className="w-4 h-4" /> Generating Scenario...</div>;
    }

    return (
        <div className="h-full flex flex-col pt-6 pb-2 px-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-400" />
                        Learning Scenario
                    </h3>
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-widest">
                        Pedagogical Simulation
                    </span>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"><Minus className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4 space-y-6">

                {/* SCENARIO CONTEXT */}
                <div className="bg-gradient-to-br from-blue-900/40 to-slate-900/60 p-5 rounded-2xl border border-blue-500/20 shadow-lg">
                    <div className="flex gap-3">
                        <div className="mt-1 bg-blue-500/20 p-2 rounded-lg h-fit">
                            <Zap className="w-5 h-5 text-blue-300" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-blue-200 mb-1">Scenario</h4>
                            <p className="text-sm text-slate-200 leading-relaxed">
                                {config?.scenario_context || "Explore the relationship between these concepts by adjusting the variables below."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* INTERACTIVE STAGE */}
                <div className="grid grid-cols-1 gap-4">
                    {/* Dynamic Feedback Box */}
                    <div className={`
                p-5 rounded-2xl transition-all duration-500 border
                ${currentFeedback?.sentiment === 'warning' ? 'bg-amber-900/20 border-amber-500/30' :
                            currentFeedback?.sentiment === 'negative' ? 'bg-red-900/20 border-red-500/30' :
                                currentFeedback?.sentiment === 'positive' ? 'bg-emerald-900/20 border-emerald-500/30' :
                                    'bg-slate-800/40 border-white/5'}
             `}>
                        <div className="flex items-center gap-2 mb-2">
                            {currentFeedback?.sentiment === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500" />}
                            {currentFeedback?.sentiment === 'positive' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                            <span className={`text-xs font-bold uppercase tracking-wide
                           ${currentFeedback?.sentiment === 'warning' ? 'text-amber-400' :
                                    currentFeedback?.sentiment === 'positive' ? 'text-emerald-400' :
                                        'text-slate-400'}
                       `}>
                                Simulated Outcome
                            </span>
                        </div>
                        <p className="text-lg font-medium text-white">
                            {currentFeedback?.feedback_text || "Adjust the variable to see the impact."}
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/10">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <label className="text-sm font-bold text-blue-300 block mb-1">
                                    {config?.variable_explainer || config?.source_concept.label || "Input Variable"}
                                </label>
                                <span className="text-xs text-slate-500">
                                    Drag to adjust ({minVal} - {maxVal})
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-3xl font-bold text-white tracking-tight">{inputValue.toFixed(1)}</span>
                                <span className="text-sm text-slate-400 ml-1">{unit}</span>
                            </div>
                        </div>

                        <input
                            type="range"
                            min={minVal}
                            max={maxVal}
                            step={range / 100}
                            value={inputValue}
                            onChange={(e) => setInputValue(parseFloat(e.target.value))}
                            className="w-full h-4 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
                            style={{
                                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((inputValue - minVal) / range) * 100}%, #1e293b ${((inputValue - minVal) / range) * 100}%, #1e293b 100%)`
                            }}
                        />

                        <div className="flex justify-between mt-6 pt-4 border-t border-white/5">
                            <div className="text-center">
                                <span className="block text-2xl font-bold text-white">{outputValue.toFixed(1)}</span>
                                <span className="text-xs text-slate-500 uppercase font-bold">{target?.label || "Output"}</span>
                            </div>
                            {/* Mini Graph */}
                            <div className="h-12 w-24 opacity-50">
                                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <path d={svgPath} fill="none" stroke="#64748b" strokeWidth="2" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
