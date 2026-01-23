import { useRef, useState, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";
import * as d3 from "d3";
import type { GraphData, ConceptNode, D3Link } from "@/types";

// ============ Types ============

interface Node3D extends ConceptNode {
  position: [number, number, number];
  color: string;
  size: number;
}

interface ConceptGraph3DProps {
  graphData: GraphData;
  onNodeSelect: (node: ConceptNode) => void;
  onNodeExpand: (node: ConceptNode) => void;
  onEdgeSelect: (edge: D3Link) => void;
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
}

// ============ Color & Size Constants ============

const DEPTH_COLORS = [
  "#ffd700", // Depth 0: Gold - Core concepts (Brighter)
  "#3b82f6", // Depth 1: Blue - Primary (Brighter)
  "#a855f7", // Depth 2: Purple - Secondary (Brighter)
  "#22c55e", // Depth 3: Green - Detail (Brighter)
];

const DEPTH_SIZES = [0.8, 0.6, 0.4, 0.3]; // Significantly larger sizes

// Zoom thresholds for each depth level
const LOD_THRESHOLDS = {
  0: Infinity, // Always visible
  1: 25, // Visible when camera distance < 25 (Increased)
  2: 18, // Visible when camera distance < 18 (Increased)
  3: 10, // Visible when camera distance < 10 (Increased)
};

// ============ Node Component ============

interface NodeMeshProps {
  node: Node3D;
  isSelected: boolean;
  isVisible: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}

function NodeMesh({
  node,
  isSelected,
  isVisible,
  onClick,
  onDoubleClick,
}: NodeMeshProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [opacity, setOpacity] = useState(0);

  // Animate opacity based on visibility
  useFrame(() => {
    const targetOpacity = isVisible ? 1 : 0;
    setOpacity((prev) => prev + (targetOpacity - prev) * 0.1);
  });

  if (opacity < 0.01) return null;

  const scale = isSelected ? 1.3 : hovered ? 1.15 : 1;

  return (
    <group ref={meshRef} position={node.position}>
      <mesh
        scale={scale}
        onClick={(e) => {
          e.stopPropagation();
          if (isVisible) onClick();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (isVisible) onDoubleClick();
        }}
        onPointerOver={() => isVisible && setHovered(true)}
        onPointerOut={() => setHovered(false)}>
        <sphereGeometry args={[node.size, 32, 32]} />
        <meshBasicMaterial color={node.color} transparent opacity={opacity} />
      </mesh>

      {/* Glow effect */}
      {(isSelected || hovered) && opacity > 0.5 && (
        <mesh scale={1.6}>
          <sphereGeometry args={[node.size, 16, 16]} />
          <meshBasicMaterial
            color={node.color}
            transparent
            opacity={0.15 * opacity}
          />
        </mesh>
      )}

      {/* Label - only show when sufficiently visible */}
      {opacity > 0.3 && (
        <Text
          position={[0, node.size + 0.15, 0]}
          fontSize={0.12 + node.size * 0.1}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.015}
          outlineColor="black"
          fillOpacity={opacity}>
          {node.label.length > 18
            ? node.label.slice(0, 18) + "..."
            : node.label}
        </Text>
      )}
    </group>
  );
}

// ============ Edge Component ============

interface EdgeLineProps {
  start: [number, number, number];
  end: [number, number, number];
  relationshipType: "direct" | "inverse";
  isSelected: boolean;
  isVisible: boolean;
  onClick: () => void;
}

function EdgeLine({
  start,
  end,
  relationshipType,
  isSelected,
  isVisible,
  onClick,
}: EdgeLineProps) {
  const color = relationshipType === "direct" ? "#60a5fa" : "#fb923c";
  const lineWidth = isSelected ? 3 : 1.5;

  if (!isVisible) return null;

  return (
    <Line
      points={[start, end]}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={isSelected ? 1 : 0.5}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    />
  );
}

// ============ Scene Component with LOD ============

interface SceneProps {
  nodes: Node3D[];
  edges: Array<{
    id: string;
    source: string;
    target: string;
    relationship_type: "direct" | "inverse";
    description: string;
    equation?: string;
    has_simulation: boolean;
  }>;
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
  onNodeClick: (node: Node3D) => void;
  onNodeDoubleClick: (node: Node3D) => void;
  onEdgeClick: (edge: D3Link) => void;
  onZoomChange: (distance: number) => void;
  controlMode: "rotate" | "pan";
  zoomDelta: number; // +1 for zoom in, -1 for zoom out, 0 for no change
  onZoomDeltaConsumed: () => void;
}

function Scene({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
  onZoomChange,
  controlMode,
  zoomDelta,
  onZoomDeltaConsumed,
}: SceneProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const [cameraDistance, setCameraDistance] = useState(15);

  // Handle zoom delta from buttons
  useFrame(() => {
    if (zoomDelta !== 0 && controlsRef.current) {
      const zoomFactor = zoomDelta > 0 ? 0.9 : 1.1; // zoom in = closer = smaller factor
      const currentPos = camera.position.clone();
      const newPos = currentPos.multiplyScalar(zoomFactor);

      // Clamp distance
      const newDist = newPos.length();
      if (newDist >= 2 && newDist <= 35) {
        camera.position.copy(newPos);
        camera.updateProjectionMatrix();
        if (controlsRef.current) {
          controlsRef.current.update();
        }
      }
      onZoomDeltaConsumed();
    }

    // Track camera distance for LOD
    const distance = camera.position.length();
    if (Math.abs(distance - cameraDistance) > 0.3) {
      setCameraDistance(distance);
      onZoomChange(distance);
    }
  });

  const nodeMap = useMemo(() => {
    const map = new Map<string, Node3D>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Determine visibility based on depth and camera distance
  const isNodeVisible = useCallback(
    (node: Node3D) => {
      const depthLevel = node.depth_level ?? 0;
      const threshold =
        LOD_THRESHOLDS[depthLevel as keyof typeof LOD_THRESHOLDS] ?? 10;
      return cameraDistance < threshold;
    },
    [cameraDistance],
  );

  const isEdgeVisible = useCallback(
    (sourceId: string, targetId: string) => {
      const sourceNode = nodeMap.get(sourceId);
      const targetNode = nodeMap.get(targetId);
      if (!sourceNode || !targetNode) return false;
      return isNodeVisible(sourceNode) && isNodeVisible(targetNode);
    },
    [nodeMap, isNodeVisible],
  );

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[15, 15, 15]} intensity={1.2} />
      <pointLight position={[-15, -10, -15]} intensity={0.6} color="#a78bfa" />

      {/* Subtle fog for depth perception */}
      <fog attach="fog" args={["#0d0d1a", 15, 40]} />

      {/* Ground reference plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.3} />
      </mesh>

      {/* Edges */}
      {edges.map((edge) => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        if (!sourceNode || !targetNode) return null;

        return (
          <EdgeLine
            key={edge.id}
            start={sourceNode.position}
            end={targetNode.position}
            relationshipType={edge.relationship_type}
            isSelected={edge.id === selectedEdgeId}
            isVisible={isEdgeVisible(edge.source, edge.target)}
            onClick={() =>
              onEdgeClick({
                ...edge,
                source: sourceNode,
                target: targetNode,
              })
            }
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => (
        <NodeMesh
          key={node.id}
          node={node}
          isSelected={node.id === selectedNodeId}
          isVisible={isNodeVisible(node)}
          onClick={() => onNodeClick(node)}
          onDoubleClick={() => onNodeDoubleClick(node)}
        />
      ))}

      {/* Camera controls */}
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={35}
        zoomSpeed={0.8}
        mouseButtons={{
          LEFT: controlMode === "rotate" ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT:
            controlMode === "rotate" ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
        }}
        onEnd={() => {
          // Sync zoom after manual controls
          const distance = camera.position.length();
          onZoomChange(distance);
        }}
      />
    </>
  );
}

// ============ Main Component ============

export function ConceptGraph3D({
  graphData,
  onNodeSelect,
  onNodeExpand,
  onEdgeSelect,
  selectedNodeId,
  selectedEdgeId,
}: ConceptGraph3DProps) {
  const [currentZoom, setCurrentZoom] = useState(15);
  const [controlMode, setControlMode] = useState<"rotate" | "pan">("rotate");
  const [zoomDelta, setZoomDelta] = useState(0);

  // Convert graph data to 3D positions with LOD using d3-force
  const { nodes3D, edges3D } = useMemo(() => {
    // 1. Prepare data for simulation
    const simulationNodes = graphData.concepts.map((c) => ({
      ...c,
      x: 0,
      y: 0,
    }));

    const simulationLinks = graphData.relationships.map((r) => ({
      source: r.source,
      target: r.target,
    }));

    // 2. Run simulation synchronously
    // We run it "instantly" instead of animating it for stability in 3D
    const simulation = d3
      .forceSimulation(simulationNodes as any)
      .force(
        "link",
        d3
          .forceLink(simulationLinks)
          .id((d: any) => d.id)
          .distance(2), // Tighter connections for 3D
      )
      .force("charge", d3.forceManyBody().strength(-15)) // Less repulsion for tighter clusters
      .force("center", d3.forceCenter(0, 0))
      .force("collision", d3.forceCollide().radius(1.5))
      .stop();

    // Run ticks manually to settle the graph
    for (let i = 0; i < 300; ++i) simulation.tick();

    // 3. Map 2D simulation (x, y) to 3D (x, z) + Abstraction Level (y)
    const nodes: Node3D[] = simulationNodes.map((node: any) => {
      const depthLevel = node.depth_level ?? 0;

      // Y based on abstraction (higher = more abstract)
      const abstraction = node.abstraction_level ?? 5;
      const yPosition = (abstraction / 10) * 8 - 4; // Range from -4 to 4

      return {
        ...node,
        // Map simulation X/Y to 3D X/Z
        position: [node.x, yPosition, node.y], // node.y from d3 maps to Z depth
        color: DEPTH_COLORS[depthLevel] || DEPTH_COLORS[3],
        size: DEPTH_SIZES[depthLevel] || DEPTH_SIZES[3],
      };
    });

    // 4. Create edges
    const edges = graphData.relationships.map((rel, i) => ({
      id: `edge-${rel.source}-${rel.target}-${i}`,
      source: rel.source,
      target: rel.target,
      relationship_type: rel.relationship_type,
      description: rel.description,
      equation: rel.equation,
      has_simulation: rel.has_simulation,
    }));

    return { nodes3D: nodes, edges3D: edges };
  }, [graphData]);

  const handleNodeClick = useCallback(
    (node: Node3D) => {
      onNodeSelect(node);
    },
    [onNodeSelect],
  );

  const handleNodeDoubleClick = useCallback(
    (node: Node3D) => {
      onNodeExpand(node);
    },
    [onNodeExpand],
  );

  const handleEdgeClick = useCallback(
    (edge: D3Link) => {
      onEdgeSelect(edge);
    },
    [onEdgeSelect],
  );

  // Calculate visible depth level for UI
  const getVisibleDepth = (distance: number) => {
    if (distance < LOD_THRESHOLDS[3]) return 3;
    if (distance < LOD_THRESHOLDS[2]) return 2;
    if (distance < LOD_THRESHOLDS[1]) return 1;
    return 0;
  };

  // Zoom handlers - set delta that Scene will consume
  const handleZoomIn = useCallback(() => {
    setZoomDelta(1);
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomDelta(-1);
  }, []);

  const handleZoomDeltaConsumed = useCallback(() => {
    setZoomDelta(0);
  }, []);

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [12, 8, 12], fov: 50 }}
        style={{
          background:
            "radial-gradient(ellipse at center, #1a1a2e 0%, #0d0d1a 50%, #050510 100%)",
        }}>
        <Scene
          nodes={nodes3D}
          edges={edges3D}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onEdgeClick={handleEdgeClick}
          onZoomChange={setCurrentZoom}
          controlMode={controlMode}
          zoomDelta={zoomDelta}
          onZoomDeltaConsumed={handleZoomDeltaConsumed}
        />
      </Canvas>

      {/* Zoom Level Indicator */}
      <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-xl p-3 text-xs border border-white/10">
        <div className="text-white/70 font-medium mb-2">Zoom Level</div>
        <div className="space-y-1">
          {[0, 1, 2, 3].map((depth) => {
            const isActive = getVisibleDepth(currentZoom) >= depth;
            return (
              <div key={depth} className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full transition-all ${isActive ? "" : "opacity-30"}`}
                  style={{ backgroundColor: DEPTH_COLORS[depth] }}
                />
                <span
                  className={`${isActive ? "text-white/80" : "text-white/30"}`}>
                  {depth === 0 && "Core"}
                  {depth === 1 && "Primary"}
                  {depth === 2 && "Secondary"}
                  {depth === 3 && "Detail"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-xl p-3 text-xs border border-white/10">
        <div className="text-white/70 font-medium mb-2">Vertical Axis</div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white/50">↑ Abstract / Foundational</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/50">↓ Concrete / Specific</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        {/* Mode Toggle */}
        <div className="bg-black/70 backdrop-blur-sm rounded-xl p-1 border border-white/10 flex">
          <button
            onClick={() => setControlMode("rotate")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              controlMode === "rotate"
                ? "bg-white/20 text-white"
                : "text-white/50 hover:text-white/80"
            }`}
            title="Rotate mode">
            🔄 Rotate
          </button>
          <button
            onClick={() => setControlMode("pan")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              controlMode === "pan"
                ? "bg-white/20 text-white"
                : "text-white/50 hover:text-white/80"
            }`}
            title="Pan mode">
            ✋ Move
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="bg-black/70 backdrop-blur-sm rounded-xl p-1 border border-white/10 flex flex-col">
          <button
            onClick={handleZoomIn}
            className="px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all text-lg"
            title="Zoom in">
            +
          </button>
          <div className="h-px bg-white/10" />
          <button
            onClick={handleZoomOut}
            className="px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all text-lg"
            title="Zoom out">
            −
          </button>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white/50 border border-white/10">
        {controlMode === "rotate" ? "🔄 Drag to rotate" : "✋ Drag to pan"} •
        Scroll to zoom
      </div>
    </div>
  );
}
