export interface Document {
    id: number;
    path: string;
    title: string;
    content: string;
    securityLevel: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface Entity {
    id: number;
    name: string;
    type: string;
    description: string | null;
    sourceDocumentId: number | null;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface Relation {
    id: number;
    sourceEntityId: number;
    targetEntityId: number;
    type: string;
    description: string | null;
    sourceDocumentId: number | null;
    properties: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
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

export interface MergeResult {
    success: boolean;
    mergedCount: number;
    mergedPairs: Array<{ winner: string; loser: string }>;
}
