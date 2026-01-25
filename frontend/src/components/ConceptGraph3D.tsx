import { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Html,
  QuadraticBezierLine,
  Billboard,
} from "@react-three/drei";
import * as THREE from "three";
import { useSpring, animated } from "@react-spring/three";
import { useDrag } from "@use-gesture/react";
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
  Play,
  Pause,
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
  opacity,
  lineWidth,
  onHover,
  onUnhover,
  onClick,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  isActive: boolean;
  opacity?: number;
  lineWidth?: number;
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
        lineWidth={lineWidth || (isActive ? 3 : 1.5)}
        transparent
        opacity={opacity !== undefined ? opacity : isActive ? 1.0 : 0.7}
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
  onNodeDragStart,
  onNodeDragEnd,
  onPointerOver,
  onPointerOut,
}: {
  node: Node3D;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: () => void;
  calculatedPosition: [number, number, number];
  onNodeDragStart: () => void;
  onNodeDragEnd: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
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
    gradient = "from-[#1e293b] to-[#334155]"; // Lighter slate for better visibility
  }

  // Spring physics for "sticky fluidy" feel
  const [spring, api] = useSpring(() => ({
    position: calculatedPosition,
    scale: isSelected ? 1.25 : isHighlighted ? 1.1 : 1,
    config: { mass: 1, tension: 170, friction: 26 }, // Sticky/Fluid physics
  }));

  // Update spring target when layout changes (unless dragging)
  useEffect(() => {
    api.start({
      position: calculatedPosition,
      scale: isSelected ? 1.25 : isHighlighted ? 1.1 : 1,
    });
  }, [calculatedPosition, isSelected, isHighlighted, api]);

  // Drag logic
  const bind = useDrag(
    ({ active, movement: [x, y], memo = spring.position.get() }) => {
      if (active) {
        onNodeDragStart();
        // Convert screen drag to 3D space rough approximation or just screen plane
        // Simple 3D drag: scale movement by factor
        const factor = 0.1;
        api.start({
          position: [memo[0] + x * factor, memo[1] - y * factor, memo[2]],
          immediate: true,
        });
      } else {
        onNodeDragEnd();
        // Snap back to orbit or stay? User said "movable", so maybe stay?
        // But layout is orbital. Let's snap back for "sticky" feel as per "sticky fluidy".
        // Use calculatedPosition for snap back.
        api.start({ position: calculatedPosition });
      }
      return memo;
    },
    { delay: true },
  );

  return (
    // @ts-ignore - animated.group works but TS might complain about Billboard prop mapping if wrapped directly
    <animated.group position={spring.position} scale={spring.scale} {...bind()}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <Html
          transform
          position={[0, 0, 0]}
          center
          zIndexRange={[100, 0]}
          style={{ pointerEvents: "none" }}>
          <div
            onPointerOver={(e) => {
              e.stopPropagation();
              onPointerOver();
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              onPointerOut();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className={`
                        relative group cursor-pointer transition-all duration-300
                        pointer-events-auto select-none
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
                          ${
                            isCenter
                              ? "w-56 h-56 rounded-full border-purple-500/50 bg-[#1e1b4b]/95" // Even larger center
                              : "w-48 h-48 rounded-full" // Circular Shape
                          }
                          ${
                            !isCenter &&
                            (isSelected
                              ? "border-white/80 bg-[#1e293b]/95"
                              : "border-white/20 bg-[#0f172a]/90 hover:border-white/40 hover:bg-[#1e293b]/95")
                          }
                      `}>
              <div
                className={`
                              flex items-center justify-center mb-3 text-white shadow-lg
                              ${
                                isCenter
                                  ? `w-20 h-20 rounded-full bg-linear-to-br ${gradient}`
                                  : `w-14 h-14 rounded-full bg-linear-to-br ${gradient}`
                              }
                          `}>
                <Icon className={`${isCenter ? "w-10 h-10" : "w-7 h-7"}`} />
              </div>

              <div className="px-3 text-center w-full">
                <span
                  className={`
                                  block font-bold text-white leading-tight w-full
                                  ${isCenter ? "text-3xl tracking-wide" : "text-xl"}
                                  drop-shadow-xl break-words
                              `}>
                  {node.label}
                </span>

                {node.variant === "vibrant" &&
                  node.min_value !== undefined &&
                  (node.min_value + (node.max_value || 0)) / 2 > 0 && (
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
    </animated.group>
  );
}

function Scene({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  onNodeClick,
  onEdgeClick,
  isPaused,
}: {
  nodes: Node3D[];
  edges: any[];
  selectedNodeId: string | null | undefined;
  selectedEdgeId: string | null | undefined;
  onNodeClick: (n: Node3D) => void;
  onEdgeClick: (e: D3Link) => void;
  isPaused: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [, setAnimatedNodes] = useState<Node3D[]>(nodes);

  // Update view when nodes/edges change (e.g. expansion)
  useEffect(() => {
    setAnimatedNodes(nodes);
  }, [nodes]);

  useFrame((_state, delta) => {
    if (!selectedNodeId && !selectedEdgeId && !isPaused) {
      if (groupRef.current) {
        groupRef.current.rotation.y += delta * 0.05;
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
      const edge = edges.find((e) => e.id === selectedEdgeId);
      if (edge) {
        set.add(edge.source);
        set.add(edge.target);
      }
    }
    return set;
  }, [selectedNodeId, selectedEdgeId, edges]);

  return (
    <group ref={groupRef}>
      {edges.map((edge, _i) => {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) return null;

        const isHovered = hoveredEdgeId === edge.id;
        const isSelected = selectedEdgeId === edge.id;

        // Spotlight Logic
        // 1. If a node is hovered, highlight its connections.
        // 2. If NO node is hovered but a node is SELECTED, highlight its connections (Persistent Highlight).
        // 3. Otherwise default state.

        let opacity = 0.2; // Default "clean" state
        let lineWidth = 1.0;

        // Effective focus is hover if present, otherwise selection
        const effectiveFocusId = hoveredNodeId || selectedNodeId;

        if (effectiveFocusId) {
          const isConnectedToFocus =
            edge.source === effectiveFocusId ||
            edge.target === effectiveFocusId;

          if (isConnectedToFocus) {
            opacity = 1.0; // Spotlight
            lineWidth = 2.0;
          } else {
            // If dragging or just viewing, dim unconnected
            opacity = 0.05;
          }
        }

        // Edge specific hover/select overrides
        if (isHovered || isSelected) {
          opacity = 1.0;
          lineWidth = 2.0;
        }

        // Brighter default edge color for dark background (kept from previous tweak)
        let color = "#94a3b8"; // slate-400
        if (target.variant === "vibrant" || source.variant === "vibrant")
          color = "#c084fc"; // purple-400 (brighter)

        if (isHovered || isSelected) color = "#ffffff";
        else if (
          effectiveFocusId &&
          (edge.source === effectiveFocusId || edge.target === effectiveFocusId)
        ) {
          color = "#ffffff"; // Also white/bright for spotlighted edges
        }

        return (
          <ConnectionLine
            key={edge.id}
            start={source.position}
            end={target.position}
            color={color}
            isActive={opacity > 0.5} // Used for animation state if needed
            lineWidth={lineWidth} // Pass calculated width
            opacity={opacity} // Pass opacity directly (if props allow, see next step if types fail)
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
          isHighlighted={
            highlightSet.has(node.id) ||
            (hoveredNodeId !== null && hoveredNodeId === node.id)
          } // Highlight hovered node too
          onClick={() => onNodeClick(node)}
          calculatedPosition={node.position}
          onNodeDragStart={() => {
            /* Optional: Pause rotation while dragging */
          }}
          onNodeDragEnd={() => {}}
          onPointerOver={() => setHoveredNodeId(node.id)}
          onPointerOut={() => setHoveredNodeId(null)}
        />
      ))}
    </group>
  );
}

export function ConceptGraph3D({
  graphData,
  onNodeSelect,
  onEdgeSelect,
  selectedNodeId,
  selectedEdgeId,
  onBackgroundClick,
}: ConceptGraph3DProps) {
  // State for expanded nodes (LOD)
  // Initially empty, or could pre-expand root?
  // User wants level 0 & 1 visible by default.
  // Clicking level 1 expands to show connected level 2.
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    new Set(),
  );
  const [isPaused, setIsPaused] = useState(false);
  const [initialNodeIds, setInitialNodeIds] = useState<Set<string>>(new Set());

  // Reset expansion and calculate INITIAL view when graph data changes
  useEffect(() => {
    setExpandedNodeIds(new Set());

    // Calculate initial visible set ONCE
    const ids = new Set<string>();
    graphData.concepts.forEach((node) => {
      // User Request: Only show up to Priority 3
      if (node.priority !== undefined && node.priority > 3) return;

      const isPriority1 = node.priority === 1;
      const isCore = (node.depth_level ?? 0) === 0;
      // Fallback for legacy: priority undefined AND depth 1
      const isLegacyPrimary =
        node.priority === undefined && node.depth_level === 1;

      if (isPriority1 || isCore || isLegacyPrimary) {
        ids.add(node.id);
      }
    });

    // Safety Fallback: If nothing is visible, show top 5 concepts
    if (ids.size === 0 && graphData.concepts.length > 0) {
      graphData.concepts.slice(0, 5).forEach((c) => ids.add(c.id));
    }

    setInitialNodeIds(ids);
  }, [graphData]);

  // Handle local node click for expansion + prop callback
  const handleNodeClick = (node: ConceptNode) => {
    // Expand this node
    const newExpanded = new Set(expandedNodeIds);
    newExpanded.add(node.id);
    setExpandedNodeIds(newExpanded);

    // Call original handler
    onNodeSelect(node);
  };

  // 1. STABLE LAYOUT ALGORITHM (Positions dependent ONLY on graphData)
  const layoutNodes = useMemo(() => {
    const nodes: Node3D[] = [];

    // Use all nodes for layout to ensure stability
    const allConcepts = graphData.concepts;
    const rootNodes = allConcepts.filter((c) => (c.depth_level ?? 0) === 0);
    const root = rootNodes.length > 0 ? rootNodes[0] : allConcepts[0];

    if (!root) return [];

    nodes.push({
      ...root,
      position: [0, 0, 0],
      color: "#ffffff",
      size: 2.0,
      icon: Zap,
      side: "center",
      variant: "glass",
    });

    const remainders = allConcepts.filter((c) => c.id !== root.id);

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

    const innerRadius = 18;
    const innerStep = (Math.PI * 2) / Math.max(1, innerOrbitNodes.length);

    innerOrbitNodes.forEach((node, i) => {
      const angle = i * innerStep;
      // Size based on importance
      let size = 0.8;
      if (node.priority === 1) size = 1.8;
      else if (node.priority === 2) size = 1.2;
      else if (node.priority === undefined) {
        if (node.depth_level === 0) size = 1.8;
        else if (node.depth_level === 1) size = 1.2;
      }

      nodes.push({
        ...node,
        position: [
          Math.cos(angle) * innerRadius,
          0,
          Math.sin(angle) * innerRadius,
        ],
        color: "#1f293b",
        size: size,
        side: "left",
        variant: "dark",
        icon: getNodeIcon(node),
      });
    });

    const outerRadius = 32;
    const outerStep = (Math.PI * 2) / Math.max(1, outerOrbitNodes.length);

    outerOrbitNodes.forEach((node, i) => {
      const angle = i * outerStep + Math.PI / 4;
      const y = Math.sin(angle * 2) * 8;

      let size = 0.7;
      if (node.priority === 2)
        size = 1.0; // Priority 2 in outer orbit
      else if (node.priority === undefined && node.depth_level === 1)
        size = 1.0;

      nodes.push({
        ...node,
        position: [
          Math.cos(angle) * outerRadius,
          y,
          Math.sin(angle) * outerRadius,
        ],
        color: "#ff00ff",
        size: size,
        side: "right",
        variant: "vibrant",
        icon: getNodeIcon(node),
      });
    });

    return nodes;
  }, [graphData]);

  // 2. VISIBILITY FILTERING (Depends on layout + expanded state)
  const { nodes3D, edges3D } = useMemo(() => {
    // Determine which IDs are visible
    // Start with the INITIAL set (so they don't disappear)
    const visibleNodeIds = new Set<string>(initialNodeIds);

    // Add neighbors of expanded nodes
    expandedNodeIds.forEach((expandedId) => {
      // Find all edges connected to this expanded node
      graphData.relationships.forEach((rel) => {
        let neighborId = null;
        if (rel.source === expandedId) neighborId = rel.target;
        if (rel.target === expandedId) neighborId = rel.source;

        if (neighborId) {
          // Allow revealing ANY neighbor on click (Deep Dive)
          visibleNodeIds.add(neighborId);
        }
      });
    });

    // Filter the PRE-CALCULATED layoutNodes
    const visibleNodes = layoutNodes.filter((n) => visibleNodeIds.has(n.id));

    const visibleEdges = graphData.relationships.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target),
    );

    return { nodes3D: visibleNodes, edges3D: visibleEdges };
  }, [graphData, layoutNodes, expandedNodeIds, initialNodeIds]);

  return (
    <div className="w-full h-full relative bg-transparent">
      <Canvas
        camera={{ position: [0, 30, 45], fov: 45 }}
        onPointerMissed={(_e) => {
          // Deselect on background click
          if (onBackgroundClick) onBackgroundClick();
        }}>
        <fog attach="fog" args={["#050510", 40, 150]} />
        <ambientLight intensity={0.8} />
        <pointLight position={[0, 20, 0]} intensity={2.5} color="#ffffff" />
        <pointLight position={[20, 0, 20]} intensity={1} color="#a855f7" />
        <pointLight position={[-20, 0, -20]} intensity={1} color="#3b82f6" />

        <Scene
          nodes={nodes3D}
          edges={edges3D}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onNodeClick={handleNodeClick}
          onEdgeClick={onEdgeSelect}
          isPaused={isPaused}
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

      {/* Animation Control */}
      <div className="absolute bottom-6 right-6 z-10">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-full text-white/80 transition-all active:scale-95"
          title={isPaused ? "Resume Rotation" : "Pause Rotation"}>
          {isPaused ? (
            <Play className="w-5 h-5 fill-current" />
          ) : (
            <Pause className="w-5 h-5 fill-current" />
          )}
        </button>
      </div>
    </div>
  );
}
