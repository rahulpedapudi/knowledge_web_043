import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { D3Node, D3Link, GraphData, RelationshipEdge } from "@/types";

interface ConceptGraphProps {
  graphData: GraphData;
  onNodeClick: (node: D3Node) => void;
  onEdgeClick: (edge: RelationshipEdge) => void;
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
}

export function ConceptGraph({
  graphData,
  onNodeClick,
  onEdgeClick,
  selectedNodeId,
  selectedEdgeId,
}: ConceptGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Create and update the D3 visualization
  useEffect(() => {
    if (!svgRef.current || graphData.concepts.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;

    // Create nodes and links from graph data
    const nodes: D3Node[] = graphData.concepts.map((c) => ({ ...c }));
    const links: D3Link[] = graphData.relationships.map((r) => ({
      ...r,
      source: r.source,
      target: r.target,
    }));

    // Create container for zoom/pan
    const g = svg.append("g");

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Define arrow markers
    const defs = svg.append("defs");

    // Direct relationship arrow (blue)
    defs
      .append("marker")
      .attr("id", "arrow-direct")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#60a5fa");

    // Inverse relationship arrow (orange)
    defs
      .append("marker")
      .attr("id", "arrow-inverse")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#fb923c");

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(150),
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(60));

    // Create links (edges)
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", (d) =>
        d.relationship_type === "direct" ? "#60a5fa" : "#fb923c",
      )
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.8)
      .attr("marker-end", (d) => `url(#arrow-${d.relationship_type})`)
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        const edge: RelationshipEdge = {
          id: d.id,
          source: typeof d.source === "object" ? d.source.id : d.source,
          target: typeof d.target === "object" ? d.target.id : d.target,
          relationship_type: d.relationship_type,
          description: d.description,
          equation: d.equation,
          has_simulation: d.has_simulation,
        };
        onEdgeClick(edge);
      })
      .on("mouseenter", function () {
        d3.select(this).attr("stroke-width", 4);
      })
      .on("mouseleave", function () {
        d3.select(this).attr("stroke-width", 2);
      });

    // Create link labels
    const linkLabels = g
      .append("g")
      .attr("class", "link-labels")
      .selectAll("text")
      .data(links)
      .enter()
      .append("text")
      .attr("font-size", "10px")
      .attr("fill", "#94a3b8")
      .attr("text-anchor", "middle")
      .attr("pointer-events", "none")
      .text((d) =>
        d.relationship_type === "direct" ? "↑ direct" : "↓ inverse",
      );

    // Create node groups
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      })
      .call(
        d3
          .drag<SVGGElement, D3Node>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    // Node circles
    node
      .append("circle")
      .attr("r", 30)
      .attr("fill", "#1e293b")
      .attr("stroke", (d) => (d.id === selectedNodeId ? "#a78bfa" : "#475569"))
      .attr("stroke-width", (d) => (d.id === selectedNodeId ? 3 : 2))
      .on("mouseenter", function () {
        d3.select(this).attr("fill", "#334155");
      })
      .on("mouseleave", function () {
        d3.select(this).attr("fill", "#1e293b");
      });

    // Node labels
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#e2e8f0")
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .attr("pointer-events", "none")
      .text((d) =>
        d.label.length > 10 ? d.label.slice(0, 10) + "..." : d.label,
      );

    // Node unit labels
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "2.5em")
      .attr("fill", "#64748b")
      .attr("font-size", "10px")
      .attr("pointer-events", "none")
      .text((d) => (d.unit ? `(${d.unit})` : ""));

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkLabels
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2 - 10);

      node.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    });

    // Highlight selected edge
    if (selectedEdgeId) {
      link.attr("stroke-width", (d) => (d.id === selectedEdgeId ? 4 : 2));
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [
    graphData,
    dimensions,
    selectedNodeId,
    selectedEdgeId,
    onNodeClick,
    onEdgeClick,
  ]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-slate-900/50 rounded-xl overflow-hidden">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-800/80 backdrop-blur-sm rounded-lg p-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-blue-400"></div>
            <span className="text-slate-400">Direct (↑↑)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-orange-400"></div>
            <span className="text-slate-400">Inverse (↑↓)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
