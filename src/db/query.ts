/**
 * This module contains all database queries.
 */

import type { EntityType, PrivacyLevel, RelationType } from "@/common";
import db from "@/db";
import {
  documentsTable,
  entitiesTable,
  relationsTable,
  type InsertDocument,
  type InsertEntity,
  type InsertRelation,
  type SelectDocument,
  type SelectEntity,
  type SelectRelation,
} from "@/db/schema";
import type { GraphData, GraphEdge, GraphNode } from "@/types";
import { and, count, eq, inArray, notInArray, or, sql } from "drizzle-orm";

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
  updates: { lastIndexedAt?: Date },
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
 * Updates an entity.
 */
export async function updateEntity(
  id: number,
  data: Partial<InsertEntity>,
): Promise<SelectEntity> {
  const [entity] = await db
    .update(entitiesTable)
    .set(data)
    .where(eq(entitiesTable.id, id))
    .returning();
  if (!entity) throw new Error("Failed to update entity");
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
 * Updates a relation.
 */
export async function updateRelation(
  id: number,
  data: Partial<InsertRelation>,
): Promise<SelectRelation> {
  const [relation] = await db
    .update(relationsTable)
    .set(data)
    .where(eq(relationsTable.id, id))
    .returning();
  if (!relation) throw new Error("Failed to update relation");
  return relation;
}

/**
 * Finds an existing relation between two entities with a specific type.
 */
export async function findRelation(
  sourceId: number,
  targetId: number,
  type: RelationType,
): Promise<SelectRelation | undefined> {
  return db.query.relationsTable.findFirst({
    where: and(
      eq(relationsTable.sourceEntityId, sourceId),
      eq(relationsTable.targetEntityId, targetId),
      eq(relationsTable.type, type),
    ),
  });
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
 * Also upgrades the winner's privacy level if the loser is PRIVATE.
 * @param winnerId The ID of the entity to keep.
 * @param loserId The ID of the entity to merge into the winner and delete.
 */
export async function mergeEntities(
  winnerId: number,
  loserId: number,
): Promise<void> {
  // 0. Check privacy levels
  const [winner] = await db
    .select()
    .from(entitiesTable)
    .where(eq(entitiesTable.id, winnerId));
  const [loser] = await db
    .select()
    .from(entitiesTable)
    .where(eq(entitiesTable.id, loserId));

  if (winner && loser) {
    // If loser is PRIVATE and winner is PUBLIC, upgrade winner to PRIVATE
    if (loser.privacyLevel === "PRIVATE" && winner.privacyLevel === "PUBLIC") {
      await updateEntity(winnerId, { privacyLevel: "PRIVATE" });
    }
  }

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
 * @param privacyLevel The privacy level of the query.
 * @returns The graph data comprising relevant nodes and edges.
 */
export async function getGraphContext(
  startEntityIds: number[],
  depth: number = 1,
  privacyLevel: PrivacyLevel = "PRIVATE", // Default to most permissive if not specified (internal calls)
): Promise<GraphData> {
  let currentLevelIds: number[] = [];
  const nodesMap = new Map<number, GraphNode>();
  const edgesMap = new Map<number, GraphEdge>();

  // Helper to build privacy filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const privacyFilter = (table: any) => {
    if (privacyLevel === "PUBLIC") {
      return eq(table.privacyLevel, "PUBLIC");
    }
    return undefined; // No filter for PRIVATE (can see everything)
  };

  // First, get the initial nodes
  if (startEntityIds.length > 0) {
    const whereClause = and(
      inArray(entitiesTable.id, startEntityIds),
      privacyFilter(entitiesTable),
    );
    const initialNodes = await db
      .select()
      .from(entitiesTable)
      .where(whereClause);

    // Reset currentLevelIds to only include those that are visible
    currentLevelIds = initialNodes.map((n) => n.id);

    for (const node of initialNodes) {
      nodesMap.set(node.id, {
        id: node.id,
        name: node.name,
        type: node.type,
        description: node.description,
        privacyLevel: node.privacyLevel,
      });
    }
  }

  const visitedNodeIds = new Set<number>(currentLevelIds);

  for (let d = 0; d < depth; d++) {
    if (currentLevelIds.length === 0) break;

    // Find all edges connected to current level nodes
    const whereClause = and(
      or(
        inArray(relationsTable.sourceEntityId, currentLevelIds),
        inArray(relationsTable.targetEntityId, currentLevelIds),
      ),
      privacyFilter(relationsTable),
    );

    const relevantRelations = await db
      .select()
      .from(relationsTable)
      .where(whereClause);

    const nextLevelIds: number[] = [];

    for (const rel of relevantRelations) {
      // Check if both ends are visible (for nodes we haven't fetched yet, we'll check later,
      // but strictly speaking we should check if the other node is visible before adding the edge.
      // However, we'll fetch the next level nodes with privacy filter, so if a node is hidden,
      // it won't be added to nodesMap. We should only add edge if both nodes end up in nodesMap?
      // Or we can blindly add edges and prune later?
      // Better: Fetch potential next nodes, filter them, then only add edges that connect visible nodes.
      // But that requires fetching nodes first.
      // Let's optimistically add edges, and then filter edges that point to missing nodes at the end?
      // Or just let the UI handle it?
      // For security, we should ensure we don't return edges to hidden nodes.
      // We will perform a check on the neighbor nodes.

      // Check if both ends are visible (for nodes we haven't fetched yet, we'll check later, (because we only put visible nodes in visitedNodeIds).
      // If not visited, we need to verify it.

      if (!visitedNodeIds.has(rel.sourceEntityId))
        nextLevelIds.push(rel.sourceEntityId);
      if (!visitedNodeIds.has(rel.targetEntityId))
        nextLevelIds.push(rel.targetEntityId);

      // Refined approach: We will filter edges after fetching new nodes.
      // Temporarily store them.
    }

    // Deduplicate nextLevelIds
    const uniqueNextLevelIds = Array.from(new Set(nextLevelIds));

    if (uniqueNextLevelIds.length > 0) {
      // Fetch the node details for the new neighbors with privacy filter
      const whereClauseNodes = and(
        inArray(entitiesTable.id, uniqueNextLevelIds),
        privacyFilter(entitiesTable),
      );

      const newNodes = await db
        .select()
        .from(entitiesTable)
        .where(whereClauseNodes);

      const visibleNewNodeIds = new Set<number>();
      for (const node of newNodes) {
        visibleNewNodeIds.add(node.id);
        visitedNodeIds.add(node.id);
        nodesMap.set(node.id, {
          id: node.id,
          name: node.name,
          type: node.type,
          description: node.description,
          privacyLevel: node.privacyLevel,
        });
      }

      // Now add edges only if they connect two visible nodes (or if the other end is already visited/visible)
      for (const rel of relevantRelations) {
        const sourceVisible = visitedNodeIds.has(rel.sourceEntityId);
        const targetVisible = visitedNodeIds.has(rel.targetEntityId);

        if (sourceVisible && targetVisible) {
          edgesMap.set(rel.id, {
            id: rel.id,
            source: rel.sourceEntityId,
            target: rel.targetEntityId,
            type: rel.type,
            description: rel.description,
            properties: rel.properties,
            privacyLevel: rel.privacyLevel,
          });
        }
      }

      // Update currentLevelIds to only the newly found visible nodes
      // (to continue traversal from them)
      // Note: uniqueNextLevelIds might contain nodes we already visited if the graph has cycles,
      // but visitedNodeIds check in the loop above prevents adding them to nextLevelIds...
      // wait, I logic'd the nextLevelIds push slightly loosely above.
      // Let's refine:

      currentLevelIds = [];
      for (const node of newNodes) {
        // Only traverse from *newly* discovered nodes to avoid loops/redundancy
        // Effectively BFS.
        // But we need to make sure we don't re-process.
        // The visitedNodeIds check was supposed to handle that.
        // Actually, let's just use the `newNodes` IDs for next iteration.
        currentLevelIds.push(node.id);
      }
    } else {
      // No new nodes found, but we might still have edges between existing nodes?
      // The loop above only adds edges if they point to unvisited nodes or...
      // wait. "If we already visited the neighbor".
      // We need to add edges between nodes even if they are already visited.
      // My logic for adding edges was deferred.

      // If no new nodes, we still need to add the edges that were found this round
      // which connect existing nodes.
      for (const rel of relevantRelations) {
        const sourceVisible = visitedNodeIds.has(rel.sourceEntityId);
        const targetVisible = visitedNodeIds.has(rel.targetEntityId);

        if (sourceVisible && targetVisible) {
          edgesMap.set(rel.id, {
            id: rel.id,
            source: rel.sourceEntityId,
            target: rel.targetEntityId,
            type: rel.type,
            description: rel.description,
            properties: rel.properties,
            privacyLevel: rel.privacyLevel,
          });
        }
      }
      break;
    }
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgesMap.values()),
  };
}

/**
 * Finds entities that match any of the provided names (exact match).
 * @param names List of entity names to search for.
 * @returns Array of matching entities.
 */
/**
 * Finds entities that match any of the provided names (exact match).
 * @param entities List of entity names to search for.
 * @param privacyLevel The privacy level of the query.
 * @returns Array of matching entities.
 */
export async function findEntitiesByNames(
  entities: {
    entityName: string;
    entityType: EntityType;
    entityDescription: string;
  }[],
  privacyLevel: PrivacyLevel = "PRIVATE",
): Promise<{
  resolvedEntities: SelectEntity[];
  unresolvedEntities: {
    entityName: string;
    entityType: EntityType;
    entityDescription: string;
  }[];
}> {
  if (entities.length === 0)
    return { resolvedEntities: [], unresolvedEntities: [] };

  const filters = [
    inArray(
      entitiesTable.name,
      entities.map((n) => n.entityName),
    ),
  ];

  if (privacyLevel === "PUBLIC") {
    filters.push(eq(entitiesTable.privacyLevel, "PUBLIC"));
  }

  const resolvedEntities = await db
    .select()
    .from(entitiesTable)
    .where(and(...filters));
  return {
    resolvedEntities,
    unresolvedEntities: entities.filter(
      (entity) =>
        !resolvedEntities.some(
          (resolvedEntity) => resolvedEntity.name === entity.entityName,
        ),
    ),
  };
}

/**
 * Finds common relation patterns in the knowledge graph.
 * A pattern is a combination of an entity type and a relation type.
 * @param threshold The minimum number of times a pattern must appear to be considered common.
 * @returns A map where keys are entity types and values are arrays of common relation types.
 */
export async function findCommonRelationPatterns(
  threshold: number = 2,
): Promise<Map<EntityType, RelationType[]>> {
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

  const result = new Map<EntityType, RelationType[]>();
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
 * @returns A map where keys are entities and values are objects containing arrays of missing "in" (target) and "out" (source) relation types.
 */
export async function findEntitiesWithMissingRelations(
  patterns: Map<EntityType, RelationType[]>,
): Promise<
  Map<
    SelectEntity,
    { inRelationTypes: RelationType[]; outRelationTypes: RelationType[] }
  >
> {
  const tempMap = new Map<
    number,
    {
      entity: SelectEntity;
      inRelationTypes: Set<RelationType>;
      outRelationTypes: Set<RelationType>;
    }
  >();

  for (const [entityType, relationTypes] of patterns.entries()) {
    for (const relationType of relationTypes) {
      // 1. Check for missing OUT (Source) relations
      // Find entities of type entityType that are NOT source of relationType
      const entitiesWithOutRelation = db
        .select({ id: relationsTable.sourceEntityId })
        .from(relationsTable)
        .where(eq(relationsTable.type, relationType));

      const entitiesMissingOut = await db
        .select()
        .from(entitiesTable)
        .where(
          and(
            eq(entitiesTable.type, entityType),
            notInArray(entitiesTable.id, entitiesWithOutRelation),
          ),
        );

      for (const entity of entitiesMissingOut) {
        if (!tempMap.has(entity.id)) {
          tempMap.set(entity.id, {
            entity,
            inRelationTypes: new Set(),
            outRelationTypes: new Set(),
          });
        }
        tempMap.get(entity.id)!.outRelationTypes.add(relationType);
      }

      // 2. Check for missing IN (Target) relations
      // Find entities of type entityType that are NOT target of relationType
      const entitiesWithInRelation = db
        .select({ id: relationsTable.targetEntityId })
        .from(relationsTable)
        .where(eq(relationsTable.type, relationType));

      const entitiesMissingIn = await db
        .select()
        .from(entitiesTable)
        .where(
          and(
            eq(entitiesTable.type, entityType),
            notInArray(entitiesTable.id, entitiesWithInRelation),
          ),
        );

      for (const entity of entitiesMissingIn) {
        if (!tempMap.has(entity.id)) {
          tempMap.set(entity.id, {
            entity,
            inRelationTypes: new Set(),
            outRelationTypes: new Set(),
          });
        }
        tempMap.get(entity.id)!.inRelationTypes.add(relationType);
      }
    }
  }

  const result = new Map<
    SelectEntity,
    { inRelationTypes: RelationType[]; outRelationTypes: RelationType[] }
  >();
  for (const {
    entity,
    inRelationTypes,
    outRelationTypes,
  } of tempMap.values()) {
    result.set(entity, {
      inRelationTypes: Array.from(inRelationTypes),
      outRelationTypes: Array.from(outRelationTypes),
    });
  }

  return result;
}
