/**
 * This module contains all database queries.
 */

import db from "@/db";
import {
  documentsTable,
  entitiesTable,
  type DocumentMetadataByType,
  type InsertDocument,
  type InsertEntity,
  type InsertRelation,
  relationsTable,
  type SelectDocument,
  type SelectEntity,
  type SelectRelation,
} from "@/db/schema";
import { eq, inArray, or, notInArray, and, sql, count } from "drizzle-orm";
import type { GraphData, Node, Edge } from "@/types";

/**
 * Creates a new document in the database.
 * @param data The document data to insert.
 * @returns The created document.
 */
export async function createDocument(
  data: InsertDocument,
): Promise<SelectDocument> {
  const [document] = await db.insert(documentsTable).values(data).returning();
  if (!document) throw new Error("Failed to create document");
  return document;
}

/**
 * Retrieves a document by its path.
 * @param path The absolute path to the document.
 * @returns The document if found, otherwise undefined.
 */
export async function getDocumentByPath(
  path: string,
): Promise<SelectDocument | undefined> {
  const document = await db.query.documentsTable.findFirst({
    where: eq(documentsTable.path, path),
  });
  return document;
}

/**
 * Updates a document's metadata (and optionally other fields). Used after extracting type-specific structured metadata during ingestion.
 */
export async function updateDocument(
  documentId: number,
  updates: { metadata?: DocumentMetadataByType; lastIndexedAt?: Date },
): Promise<SelectDocument> {
  const [doc] = await db
    .update(documentsTable)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(documentsTable.id, documentId))
    .returning();
  if (!doc) throw new Error("Failed to update document");
  return doc;
}

/**
 * Creates a new entity in the database.
 * @param data The entity data to insert.
 * @returns The created entity.
 */
export async function createEntity(data: InsertEntity): Promise<SelectEntity> {
  const [entity] = await db.insert(entitiesTable).values(data).returning();
  if (!entity) throw new Error("Failed to create entity");
  return entity;
}

/**
 * Creates a new relation in the database.
 * @param data The relation data to insert.
 * @returns The created relation.
 */
export async function createRelation(
  data: InsertRelation,
): Promise<SelectRelation> {
  const [relation] = await db.insert(relationsTable).values(data).returning();
  if (!relation) throw new Error("Failed to create relation");
  return relation;
}

/**
 * Retrieves all entities from the database.
 * @returns An array of all entities.
 */
export async function getAllEntities(): Promise<SelectEntity[]> {
  return db.select().from(entitiesTable);
}

/**
 * Retrieves all documents from the database.
 * @returns An array of all documents.
 */
export async function getAllDocuments(): Promise<SelectDocument[]> {
  return db.select().from(documentsTable);
}

/**
 * Retrieves all relations from the database.
 * @returns An array of all relations.
 */
export async function getAllRelations(): Promise<SelectRelation[]> {
  return db.select().from(relationsTable);
}

/**
 * Merges two entities by moving all relations from the loser to the winner and deleting the loser.
 * @param winnerId The ID of the entity to keep.
 * @param loserId The ID of the entity to merge into the winner and delete.
 */
export async function mergeEntities(
  winnerId: number,
  loserId: number,
): Promise<void> {
  // 1. Update relations where the loser is the source
  await db
    .update(relationsTable)
    .set({ sourceEntityId: winnerId })
    .where(eq(relationsTable.sourceEntityId, loserId));

  // 2. Update relations where the loser is the target
  await db
    .update(relationsTable)
    .set({ targetEntityId: winnerId })
    .where(eq(relationsTable.targetEntityId, loserId));

  // 3. Delete the loser entity
  await db.delete(entitiesTable).where(eq(entitiesTable.id, loserId));
}

/**
 * Retrieves the graph context (nodes and edges) starting from a set of entities.
 * @param startEntityIds The IDs of the starting entities.
 * @param depth The depth of traversal (default 1).
 * @returns The graph data comprising relevant nodes and edges.
 */
export async function getGraphContext(
  startEntityIds: number[],
  depth: number = 1,
): Promise<GraphData> {
  const visitedNodeIds = new Set<number>(startEntityIds);
  const nodesMap = new Map<number, Node>();
  const edgesMap = new Map<number, Edge>();

  let currentLevelIds = [...startEntityIds];

  // First, get the initial nodes
  if (startEntityIds.length > 0) {
    const initialNodes = await db
      .select()
      .from(entitiesTable)
      .where(inArray(entitiesTable.id, startEntityIds));
    for (const node of initialNodes) {
      nodesMap.set(node.id, {
        id: node.id,
        name: node.name,
        type: node.type,
        description: node.description,
        metadata: node.metadata,
      });
    }
  }

  for (let d = 0; d < depth; d++) {
    if (currentLevelIds.length === 0) break;

    // Find all edges connected to current level nodes
    const relevantRelations = await db
      .select()
      .from(relationsTable)
      .where(
        or(
          inArray(relationsTable.sourceEntityId, currentLevelIds),
          inArray(relationsTable.targetEntityId, currentLevelIds),
        ),
      );

    const nextLevelIds: number[] = [];

    for (const rel of relevantRelations) {
      edgesMap.set(rel.id, {
        id: rel.id,
        source: rel.sourceEntityId,
        target: rel.targetEntityId,
        type: rel.type,
        description: rel.description,
        properties: rel.properties,
      });

      // Identify neighbors
      // Check both ends. If not visited, add to next level.
      if (!visitedNodeIds.has(rel.sourceEntityId)) {
        visitedNodeIds.add(rel.sourceEntityId);
        nextLevelIds.push(rel.sourceEntityId);
      }
      if (!visitedNodeIds.has(rel.targetEntityId)) {
        visitedNodeIds.add(rel.targetEntityId);
        nextLevelIds.push(rel.targetEntityId);
      }
    }

    if (nextLevelIds.length > 0) {
      // Fetch the node details for the new neighbors
      const newNodes = await db
        .select()
        .from(entitiesTable)
        .where(inArray(entitiesTable.id, nextLevelIds));
      for (const node of newNodes) {
        nodesMap.set(node.id, {
          id: node.id,
          name: node.name,
          type: node.type,
          description: node.description,
          metadata: node.metadata,
        });
      }
      currentLevelIds = nextLevelIds;
    } else {
      break;
    }
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgesMap.values()),
  };
}

/**
 * Finds companies that do not have a headquarters relation.
 * @returns An array of company entities without headquarters.
 */
export async function findCompaniesWithoutHeadquarters(): Promise<
  SelectEntity[]
> {
  // Subquery to find all company IDs that have a headquarters
  const companiesWithHeadquarters = db
    .select({ id: relationsTable.sourceEntityId })
    .from(relationsTable)
    .where(eq(relationsTable.type, "HAS_HEADQUARTERS"));

  // Find all companies whose IDs are not in the subquery result
  return db
    .select()
    .from(entitiesTable)
    .where(
      and(
        eq(entitiesTable.type, "COMPANY"),
        notInArray(entitiesTable.id, companiesWithHeadquarters),
      ),
    );
}

/**
 * Finds entities that match any of the provided names (exact match).
 * @param names List of entity names to search for.
 * @returns Array of matching entities.
 */
export async function findEntitiesByNames(
  names: string[],
): Promise<SelectEntity[]> {
  if (names.length === 0) return [];

  // We can also try case-insensitive or partial matching if needed,
  // but for now let's do exact match on the list.
  // If the names are not exact, this returns empty.
  // The ExtractQueryEntities from Gemini should arguably be "fuzzy" or we should use ILIKE.
  // SQLite: valid for case-insensitive if collation is set or use sql operator.
  // For simplicity: IN array.
  return db
    .select()
    .from(entitiesTable)
    .where(inArray(entitiesTable.name, names));
}

/**
 * Finds common relation patterns in the knowledge graph.
 * A pattern is a combination of an entity type and a relation type.
 * @param threshold The minimum number of times a pattern must appear to be considered common.
 * @returns A map where keys are entity types and values are arrays of common relation types.
 */
export async function findCommonRelationPatterns(
  threshold: number = 2,
): Promise<Map<string, string[]>> {
  const patterns = await db
    .select({
      entityType: entitiesTable.type,
      relationType: relationsTable.type,
      count: count(relationsTable.id),
    })
    .from(relationsTable)
    .leftJoin(
      entitiesTable,
      eq(relationsTable.sourceEntityId, entitiesTable.id),
    )
    .groupBy(entitiesTable.type, relationsTable.type)
    .having(({ count }) => sql`${count} >= ${threshold}`);

  const result = new Map<string, string[]>();
  for (const pattern of patterns) {
    if (pattern.entityType && pattern.relationType) {
      if (!result.has(pattern.entityType)) {
        result.set(pattern.entityType, []);
      }
      result.get(pattern.entityType)?.push(pattern.relationType);
    }
  }

  return result;
}

/**
 * Finds entities that are missing common relations.
 * @param patterns A map of entity types to common relation types.
 * @returns A map where keys are entities and values are arrays of missing relation types.
 */
export async function findEntitiesWithMissingRelations(
  patterns: Map<string, string[]>,
): Promise<Map<SelectEntity, string[]>> {
  const result = new Map<SelectEntity, string[]>();

  for (const [entityType, relationTypes] of patterns.entries()) {
    for (const relationType of relationTypes) {
      // Subquery to find all entity IDs of the given type that have the relation
      const entitiesWithRelation = db
        .select({ id: relationsTable.sourceEntityId })
        .from(relationsTable)
        .where(eq(relationsTable.type, relationType));

      // Find all entities of the given type whose IDs are not in the subquery result
      const entitiesWithoutRelation = await db
        .select()
        .from(entitiesTable)
        .where(
          and(
            eq(entitiesTable.type, entityType),
            notInArray(entitiesTable.id, entitiesWithRelation),
          ),
        );

      for (const entity of entitiesWithoutRelation) {
        if (!result.has(entity)) {
          result.set(entity, []);
        }
        result.get(entity)?.push(relationType);
      }
    }
  }

  return result;
}
