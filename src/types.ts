import type { EntityType, PrivacyLevel, RelationType } from "@/common";

/**
 * Represents a node in the knowledge graph.
 */
export interface Node {
  id: number;
  name: string;
  type: EntityType;
  description?: string | null;
  metadata?: unknown;
  privacyLevel?: PrivacyLevel;
}

/**
 * Represents an edge in the knowledge graph.
 */
export interface Edge {
  id: number;
  source: number;
  target: number;
  type: RelationType;
  description?: string | null;
  properties?: unknown;
  privacyLevel?: PrivacyLevel;
}

/**
 * Represents a subgraph or the entire graph data structure to be sent to the UI.
 */
export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}
