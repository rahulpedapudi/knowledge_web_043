import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, QuadraticBezierLine, Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { GraphData, ConceptNode, D3Link } from "@/types";
import {
    Cpu,
    Database,
    Globe,
    Server,
    Code,
    Layers,
    Box,
    FileText,
    Activity,
    Users,
    Briefcase,
    DollarSign,
    PieChart,
    Zap,
    Layout
} from "lucide-react";

// ============ Types ============

interface Node3D extends ConceptNode {
    position: [number, number, number];
    color: string;
    size: number;
    icon?: any;
    side?: 'left' | 'right' | 'center'; // Kept for compatibility, mapped to Orbit types
    variant?: 'dark' | 'vibrant' | 'glass';
    orbitSpeed?: number;
    orbitRadius?: number;
    orbitY?: number;
    initialAngle?: number;
}

interface ConceptGraph3DProps {
    graphData: GraphData;
    onNodeSelect: (node: ConceptNode) => void;
    onNodeExpand: (node: ConceptNode) => void;
    onEdgeSelect: (edge: D3Link) => void;
    selectedNodeId?: string | null;
    selectedEdgeId?: string | null;
}

// ============ Helpers ============

const getNodeIcon = (node: ConceptNode) => {
    const label = node.label.toLowerCase();
    if (label.includes("data") || label.includes("sql")) return Database;
    if (label.includes("server") || label.includes("host")) return Server;
    if (label.includes("user") || label.includes("client") || label.includes("employer") || label.includes("employee")) return Users;
    if (label.includes("money") || label.includes("cost") || label.includes("price") || label.includes("payroll")) return DollarSign;
    if (label.includes("chart") || label.includes("analytic")) return PieChart;
    if (label.includes("file") || label.includes("doc")) return FileText;
    if (label.includes("code") || label.includes("function") || label.includes("api")) return Code;
    if (label.includes("group")) return Layers;
    return Activity;
};

// Vibrant colors for Resources (Outer Orbit)
const VIBRANT_COLORS = [
    "from-purple-500 to-indigo-600",
    "from-emerald-400 to-green-600",
    "from-orange-400 to-red-500",
    "from-blue-400 to-cyan-500",
    "from-pink-500 to-rose-500",
];

// Dark colors for Entities (Inner Orbit)
const DARK_COLORS = [
    "from-slate-700 to-slate-800",
    "from-slate-800 to-zinc-800",
    "from-neutral-800 to-stone-900",
];

// ============ 3D Components ============

function ConnectionLine({
    start,
    end,
    color,
    isActive,
    onHover,
    onUnhover
}: {
    start: [number, number, number],
    end: [number, number, number],
    color: string,
    isActive: boolean,
    onHover: () => void,
    onUnhover: () => void
}) {
    // Standard Bezier for orbits (Center to Orbit)
    // We lift the mid point significantly to create "Arches"

    // Check distance - if far (Orbit to Orbit), high arch. If Center to Orbit, medium arch.
    const dist = Math.sqrt(
        Math.pow(end[0] - start[0], 2) +
        Math.pow(end[2] - start[2], 2)
    );

    const mid = [
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2 + (isActive ? 5 : 2), // Higher arch when active
        (start[2] + end[2]) / 2
    ] as [number, number, number];

    return (
        <group>
            {/* Visible Line */}
            <QuadraticBezierLine
                start={start}
                end={end}
                mid={mid}
                color={isActive ? "#ffffff" : color}
                lineWidth={isActive ? 3 : 1}
                transparent
                opacity={isActive ? 0.9 : 0.3}
                onPointerOver={(e) => { e.stopPropagation(); onHover(); }}
                onPointerOut={(e) => { e.stopPropagation(); onUnhover(); }}
            />
            {/* Hitbox */}
            <QuadraticBezierLine
                start={start}
                end={end}
                mid={mid}
                color="transparent"
                lineWidth={15}
                transparent
                opacity={0}
                onPointerOver={(e) => { e.stopPropagation(); onHover(); }}
                onPointerOut={(e) => { e.stopPropagation(); onUnhover(); }}
            />
        </group>
    );
}

function NodeCard({
    node,
    isSelected,
    isHighlighted,
    onClick,
    calculatedPosition
}: {
    node: Node3D,
    isSelected: boolean,
    isHighlighted: boolean,
    onClick: () => void,
    calculatedPosition: [number, number, number]
}) {
    const Icon = node.icon || Box;
    const isCenter = node.side === 'center';

    // Choose Gradient based on Variant (which we mapped to side/orbit)
    let gradient = "from-slate-700 to-slate-600";
    if (isCenter) {
        gradient = "from-purple-600 to-indigo-700";
    } else if (node.variant === 'vibrant') {
        const hash = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        gradient = VIBRANT_COLORS[hash % VIBRANT_COLORS.length];
    } else {
        gradient = "from-[#1a1b26] to-[#24283b]";
    }

    return (
        <Billboard
            position={calculatedPosition}
            follow={true}
            lockX={false}
            lockY={false}
            lockZ={false}
        >
            <Html transform position={[0, 0, 0]} center zIndexRange={[100, 0]}>
                <div
                    onClick={onClick}
                    className={`
                        relative group cursor-pointer transition-all duration-300
                        ${isSelected ? 'scale-125 z-50' : isHighlighted ? 'scale-110 z-40' : 'hover:scale-110 z-10'}
                        ${!isSelected && !isHighlighted ? 'opacity-90' : 'opacity-100'}
                    `}
                >
                    {/* Active Halo */}
                    {(isSelected || isHighlighted || isCenter) && (
                        <div className={`
                            absolute -inset-6 rounded-full blur-2xl animate-pulse
                            bg-gradient-to-r ${gradient}
                            ${isCenter ? 'opacity-40' : 'opacity-20'}
                        `} />
                    )}

                    {/* Main Card Content */}
                    <div className={`
                        flex flex-col items-center justify-center
                        backdrop-blur-xl border shadow-2xl transition-all duration-300
                        ${isCenter
                            ? 'w-48 h-48 rounded-full border-purple-500/50 bg-[#13131f]/90'
                            : 'w-32 h-32 rounded-3xl'
                        }
                        ${!isCenter && (isSelected
                            ? 'border-white/60 bg-[#1e1e2e]/95'
                            : 'border-white/10 bg-[#0a0a0f]/80 hover:border-white/30 hover:bg-[#13131f]/90'
                        )}
                    `}>
                        {/* Icon Container */}
                        <div className={`
                            flex items-center justify-center mb-3 text-white shadow-lg
                            ${isCenter
                                ? `w-20 h-20 rounded-full bg-gradient-to-br ${gradient}`
                                : `w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient}`
                            }
                        `}>
                            <Icon className={`${isCenter ? 'w-10 h-10' : 'w-7 h-7'}`} />
                        </div>

                        {/* Label */}
                        <div className="px-3 text-center w-full">
                            <span className={`
                                block font-bold text-white leading-tight truncate w-full
                                ${isCenter ? 'text-xl tracking-wide' : 'text-sm'}
                                drop-shadow-md
                            `}>
                                {node.label}
                            </span>

                            {/* Stats Badge - Only for Resources/Vibrant nodes to keep it clean */}
                            {node.variant === 'vibrant' && node.min_value !== undefined && (
                                <div className={`
                                    mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium
                                    bg-gradient-to-r ${gradient} text-white shadow-sm
                                `}>
                                    ${((node.min_value + (node.max_value || 0)) / 2).toLocaleString()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Html>
        </Billboard>
    );
}

function Scene({
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    onNodeClick
}: {
    nodes: Node3D[],
    edges: any[],
    selectedNodeId: string | null | undefined,
    selectedEdgeId: string | null | undefined,
    onNodeClick: (n: Node3D) => void
}) {
    const groupRef = useRef<THREE.Group>(null);
    const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
    // State to force re-renders for animation if needed, or refs for positions.
    // However, React Three Fiber makes it easier to animate inside components.
    // For orbit, we need to calculate position every frame if we want them to actually move.

    // We'll store current positions in a local ref map to avoid full React reconciliations every frame?
    // Actually, for < 50 nodes, React reconciliations are fine. 
    // To make it efficient, we can use a Ref for the timestamps.
    const timeRef = useRef(0);
    const [animatedNodes, setAnimatedNodes] = useState<Node3D[]>(nodes);

    // Update local state when props change
    useEffect(() => {
        setAnimatedNodes(nodes);
    }, [nodes]);

    // Animate Orbits
    useFrame((state, delta) => {
        if (!selectedNodeId) { // Pause logic: only rotate if no node selected? Or keep rotating? 
            // User requested "Revolve", usually implies constant motion.

            timeRef.current += delta * 0.2; // Speed factor

            // We can't easily update the 'nodes' prop array directly. 
            // Instead, we can pass the time to the NodeCard/ConnectionLine or update state.
            // Updating state every frame in React is heavy.
            // Better approach: Calculate positions in the Render loop.
            // But we need positions for Lines too.

            // Optimized approach for R3F:
            // Use refs for the group/nodes and update matrix? hard with HTML.
            // We will stick to state update for now, optimized by only doing it if essential.
            // Actually, let's just use `useFrame` to update a ref-based position map if possible, 
            // but since we render generic components, let's just make the whole Group rotate?
            // "Nodes should revolve around the centre" -> Whole system rotation?
            // "Centre" implies the hub stays still.

            // If the hub is 0,0,0, rotating the whole Group around Y works perfectly and is cheap!
            if (groupRef.current) {
                groupRef.current.rotation.y += delta * 0.15;
            }
        }
    });

    // Identify highlighted nodes
    const highlightSet = useMemo(() => {
        const set = new Set<string>();
        if (selectedNodeId) {
            set.add(selectedNodeId);
            edges.forEach(e => {
                if (e.source === selectedNodeId) set.add(e.target);
                if (e.target === selectedNodeId) set.add(e.source);
            });
        }
        return set;
    }, [selectedNodeId, edges]);

    return (
        <group ref={groupRef}>
            {/* Edges */}
            {edges.map((edge, i) => {
                const source = nodes.find(n => n.id === edge.source);
                const target = nodes.find(n => n.id === edge.target);
                if (!source || !target) return null;

                const isConnectedToSelection = highlightSet.has(source.id) && highlightSet.has(target.id);
                const isHovered = hoveredEdgeId === edge.id;

                let color = "#4b5563";
                if (target.variant === 'vibrant' || source.variant === 'vibrant') color = "#a855f7";
                if (isHovered || isConnectedToSelection) color = "#ffffff";

                return (
                    <ConnectionLine
                        key={edge.id}
                        start={source.position}
                        end={target.position}
                        color={color}
                        isActive={isConnectedToSelection || isHovered}
                        onHover={() => setHoveredEdgeId(edge.id)}
                        onUnhover={() => setHoveredEdgeId(null)}
                    />
                );
            })}

            {/* Nodes */}
            {nodes.map(node => (
                <NodeCard
                    key={node.id}
                    node={node}
                    isSelected={node.id === selectedNodeId}
                    isHighlighted={highlightSet.has(node.id)}
                    onClick={() => onNodeClick(node)}
                    calculatedPosition={node.position} // If we were doing individual orbits, we'd calc this here
                />
            ))}
        </group>
    );
}

export function ConceptGraph3D({
    graphData,
    onNodeSelect,
    onNodeExpand,
    onEdgeSelect,
    selectedNodeId,
    selectedEdgeId,
}: ConceptGraph3DProps) {

    // Orbital Layout Algorithm
    const { nodes3D, edges3D } = useMemo(() => {
        const nodes: Node3D[] = [];

        // 1. Identify Root
        const rootNodes = graphData.concepts.filter(c => (c.depth_level ?? 0) === 0);
        const root = rootNodes.length > 0 ? rootNodes[0] : graphData.concepts[0];

        if (!root) return { nodes3D: [], edges3D: [] };

        // Place Root
        nodes.push({
            ...root,
            position: [0, 0, 0],
            color: "#ffffff",
            size: 1.5,
            icon: Zap,
            side: 'center',
            variant: 'glass'
        });

        // 2. Classify remaining nodes
        const remainders = graphData.concepts.filter(c => c.id !== root.id);

        const innerOrbitNodes: ConceptNode[] = [];
        const outerOrbitNodes: ConceptNode[] = [];

        // Logic: Entities (People) -> Inner Orbit. Resources (Data) -> Outer Orbit.
        remainders.forEach(node => {
            const label = node.label.toLowerCase();
            const type = node.semantic_type || "";
            const isEntity = label.includes("user") || label.includes("client") || label.includes("empl") || label.includes("group") || type === "entity";

            if (isEntity) innerOrbitNodes.push(node);
            else outerOrbitNodes.push(node);
        });

        // Balance check: if either is empty/too small, mix them
        if (innerOrbitNodes.length === 0) {
            const half = Math.ceil(outerOrbitNodes.length / 2);
            innerOrbitNodes.push(...outerOrbitNodes.splice(0, half));
        }

        // 3. Position Inner Orbit (Entities, Dark)
        const innerRadius = 16;
        const innerStep = (Math.PI * 2) / Math.max(1, innerOrbitNodes.length);

        innerOrbitNodes.forEach((node, i) => {
            const angle = i * innerStep;
            nodes.push({
                ...node,
                position: [
                    Math.cos(angle) * innerRadius,
                    0, // Flat ring
                    Math.sin(angle) * innerRadius
                ],
                color: "#1e293b",
                size: 1,
                side: 'left', // mapped to inner
                variant: 'dark',
                icon: getNodeIcon(node)
            });
        });

        // 4. Position Outer Orbit (Resources, Vibrant)
        const outerRadius = 28;
        const outerStep = (Math.PI * 2) / Math.max(1, outerOrbitNodes.length);

        outerOrbitNodes.forEach((node, i) => {
            const angle = i * outerStep + (Math.PI / 4); // Offset start
            // Add some verticality to outer ring for "3D" feel
            const y = Math.sin(angle * 2) * 8;

            nodes.push({
                ...node,
                position: [
                    Math.cos(angle) * outerRadius,
                    y,
                    Math.sin(angle) * outerRadius
                ],
                color: "#ff00ff",
                size: 1,
                side: 'right', // mapped to outer
                variant: 'vibrant',
                icon: getNodeIcon(node)
            });
        });

        return { nodes3D: nodes, edges3D: graphData.relationships };

    }, [graphData]);

    return (
        <div className="w-full h-full relative bg-transparent">
            {/* Camera angle logic:
                User wants to see them revolving. 
                A slight high-angle view (45 deg) is best for orbits.
            */}
            <Canvas camera={{ position: [0, 30, 45], fov: 45 }}>
                {/* Environment */}
                <fog attach="fog" args={['#050510', 40, 150]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[0, 20, 0]} intensity={2} color="#ffffff" />
                <pointLight position={[20, 0, 20]} intensity={1} color="#a855f7" />
                <pointLight position={[-20, 0, -20]} intensity={1} color="#3b82f6" />

                <Scene
                    nodes={nodes3D}
                    edges={edges3D}
                    selectedNodeId={selectedNodeId}
                    selectedEdgeId={selectedEdgeId}
                    onNodeClick={onNodeSelect}
                />

                <OrbitControls
                    enableRotate={true}
                    enableZoom={true}
                    enablePan={true}
                    maxDistance={120}
                    minDistance={10}
                    autoRotate={false} // We handle rotation in Scene for precise control
                />
            </Canvas>
        </div>
    );
}
