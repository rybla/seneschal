import type { AppType } from "@/server";
import { hc } from "hono/client";
import type {
  Document,
  Entity,
  QueryResponse,
  MergeResult,
  Relation,
  SaturateResult,
} from "./types";

const client = hc<AppType>("/");

export async function fetchDocuments(): Promise<Document[]> {
  const res = await client.api.documents.$get();
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function fetchEntities(): Promise<Entity[]> {
  const res = await client.api.entities.$get();
  if (!res.ok) throw new Error("Failed to fetch entities");
  return res.json();
}

export async function fetchRelations(): Promise<Relation[]> {
  const res = await client.api.relations.$get();
  if (!res.ok) throw new Error("Failed to fetch relations");
  return res.json();
}

import type { PrivacyLevel } from "@/common";

export async function uploadDocument(
  file: File,
  privacyLevel: PrivacyLevel,
): Promise<{ success: boolean; documentId: number }> {
  const res = await client.api["ingest-and-merge-and-saturate"].$post({
    form: {
      file,
      privacyLevel,
      maxIterations: "3",
    },
  });
  if (!res.ok) throw new Error("Failed to upload document");
  return res.json();
}

export async function mergeNodes(): Promise<MergeResult> {
  const res = await client.api["merge-nodes"].$post({});
  if (!res.ok) throw new Error("Failed to merge nodes");
  return res.json();
}

export async function saturateDatabase(
  maxIterations: number,
): Promise<SaturateResult> {
  const res = await client.api["saturate"].$post({
    json: { maxIterations },
  });
  if (!res.ok) throw new Error("Failed to saturate database");
  return res.json();
}

export async function queryGraph(
  query: string,
  privacy_level: PrivacyLevel,
): Promise<QueryResponse> {
  const res = await client.api.query.$post({ json: { query, privacy_level } });
  if (!res.ok) throw new Error("Failed to query graph");
  return res.json();
}
