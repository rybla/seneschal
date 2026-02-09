import {
  createDocument,
  createEntity,
  createRelation,
  findEntitiesByNames,
  updateDocument,
} from "@/db/query";
import type { DocumentType, SelectDocument } from "@/db/schema";
import {
  classifyDocument,
  extractEntitiesAndRelations,
  extractStructuredMetadata,
} from "@/llm";
import type { PrivacyLevel } from "@/types";

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
    securityLevel: "standard",
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

  const chunks = content.split(/\n\s*\n/);
  const createdEntitiesMap = new Map<string, number>();

  for (const chunk of chunks) {
    if (chunk.trim().length < 50) continue;

    const { entities, relations } = await extractEntitiesAndRelations(
      chunk,
      documentType,
      privacyLevel,
    );

    for (const extractedEntity of entities) {
      if (createdEntitiesMap.has(extractedEntity.name)) continue;

      const existing = await findEntitiesByNames([extractedEntity.name]);
      if (existing.length > 0 && existing[0]) {
        createdEntitiesMap.set(extractedEntity.name, existing[0].id);
      } else {
        const newEntity = await createEntity({
          name: extractedEntity.name,
          type: extractedEntity.type,
          description: extractedEntity.description,
          sourceDocumentId: document.id,
          metadata: {},
        });
        createdEntitiesMap.set(extractedEntity.name, newEntity.id);
      }
    }

    for (const relation of relations) {
      const sourceId = createdEntitiesMap.get(relation.source);
      const targetId = createdEntitiesMap.get(relation.target);

      if (sourceId && targetId) {
        await createRelation({
          sourceEntityId: sourceId,
          targetEntityId: targetId,
          type: relation.type,
          description: relation.description,
          sourceDocumentId: document.id,
          properties: {},
        });
      }
    }
  }
  return document;
}
