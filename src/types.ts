import type { EntityType, PrivacyLevel, RelationType } from "@/common";
import type { JSONValue } from "hono/utils/types";

export interface Document {
  id: number;
  path: string;
  title: string | null;
  content: string | null;
  privacyLevel: PrivacyLevel;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Entity {
  id: number;
  name: string;
  type: EntityType;
  description: string | null;
  sourceDocumentId: number | null;
  privacyLevel: PrivacyLevel;
}

export interface Relation {
  id: number;
  sourceEntityId: number;
  targetEntityId: number;
  type: RelationType;
  description: string | null;
  sourceDocumentId: number | null;
  privacyLevel: PrivacyLevel;
  properties: JSONValue;
}

export interface GraphNode {
  id: number;
  name: string;
  type: EntityType;
  description?: string | null;
  privacyLevel: PrivacyLevel;
}

export interface GraphEdge {
  id: number;
  source: number;
  target: number;
  type: RelationType;
  description?: string | null;
  privacyLevel: PrivacyLevel;
  properties?: unknown;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface QueryResponse {
  graphData: GraphData;
  answer: string;
}

export type MergeResult =
  | {
      success: boolean;
      mergedCount: number;
      mergedPairs: Array<{ winner: string; loser: string }>;
    }
  | { message: string };

export interface SaturateResult {
  success: boolean;
  saturatedCount: number;
}
