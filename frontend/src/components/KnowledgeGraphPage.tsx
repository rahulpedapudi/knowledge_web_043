import { useState, useCallback, useEffect } from "react";
import { ConceptGraph3D } from "./ConceptGraph3D";
import { RightPanel } from "./RightPanel";
import { getDocumentGraph } from "@/api/client";
import { Loader2, MousePointer2 } from "lucide-react";
import type {
  GraphData,
  D3Node,
  ConceptNode,
  RelationshipEdge,
  D3Link,
} from "@/types";

interface KnowledgeGraphPageProps {
  initialDocumentId?: string | null;
  initialDocumentTitle?: string;
  onNavigateHome: () => void;
}

export function KnowledgeGraphPage({
  initialDocumentId,
  initialDocumentTitle,
  onNavigateHome,
}: KnowledgeGraphPageProps) {
  const [documentId, setDocumentId] = useState<string | null>(
    initialDocumentId || null,
  );
  const [documentTitle, setDocumentTitle] = useState(
    initialDocumentTitle || "",
  );
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<RelationshipEdge | null>(
    null,
  );

  const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string>>(new Set());

  // Calculate visible portion of the graph
  const getVisibleGraphData = useCallback(() => {
    if (!graphData) return { concepts: [], relationships: [] };

    // If no nodes visible yet (initial load), show top connected nodes
    if (visibleNodeIds.size === 0) {
      // Return empty or wait for effect
    }

    const filteredConcepts = graphData.concepts.filter((c) =>
      visibleNodeIds.has(c.id),
    );
    const filteredRelationships = graphData.relationships.filter(
      (r) => visibleNodeIds.has(r.source) && visibleNodeIds.has(r.target),
    );

    return { concepts: filteredConcepts, relationships: filteredRelationships };
  }, [graphData, visibleNodeIds]);

  // Load graph when document changes
  const loadGraph = useCallback(async (docId: string, title: string) => {
    setIsLoadingGraph(true);
    setSelectedNode(null);
    setSelectedEdge(null);
    setVisibleNodeIds(new Set());
    try {
      const data = await getDocumentGraph(docId);
      setGraphData(data);
      setDocumentId(docId);
      setDocumentTitle(title);

      // Initialize visible nodes with top connected ones
      const connections = new Map<string, number>();
      data.relationships.forEach((r) => {
        connections.set(r.source, (connections.get(r.source) || 0) + 1);
        connections.set(r.target, (connections.get(r.target) || 0) + 1);
      });

      const topNodes = [...connections.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id]) => id);

      setVisibleNodeIds(new Set(topNodes));
    } catch (err) {
      console.error("Failed to load graph:", err);
    } finally {
      setIsLoadingGraph(false);
    }
  }, []);

  // Use useEffect to handle prop changes, replacing the previous useState initialization
  useEffect(() => {
    if (
      initialDocumentId &&
      initialDocumentTitle &&
      initialDocumentId !== documentId
    ) {
      loadGraph(initialDocumentId, initialDocumentTitle);
    } else if (initialDocumentId && !graphData && !isLoadingGraph) {
      // Initial load if not loaded
      loadGraph(initialDocumentId, initialDocumentTitle || "");
    }
  }, [
    initialDocumentId,
    initialDocumentTitle,
    loadGraph,
    documentId,
    graphData,
    isLoadingGraph,
  ]);

  // Single click - select node for chat
  const handleNodeSelect = useCallback((node: D3Node) => {
    setSelectedNode({
      id: node.id,
      label: node.label,
      description: node.description,
      unit: node.unit,
      min_value: node.min_value,
      max_value: node.max_value,
      default_value: node.default_value,
    });
    setSelectedEdge(null);
  }, []);

  // Double click - expand connected nodes
  const handleNodeExpand = useCallback(
    (node: D3Node) => {
      if (!graphData) return;

      // Find all neighbors
      const neighbors = new Set<string>();
      graphData.relationships.forEach((r) => {
        if (r.source === node.id) neighbors.add(r.target);
        if (r.target === node.id) neighbors.add(r.source);
      });

      setVisibleNodeIds((prev) => {
        const next = new Set(prev);
        neighbors.forEach((id) => next.add(id));
        return next;
      });

      // Also select the node
      handleNodeSelect(node);
    },
    [handleNodeSelect, graphData],
  );

  // Click on edge - select for simulation
  const handleEdgeSelect = useCallback((edge: D3Link) => {
    setSelectedEdge({
      id: edge.id,
      source: typeof edge.source === "string" ? edge.source : edge.source.id,
      target: typeof edge.target === "string" ? edge.target : edge.target.id,
      relationship_type: edge.relationship_type,
      description: edge.description,
      equation: edge.equation,
      has_simulation: edge.has_simulation,
    });
    setSelectedNode(null);
  }, []);

  const visibleGraphData = getVisibleGraphData();

  return (
    <div className="flex h-full w-full bg-[#050510] text-white overflow-hidden">
      {/* Center Area - Knowledge Graph */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Header - now part of the center area or global? Using absolute overlay */}
        {documentTitle && (
          <div className="absolute top-0 left-0 right-0 z-10 px-6 py-4 pointer-events-none">
            <div className="inline-flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 pointer-events-auto">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm font-medium text-white/90">
                {documentTitle}
              </span>
            </div>
          </div>
        )}

        {/* Graph Area */}
        {isLoadingGraph ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
              <p className="text-white/50">Building knowledge graph...</p>
            </div>
          </div>
        ) : graphData && visibleGraphData.concepts.length > 0 ? (
          <ConceptGraph3D
            graphData={graphData}
            onNodeSelect={handleNodeSelect}
            onNodeExpand={handleNodeExpand}
            onEdgeSelect={handleEdgeSelect}
            selectedNodeId={selectedNode?.id}
            selectedEdgeId={selectedEdge?.id}
          />
        ) : documentId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white/50">
              <p className="mb-4">No concepts found in this document.</p>
              <button
                onClick={onNavigateHome}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg transition-colors">
                Upload New Document
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white/40">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                <MousePointer2 className="w-10 h-10" />
              </div>
              <p className="text-lg mb-2">Select a resource</p>
              <p className="text-sm">
                Choose a document from the sidebar to view its knowledge graph
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Chat & Simulation */}
      <RightPanel
        documentId={documentId}
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        onClose={() => {
          setSelectedNode(null);
          setSelectedEdge(null);
        }}
      />
    </div>
  );
}
