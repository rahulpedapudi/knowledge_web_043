import { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Html,
  QuadraticBezierLine,
  Billboard,
} from "@react-three/drei";
import * as THREE from "three";
import type { GraphData, ConceptNode, D3Link } from "@/types";
import {
  Database,
  Server,
  Code,
  Layers,
  Box,
  FileText,
  Activity,
  Users,
  DollarSign,
  PieChart,
  Zap,
} from "lucide-react";

// ============ Types ============

interface Node3D extends ConceptNode {
  position: [number, number, number];
  color: string;
  size: number;
  icon?: any;
  side?: "left" | "right" | "center";
  variant?: "dark" | "vibrant" | "glass";
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
  onBackgroundClick?: () => void;
}

// ============ Helpers ============

const getNodeIcon = (node: ConceptNode) => {
  const label = node.label.toLowerCase();
  if (label.includes("data") || label.includes("sql")) return Database;
  if (label.includes("server") || label.includes("host")) return Server;
  if (
    label.includes("user") ||
    label.includes("client") ||
    label.includes("employer") ||
    label.includes("employee")
  )
    return Users;
  if (
    label.includes("money") ||
    label.includes("cost") ||
    label.includes("price") ||
    label.includes("payroll")
  )
    return DollarSign;
  if (label.includes("chart") || label.includes("analytic")) return PieChart;
  if (label.includes("file") || label.includes("doc")) return FileText;
  if (
    label.includes("code") ||
    label.includes("function") ||
    label.includes("api")
  )
    return Code;
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

// ============ 3D Components ============

function ConnectionLine({
  start,
  end,
  color,
  isActive,
  onHover,
  onUnhover,
  onClick,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  isActive: boolean;
  onHover: () => void;
  onUnhover: () => void;
  onClick: () => void;
}) {
  const mid = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2 + (isActive ? 5 : 2),
    (start[2] + end[2]) / 2,
  ] as [number, number, number];

  return (
    <group>
      <QuadraticBezierLine
        start={start}
        end={end}
        mid={mid}
        color={isActive ? "#ffffff" : color}
        lineWidth={isActive ? 3 : 1}
        transparent
        opacity={isActive ? 0.9 : 0.6}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover();
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onUnhover();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      />
      <QuadraticBezierLine
        start={start}
        end={end}
        mid={mid}
        color="transparent"
        lineWidth={15}
        transparent
        opacity={0}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover();
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onUnhover();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      />
    </group>
  );
}

function NodeCard({
  node,
  isSelected,
  isHighlighted,
  onClick,
  calculatedPosition,
}: {
  node: Node3D;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: () => void;
  calculatedPosition: [number, number, number];
}) {
  const Icon = node.icon || Box;
  const isCenter = node.side === "center";

  let gradient = "from-slate-700 to-slate-600";
  if (isCenter) {
    gradient = "from-purple-600 to-indigo-700";
  } else if (node.variant === "vibrant") {
    const hash = node.id
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
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
      lockZ={false}>
      <Html transform position={[0, 0, 0]} center zIndexRange={[100, 0]}>
        <div
          onClick={onClick}
          className={`
                        relative group cursor-pointer transition-all duration-300
                        ${isSelected ? "scale-125 z-50" : isHighlighted ? "scale-110 z-40" : "hover:scale-110 z-10"}
                        ${!isSelected && !isHighlighted ? "opacity-90" : "opacity-100"}
                    `}>
          {(isSelected || isHighlighted || isCenter) && (
            <div
              className={`
                            absolute -inset-6 rounded-full blur-2xl animate-pulse
                            bg-gradient-to-r ${gradient}
                            ${isCenter ? "opacity-40" : "opacity-20"}
                        `}
            />
          )}

          <div
            className={`
                        flex flex-col items-center justify-center
                        backdrop-blur-xl border shadow-2xl transition-all duration-300
                        ${isCenter
                ? "w-48 h-48 rounded-full border-purple-500/50 bg-[#13131f]/90"
                : "w-32 h-32 rounded-3xl"
              }
                        ${!isCenter &&
              (isSelected
                ? "border-white/60 bg-[#1e1e2e]/95"
                : "border-white/10 bg-[#0a0a0f]/80 hover:border-white/30 hover:bg-[#13131f]/90")
              }
                    `}>
            <div
              className={`
                            flex items-center justify-center mb-3 text-white shadow-lg
                            ${isCenter
                  ? `w-20 h-20 rounded-full bg-gradient-to-br ${gradient}`
                  : `w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient}`
                }
                        `}>
              <Icon className={`${isCenter ? "w-10 h-10" : "w-7 h-7"}`} />
            </div>

            <div className="px-3 text-center w-full">
              <span
                className={`
                                block font-bold text-white leading-tight truncate w-full
                                ${isCenter ? "text-xl tracking-wide" : "text-sm"}
                                drop-shadow-md
                            `}>
                {node.label}
              </span>

              {node.variant === "vibrant" && node.min_value !== undefined && (
                <div
                  className={`
                                    mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium
                                    bg-gradient-to-r ${gradient} text-white shadow-sm
                                `}>
                  $
                  {(
                    (node.min_value + (node.max_value || 0)) /
                    2
                  ).toLocaleString()}
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
  onNodeClick,
  onEdgeClick,
}: {
  nodes: Node3D[];
  edges: any[];
  selectedNodeId: string | null | undefined;
  selectedEdgeId: string | null | undefined;
  onNodeClick: (n: Node3D) => void;
  onEdgeClick: (e: D3Link) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [animatedNodes, setAnimatedNodes] = useState<Node3D[]>(nodes);

  useEffect(() => {
    setAnimatedNodes(nodes);
  }, [nodes]);

  useFrame((state, delta) => {
    if (!selectedNodeId && !selectedEdgeId) {
      if (groupRef.current) {
        groupRef.current.rotation.y += delta * 0.15;
      }
    }
  });

  const highlightSet = useMemo(() => {
    const set = new Set<string>();
    if (selectedNodeId) {
      set.add(selectedNodeId);
      edges.forEach((e) => {
        if (e.source === selectedNodeId) set.add(e.target);
        if (e.target === selectedNodeId) set.add(e.source);
      });
    }
    if (selectedEdgeId) {
      const edge = edges.find(e => e.id === selectedEdgeId);
      if (edge) {
        set.add(edge.source);
        set.add(edge.target);
      }
    }
    return set;
  }, [selectedNodeId, selectedEdgeId, edges]);

  return (
    <group ref={groupRef}>
      {edges.map((edge, i) => {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) return null;

        const isConnectedToSelection =
          highlightSet.has(source.id) && highlightSet.has(target.id);
        const isHovered = hoveredEdgeId === edge.id;

        let color = "#4b5563";
        if (target.variant === "vibrant" || source.variant === "vibrant")
          color = "#a855f7";

        const isSelected = selectedEdgeId === edge.id;
        // If hovered or selected, white. If connected to selection, also white but maybe different?
        // User wants "highlighted properly".
        if (isHovered || isSelected) color = "#ffffff";
        else if (isConnectedToSelection) color = "#e2e8f0"; // Slightly dimmer than active hover

        return (
          <ConnectionLine
            key={edge.id}
            start={source.position}
            end={target.position}
            color={color}
            isActive={isConnectedToSelection || isHovered || isSelected}
            onHover={() => setHoveredEdgeId(edge.id)}
            onUnhover={() => setHoveredEdgeId(null)}
            onClick={() => onEdgeClick(edge)}
          />
        );
      })}

      {nodes.map((node) => (
        <NodeCard
          key={node.id}
          node={node}
          isSelected={node.id === selectedNodeId}
          isHighlighted={highlightSet.has(node.id)}
          onClick={() => onNodeClick(node)}
          calculatedPosition={node.position}
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
  onBackgroundClick,
}: ConceptGraph3DProps) {
  // Orbital Layout Algorithm
  const { nodes3D, edges3D } = useMemo(() => {
    const nodes: Node3D[] = [];

    const rootNodes = graphData.concepts.filter(
      (c) => (c.depth_level ?? 0) === 0,
    );
    const root = rootNodes.length > 0 ? rootNodes[0] : graphData.concepts[0];

    if (!root) return { nodes3D: [], edges3D: [] };

    nodes.push({
      ...root,
      position: [0, 0, 0],
      color: "#ffffff",
      size: 1.5,
      icon: Zap,
      side: "center",
      variant: "glass",
    });

    const remainders = graphData.concepts.filter((c) => c.id !== root.id);

    const innerOrbitNodes: ConceptNode[] = [];
    const outerOrbitNodes: ConceptNode[] = [];

    remainders.forEach((node) => {
      const label = node.label.toLowerCase();
      const type = node.semantic_type || "";
      const isEntity =
        label.includes("user") ||
        label.includes("client") ||
        label.includes("empl") ||
        label.includes("group") ||
        type === "entity";

      if (isEntity) innerOrbitNodes.push(node);
      else outerOrbitNodes.push(node);
    });

    if (innerOrbitNodes.length === 0) {
      const half = Math.ceil(outerOrbitNodes.length / 2);
      innerOrbitNodes.push(...outerOrbitNodes.splice(0, half));
    }

    const innerRadius = 16;
    const innerStep = (Math.PI * 2) / Math.max(1, innerOrbitNodes.length);

    innerOrbitNodes.forEach((node, i) => {
      const angle = i * innerStep;
      nodes.push({
        ...node,
        position: [
          Math.cos(angle) * innerRadius,
          0,
          Math.sin(angle) * innerRadius,
        ],
        color: "#1f293b",
        size: 1,
        side: "left",
        variant: "dark",
        icon: getNodeIcon(node),
      });
    });

    const outerRadius = 28;
    const outerStep = (Math.PI * 2) / Math.max(1, outerOrbitNodes.length);

    outerOrbitNodes.forEach((node, i) => {
      const angle = i * outerStep + Math.PI / 4;
      const y = Math.sin(angle * 2) * 8;

      nodes.push({
        ...node,
        position: [
          Math.cos(angle) * outerRadius,
          y,
          Math.sin(angle) * outerRadius,
        ],
        color: "#ff00ff",
        size: 1,
        side: "right",
        variant: "vibrant",
        icon: getNodeIcon(node),
      });
    });

    return { nodes3D: nodes, edges3D: graphData.relationships };
  }, [graphData]);

  return (
    <div className="w-full h-full relative bg-transparent">
      <Canvas
        camera={{ position: [0, 30, 45], fov: 45 }}
        onPointerMissed={(e) => {
          // Deselect on background click
          if (onBackgroundClick) onBackgroundClick();
        }}>
        <fog attach="fog" args={["#050510", 40, 150]} />
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
          onEdgeClick={onEdgeSelect}
        />

        <OrbitControls
          enableRotate={true}
          enableZoom={true}
          enablePan={true}
          maxDistance={120}
          minDistance={10}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}
