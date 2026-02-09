import type {
  Document,
  Entity,
  Relation,
  GraphData,
  MergeResult,
  SaturateResult,
} from "./types";

const API_BASE = "/api";

export async function fetchDocuments(): Promise<Document[]> {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function fetchEntities(): Promise<Entity[]> {
  const res = await fetch(`${API_BASE}/entities`);
  if (!res.ok) throw new Error("Failed to fetch entities");
  return res.json();
}

export async function fetchRelations(): Promise<Relation[]> {
  const res = await fetch(`${API_BASE}/relations`);
  if (!res.ok) throw new Error("Failed to fetch relations");
  return res.json();
}

export async function uploadDocument(
  file: File,
): Promise<{ success: boolean; documentId: number; entityId: number }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/ingest`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload document");
  return res.json();
}

export async function mergeNodes(): Promise<MergeResult> {
  const res = await fetch(`${API_BASE}/merge-nodes`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to merge nodes");
  return res.json();
}

export async function saturateDatabase(): Promise<SaturateResult> {
  const res = await fetch(`${API_BASE}/saturate-database`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to saturate database");
  return res.json();
}

export async function queryGraph(query: string): Promise<GraphData> {
  const res = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("Failed to query graph");
  return res.json();
}
