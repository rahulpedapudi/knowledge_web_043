// ============ Concept Types ============

export interface ConceptNode {
  id: string;
  label: string;
  description?: string;
  unit?: string;
  min_value?: number;
  max_value?: number;
  default_value?: number;
  // 3D Graph properties
  abstraction_level?: number; // 0-10: 0=concrete, 10=abstract (Z-axis)
  depth_level?: number; // 0-3: 0=core (always visible), 3=detail (close zoom only)
  priority?: number; // 1=Main, 2=Secondary, 3=Detail
  category?: string; // semantic grouping for clustering
  semantic_type?: "variable" | "law" | "process" | "entity";
  parent_concepts?: string[]; // IDs of parent concepts for hierarchy
}

// ============ Relationship Types ============

export interface SimulationFeedback {
  min_value: number;
  max_value: number;
  feedback_text: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'warning';
}

export interface RelationshipEdge {
  id: string;
  source: string;
  target: string;
  relationship_type: "direct" | "inverse" | string;
  description: string;
  equation?: string;
  has_simulation?: boolean;

  // Pedagogical Fields
  scenario_context?: string;
  variable_explainer?: string;
  feedback_rules?: SimulationFeedback[];
  visual_theme?: string;
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
  chat_id?: string;
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
  scenario_context?: string;
  variable_explainer?: string;
  feedback_rules?: SimulationFeedback[];
  visual_theme?: string;
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

// ============ User/Auth Types ============

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  google_id?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
}
