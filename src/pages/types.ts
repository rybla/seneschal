import type { JSONValue } from "hono/utils/types";

export type PrivacyLevel = "PUBLIC" | "PRIVATE";

export interface Document {
  id: number;
  path: string;
  title: string | null;
  content: string | null;
  securityLevel: string;
  metadata: JSONValue;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Entity {
  id: number;
  name: string;
  type: string;
  description: string | null;
  sourceDocumentId: number | null;
  metadata: JSONValue;
}

export interface Relation {
  id: number;
  sourceEntityId: number;
  targetEntityId: number;
  type: string;
  description: string | null;
  sourceDocumentId: number | null;
  properties: JSONValue;
}

export interface GraphNode {
  id: number;
  name: string;
  type: string;
  description?: string | null;
  metadata?: unknown;
}

export interface GraphEdge {
  id: number;
  source: number;
  target: number;
  type: string;
  description?: string | null;
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
