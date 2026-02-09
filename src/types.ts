export type PrivacyLevel = "PUBLIC" | "PRIVATE";

/**
 * Represents a node in the knowledge graph.
 */
export interface Node {
  id: number;
  name: string;
  type: string;
  description?: string | null;
  metadata?: unknown;
}

/**
 * Represents an edge in the knowledge graph.
 */
export interface Edge {
  id: number;
  source: number;
  target: number;
  type: string;
  description?: string | null;
  properties?: unknown;
}

/**
 * Represents a subgraph or the entire graph data structure to be sent to the UI.
 */
export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}
