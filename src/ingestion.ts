import type {
  DocumentType,
  EntityType,
  PrivacyLevel,
  RelationType,
} from "@/common";
import {
  createDocument,
  createEntity,
  createRelation,
  findEntitiesByNames,
  updateDocument,
  updateEntity,
  findRelation,
  updateRelation,
} from "@/db/query";
import type { SelectDocument } from "@/db/schema";
import {
  classifyDocument,
  extractEntitiesAndRelations,
  extractStructuredMetadata,
} from "@/llm";

export async function ingestText(
  content: string,
  sourceType: "USER" | "SEARCH",
  privacyLevel: PrivacyLevel,
): Promise<SelectDocument> {
  const documentType = await classifyDocument(content, privacyLevel);
  console.log(`Classified content as ${documentType}`);

  const document = await createDocument({
    path: `generated://${sourceType}/${Date.now()}`,
    title: `Ingested from ${sourceType}`,
    content,
    type: documentType as DocumentType,
    privacyLevel,
    sourceType,
    metadata: {},
  });

  const structuredMetadata = await extractStructuredMetadata(
    content,
    documentType,
    privacyLevel,
  );
  if (structuredMetadata && Object.keys(structuredMetadata).length > 0) {
    await updateDocument(document.id, {
      metadata: structuredMetadata,
      lastIndexedAt: new Date(),
    });
  }

  const createdEntitiesMap = new Map<string, number>();

  const { entities, relations } = await extractEntitiesAndRelations(
    content,
    documentType,
    privacyLevel,
  );

  for (const extractedEntity of entities) {
    if (createdEntitiesMap.has(extractedEntity.name)) continue;

    // We search with "PRIVATE" (default) to find ANY existing entity with this name,
    // regardless of its privacy level, because we want to merge/link to it.
    const { resolvedEntities } = await findEntitiesByNames([
      {
        entityName: extractedEntity.name,
        entityType: extractedEntity.type,
        entityDescription: extractedEntity.description,
      },
    ]);

    if (resolvedEntities.length > 0 && resolvedEntities[0]) {
      const existingEntity = resolvedEntities[0];
      createdEntitiesMap.set(extractedEntity.name, existingEntity.id);

      // Privacy Upgrade Logic:
      // If the new document is PRIVATE, and the existing entity is PUBLIC,
      // we must upgrade the entity to PRIVATE.
      if (
        privacyLevel === "PRIVATE" &&
        existingEntity.privacyLevel === "PUBLIC"
      ) {
        await updateEntity(existingEntity.id, { privacyLevel: "PRIVATE" });
      }
    } else {
      const newEntity = await createEntity({
        name: extractedEntity.name,
        type: extractedEntity.type as unknown as EntityType,
        description: extractedEntity.description,
        sourceDocumentId: document.id,
        metadata: {},
        privacyLevel, // Init with document's privacy level
      });
      createdEntitiesMap.set(extractedEntity.name, newEntity.id);
    }
  }

  for (const relation of relations) {
    const sourceId = createdEntitiesMap.get(relation.source);
    const targetId = createdEntitiesMap.get(relation.target);

    if (sourceId && targetId) {
      // Check if relation already exists
      const existingRelation = await findRelation(
        sourceId,
        targetId,
        relation.type as unknown as RelationType,
      );

      if (existingRelation) {
        // Privacy Upgrade Logic for Relations
        // If new doc is PRIVATE and existing relation is PUBLIC, upgrade to PRIVATE.
        if (
          privacyLevel === "PRIVATE" &&
          existingRelation.privacyLevel === "PUBLIC"
        ) {
          await updateRelation(existingRelation.id, {
            privacyLevel: "PRIVATE",
          });
        }
      } else {
        await createRelation({
          sourceEntityId: sourceId,
          targetEntityId: targetId,
          type: relation.type as unknown as RelationType,
          description: relation.description,
          sourceDocumentId: document.id,
          properties: {},
          privacyLevel,
        });
      }
    }
  }
  return document;
}
