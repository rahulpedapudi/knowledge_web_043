import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import type { D3Node, D3Link, GraphData } from "@/types";

interface EnhancedConceptGraphProps {
  graphData: GraphData;
  onNodeSelect: (node: D3Node) => void;
  onNodeExpand: (node: D3Node) => void;
  onEdgeSelect: (edge: D3Link) => void;
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
}

// Color palette based on reference image
const NODE_COLORS = {
  primary: "#e91e8c", // Pink
  secondary: "#3b82f6", // Blue
  tertiary: "#ffffff", // White
  background: "#1e293b",
};

export function EnhancedConceptGraph({
  graphData,
  onNodeSelect,
  onNodeExpand,
  onEdgeSelect,
  selectedNodeId,
  selectedEdgeId,
}: EnhancedConceptGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const clickTimerRef = useRef<number | null>(null);
  const lastClickedNodeRef = useRef<string | null>(null);

  // Persist simulation to keep node positions smooth
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);

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

  // Handle click with single/double detection
  const handleNodeClick = useCallback(
    (node: D3Node) => {
      if (clickTimerRef.current && lastClickedNodeRef.current === node.id) {
        // Double click detected
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
        lastClickedNodeRef.current = null;
        onNodeExpand(node);
      } else {
        // Potential single click - wait to confirm
        lastClickedNodeRef.current = node.id;
        clickTimerRef.current = setTimeout(() => {
          clickTimerRef.current = null; // Don't null this too early if we want double click?
          // Actually logic is fine: if 2nd click comes within 250ms, we cancel this timer
          lastClickedNodeRef.current = null;
          onNodeSelect(node);
        }, 250);
      }
    },
    [onNodeSelect, onNodeExpand],
  );

  // Handle background click to deselect
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.on("click", () => {
      // Optional: We could support deselecting here, but might conflict with zoom/drag
      // leaving it for now
    });
  }, []);

  // Initialize graph once
  useEffect(() => {
    if (!svgRef.current) return;

    // Only set up static elements if they don't exist
    const svg = d3.select(svgRef.current);
    if (svg.select("g.main-group").empty()) {
      const g = svg.append("g").attr("class", "main-group");

      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 4])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });
      svg.call(zoom);

      // Defs
      const defs = svg.append("defs");
      const filter = defs
        .append("filter")
        .attr("id", "glow")
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");
      filter
        .append("feGaussianBlur")
        .attr("stdDeviation", "3")
        .attr("result", "coloredBlur");
      const feMerge = filter.append("feMerge");
      feMerge.append("feMergeNode").attr("in", "coloredBlur");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");

      ["pink", "blue", "white"].forEach((color, i) => {
        const colors = [
          NODE_COLORS.primary,
          NODE_COLORS.secondary,
          NODE_COLORS.tertiary,
        ];
        defs
          .append("marker")
          .attr("id", `arrow-${color}`)
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", 35)
          .attr("refY", 0)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M0,-5L10,0L0,5")
          .attr("fill", colors[i]);
      });

      g.append("g").attr("class", "links");
      g.append("g").attr("class", "nodes");
    }
  }, []); // Run once

  // Update Data and Simulation
  useEffect(() => {
    if (!svgRef.current || !graphData) return;
    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    const g = svg.select("g.main-group");
    const linkGroup = g.select("g.links");
    const nodeGroup = g.select("g.nodes");

    // Prepare data
    // We need to maintain object references for D3 to keep positions
    let nodes: D3Node[] = graphData.concepts.map((c, i) => {
      // Try to find existing node to keep position
      const existing = simulationRef.current
        ?.nodes()
        .find((n) => n.id === c.id);
      return existing
        ? Object.assign(existing, c)
        : { ...c, colorIndex: i % 3 };
    });

    let links: D3Link[] = graphData.relationships.map((r) => ({
      ...r,
      source: r.source,
      target: r.target,
    }));

    // Init simulation if not exists
    if (!simulationRef.current) {
      simulationRef.current = d3
        .forceSimulation<D3Node, D3Link>()
        .force(
          "link",
          d3
            .forceLink<D3Node, D3Link>()
            .id((d) => d.id)
            .distance(180),
        )
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(70));
    }

    // Update simulation
    const simulation = simulationRef.current;
    simulation.nodes(nodes);
    (simulation.force("link") as d3.ForceLink<D3Node, D3Link>).links(links);
    simulation.alpha(0.3).restart(); // Gentle restart

    // --------------- JOIN LINKS ---------------
    const link = linkGroup
      .selectAll<SVGLineElement, D3Link>("line")
      .data(links, (d) => d.id);

    link.exit().transition().duration(500).attr("stroke-opacity", 0).remove();

    const linkEnter = link
      .enter()
      .append("line")
      .attr("stroke", (d) =>
        d.relationship_type === "direct" ? "#60a5fa" : "#fb923c",
      )
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0)
      .attr("stroke-dasharray", (d) =>
        d.relationship_type === "inverse" ? "5,5" : "none",
      )
      .attr("marker-end", (d) =>
        d.relationship_type === "direct"
          ? "url(#arrow-blue)"
          : "url(#arrow-pink)",
      );

    linkEnter.transition().duration(500).attr("stroke-opacity", 0.6);

    const linkMerge = linkEnter.merge(link);

    // Update link attributes and listeners
    linkMerge
      .attr("stroke", (d) =>
        d.relationship_type === "direct" ? "#60a5fa" : "#fb923c",
      )
      .attr("stroke-dasharray", (d) =>
        d.relationship_type === "inverse" ? "5,5" : "none",
      )
      .attr("marker-end", (d) =>
        d.relationship_type === "direct"
          ? "url(#arrow-blue)"
          : "url(#arrow-pink)",
      )
      .attr("cursor", "pointer")
      .attr("stroke-width", (d) => (d.id === selectedEdgeId ? 4 : 1.5))
      .attr("stroke-opacity", (d) => (d.id === selectedEdgeId ? 1 : 0.6))
      .on("click", (event, d) => {
        event.stopPropagation();
        onEdgeSelect(d);
      })
      .on("mouseenter", function (_event, _d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke-width", 4)
          .attr("stroke-opacity", 1);
      })
      .on("mouseleave", function (_event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke-width", d.id === selectedEdgeId ? 4 : 1.5)
          .attr("stroke-opacity", d.id === selectedEdgeId ? 1 : 0.6);
      });

    // --------------- JOIN NODES ---------------
    const getNodeColor = (d: any) => {
      const colorIndex = d.colorIndex || 0;
      const colors = [
        NODE_COLORS.primary,
        NODE_COLORS.secondary,
        NODE_COLORS.tertiary,
      ];
      return colors[colorIndex % colors.length];
    };

    const node = nodeGroup
      .selectAll<SVGGElement, D3Node>("g")
      .data(nodes, (d) => d.id);

    node
      .exit()
      .transition()
      .duration(500)
      .attr("opacity", 0)
      .attr("transform", (d: any) => `translate(${d.x},${d.y}) scale(0)`)
      .remove();

    const nodeEnter = node
      .enter()
      .append("g")
      .attr("cursor", "pointer")
      .attr("opacity", 0)
      .call(
        d3
          .drag<SVGGElement, D3Node>()
          .on("start", (event, d: D3Node) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d: D3Node) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d: D3Node) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    // Outer Glow
    nodeEnter
      .append("circle")
      .attr("class", "glow")
      .attr("r", 32)
      .attr("fill", "transparent")
      .attr("stroke", (d) => getNodeColor(d))
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.3)
      .attr("filter", "url(#glow)");

    // Main Circle
    nodeEnter
      .append("circle")
      .attr("class", "main")
      .attr("r", 28)
      .attr("fill", (d) => {
        const color = getNodeColor(d);
        return color === NODE_COLORS.tertiary ? "#1a1a2e" : `${color}20`;
      })
      .attr("stroke", (d) => getNodeColor(d))
      .attr("stroke-width", 2);

    // Label
    nodeEnter
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#ffffff")
      .attr("font-size", "11px")
      .attr("font-weight", "500")
      .attr("pointer-events", "none")
      .text((d) =>
        d.label.length > 12 ? d.label.slice(0, 12) + "..." : d.label,
      );

    nodeEnter.transition().duration(500).attr("opacity", 1);

    const nodeMerge = nodeEnter.merge(node);

    // Update listeners (important for closures)
    nodeMerge.on("click", (event, d) => {
      event.stopPropagation();
      handleNodeClick(d);
    });

    // Update visual states like selection
    nodeMerge
      .select("circle.main")
      .attr("stroke-width", (d) => (d.id === selectedNodeId ? 3 : 2))
      .on("mouseenter", function (_event, _d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", 32)
          .attr("stroke-width", 3);
      })
      .on("mouseleave", function (_event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", 28)
          .attr("stroke-width", d.id === selectedNodeId ? 3 : 2);
      });

    // Simulation tick
    simulation.on("tick", () => {
      linkMerge
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeMerge.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    });
  }, [
    graphData,
    dimensions,
    selectedNodeId,
    selectedEdgeId,
    handleNodeClick,
    onEdgeSelect,
  ]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at center, #1a1a2e 0%, #0d0d1a 50%, #050510 100%)",
      }}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />

      {/* Simplified Legend - removed instructional text */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-xl p-3 text-xs border border-white/10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-500"></div>
            <span className="text-white/70">Primary Concep</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-white/70">Related</span>
          </div>
        </div>
      </div>
    </div>
  );
}
