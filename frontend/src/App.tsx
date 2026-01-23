import { useState, useCallback } from "react";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ConceptGraph } from "@/components/ConceptGraph";
import { SimulationPanel } from "@/components/SimulationPanel";
import { getDocumentGraph } from "@/api/client";
import type {
  DocumentUploadResponse,
  GraphData,
  RelationshipEdge,
  D3Node,
  ConceptNode,
} from "@/types";
import { ArrowLeft, BookOpen, Network } from "lucide-react";

type AppView = "upload" | "graph";

function App() {
  const [view, setView] = useState<AppView>("upload");
  const [, setDocumentId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string>("");
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<RelationshipEdge | null>(
    null,
  );
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [stats, setStats] = useState<{
    concepts: number;
    relationships: number;
  } | null>(null);

  const handleDocumentProcessed = async (response: DocumentUploadResponse) => {
    setDocumentId(response.document_id);
    setDocumentTitle(response.title);
    setStats({
      concepts: response.concepts_extracted,
      relationships: response.relationships_found,
    });

    // Load graph data
    setIsLoadingGraph(true);
    try {
      const data = await getDocumentGraph(response.document_id);
      setGraphData(data);
      setView("graph");
    } catch (err) {
      console.error("Failed to load graph:", err);
    } finally {
      setIsLoadingGraph(false);
    }
  };

  const handleNodeClick = useCallback((node: D3Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const handleEdgeClick = useCallback((edge: RelationshipEdge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const handleBackToUpload = () => {
    setView("upload");
    setGraphData(null);
    setDocumentId(null);
    setSelectedNode(null);
    setSelectedEdge(null);
    setStats(null);
  };

  if (view === "upload") {
    return <DocumentUpload onDocumentProcessed={handleDocumentProcessed} />;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-800/50 border-b border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToUpload}
            className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>

          <div className="h-6 w-px bg-slate-700" />

          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <div>
              <h1 className="font-medium text-white">{documentTitle}</h1>
              {stats && (
                <p className="text-xs text-slate-500">
                  {stats.concepts} concepts · {stats.relationships}{" "}
                  relationships
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 rounded-lg">
            <Network className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-slate-300">Causal Graph</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        {isLoadingGraph ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400">Building concept graph...</p>
            </div>
          </div>
        ) : graphData && graphData.concepts.length > 0 ? (
          <>
            <ConceptGraph
              graphData={graphData}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              selectedNodeId={selectedNode?.id}
              selectedEdgeId={selectedEdge?.id}
            />
            <SimulationPanel
              selectedEdge={selectedEdge}
              selectedNode={selectedNode}
              onClose={handleClosePanel}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-slate-400 mb-4">
                No causal relationships found in the text.
              </p>
              <button
                onClick={handleBackToUpload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Instructions overlay (only when no panel is open) */}
        {graphData && !selectedNode && !selectedEdge && (
          <div className="absolute bottom-4 right-4 bg-slate-800/80 backdrop-blur-sm rounded-lg p-4 text-sm max-w-xs">
            <p className="text-slate-300 mb-2">
              <strong>How to use:</strong>
            </p>
            <ul className="text-slate-400 space-y-1 text-xs">
              <li>
                • Click a <span className="text-blue-400">node</span> to see
                concept details
              </li>
              <li>
                • Click an <span className="text-purple-400">edge</span> to open
                the simulation
              </li>
              <li>• Drag nodes to rearrange the graph</li>
              <li>• Scroll to zoom, drag background to pan</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
