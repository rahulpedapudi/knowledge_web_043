// ============ Concept Types ============

export interface ConceptNode {
  id: string;
  label: string;
  description?: string;
  unit?: string;
  min_value?: number;
  max_value?: number;
  default_value?: number;
}

// ============ Relationship Types ============

export interface RelationshipEdge {
  id: string;
  source: string;
  target: string;
  relationship_type: "direct" | "inverse";
  description: string;
  equation?: string;
  has_simulation: boolean;
}

// ============ Graph Data ============

export interface GraphData {
  concepts: ConceptNode[];
  relationships: RelationshipEdge[];
}

// ============ Document Types ============

export interface Document {
  id: string;
  title: string;
  source_type: "pdf" | "text";
  processed: boolean;
}

export interface DocumentUploadResponse {
  document_id: string;
  title: string;
  total_sentences: number;
  causal_sentences: number;
  concepts_extracted: number;
  relationships_found: number;
}

// ============ Simulation Types ============

export interface SimulationConfig {
  relationship_id: string;
  source_concept: ConceptNode;
  target_concept: ConceptNode;
  relationship_type: "direct" | "inverse";
  equation?: string;
  coefficient: number;
}

export interface SimulationResult {
  input_value: number;
  output_value: number;
  relationship_type: "direct" | "inverse";
  description: string;
}

// ============ D3 Graph Types ============

export interface D3Node extends ConceptNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface D3Link {
  id: string;
  source: D3Node | string;
  target: D3Node | string;
  relationship_type: "direct" | "inverse";
  description: string;
  equation?: string;
  has_simulation: boolean;
}
