import {
  RELATION_TYPES,
  type RelationType,
  PrintedEntityTypes,
  PrintedRelationTypes,
  type EntityType,
  ENTITY_TYPES,
} from "./common";
import type { SelectEntity } from "./db/schema";
import z from "zod";
import type { Codomain } from "./utility";

export const LinkupQueryStructuredResultSchema = (entity: {
  name: string;
  type: string;
}) =>
  z.object({
    inRelations: z.array(
      z
        .object({
          relationType: z.enum(RELATION_TYPES),
          otherEntityName: z
            .string()
            .describe(
              `The name of the other entity that is related to ${entity.name}`,
            ),
          otherEntityType: z
            .enum(ENTITY_TYPES)
            .describe(
              `The type of the other entity that is related to ${entity.name}`,
            ),
          evidence: z
            .string()
            .describe(
              "The evidence for the relation as a passaged of extracted text or summarized information",
            ),
        })
        .describe(
          `An instance of a relation of the form <otherEntity> <relationType> ${entity.name}, where <otherEntity> is the name of the other entity and <relationType> is the relation type.`,
        ),
    ),
    outRelations: z.array(
      z
        .object({
          relationType: z.enum(RELATION_TYPES),
          otherEntityName: z
            .string()
            .describe(
              `The name of the other entity that is related to ${entity.name}`,
            ),
          otherEntityType: z
            .enum(ENTITY_TYPES)
            .describe(
              `The type of the other entity that is related to ${entity.name}`,
            ),
          evidence: z
            .string()
            .describe(
              "The evidence for the relation as a passaged of extracted text or summarized information",
            ),
        })
        .describe(
          `An instance of a relation of the form "${entity.name} <relationType> <otherEntity>", where <otherEntity> is the name of the other entity and <relationType> is the relation type.`,
        ),
    ),
  });

export type LinkupQueryStructuredResult = z.infer<
  Codomain<typeof LinkupQueryStructuredResultSchema>
>;

export function formatLinkupResult(
  entity: { name: string; type: EntityType },
  result: LinkupQueryStructuredResult,
): string {
  const lines: string[] = [];
  const entityType = PrintedEntityTypes[entity.type];

  lines.push(`Found relations for ${entity.name} (${entityType}):`);

  if (result.inRelations.length > 0) {
    lines.push("\nIn-coming relations:");
    for (const rel of result.inRelations) {
      const relType = PrintedRelationTypes[rel.relationType];
      lines.push(
        `- ${rel.otherEntityName} (${rel.otherEntityType}) ${relType} ${entity.name}`,
      );
      lines.push(`  Evidence: ${rel.evidence}`);
    }
  }

  if (result.outRelations.length > 0) {
    lines.push("\nOut-going relations:");
    for (const rel of result.outRelations) {
      const relType = PrintedRelationTypes[rel.relationType];
      lines.push(
        `- ${entity.name} ${relType} ${rel.otherEntityName} (${rel.otherEntityType})`,
      );
      lines.push(`  Evidence: ${rel.evidence}`);
    }
  }

  return lines.join("\n");
}

/**
 * Generates a Linkup query to search for the missing relations of an entity.
 * @param entity The entity to generate a query for.
 * @param missingRelations The relation types to generate a query for, separated by direction.
 * @returns A Linkup query and schema, or null if the relation types are not supported.
 */
export function generateLinkupQuery(
  entity: SelectEntity,
  missingRelations: {
    inRelationTypes: RelationType[];
    outRelationTypes: RelationType[];
  },
): { query: string; schema: z.ZodType<LinkupQueryStructuredResult> } | null {
  const { inRelationTypes, outRelationTypes } = missingRelations;
  if (inRelationTypes.length === 0 && outRelationTypes.length === 0) {
    return null;
  }

  const entityTypeLabel = PrintedEntityTypes[entity.type];

  const inRelationsPart =
    inRelationTypes.length > 0
      ? inRelationTypes
          .map(
            (inRelationType) =>
              `    - ... ${PrintedRelationTypes[inRelationType]} ${entity.name} (${entityTypeLabel})`,
          )
          .join("\n")
      : "";

  const outRelationsPart =
    outRelationTypes.length > 0
      ? outRelationTypes
          .map(
            (outRelationType) =>
              `    - ... ${PrintedRelationTypes[outRelationType]} ${entity.name} (${entityTypeLabel})`,
          )
          .join("\n")
      : "";

  const query = `**Your task is to** find the missing relations for ${entity.name} (${entityTypeLabel}):\n\n${inRelationsPart}\n${outRelationsPart}\n\nFirst scrape homepages, press releases, and other relevant sources for ${entity.name} (${entityTypeLabel}). Then, synthesize the extracted data into a structured format that can be used to populate the missing relations.`;

  return { query, schema: LinkupQueryStructuredResultSchema(entity) };
}

/**
 * Generates a generic Linkup query to search for information about an entity and its relations.
 * @param entity The entity to search for.
 * @returns A Linkup query and schema.
 */
export function generateGenericLinkupQuery(entity: {
  name: string;
  type: EntityType;
  description: string;
}): { query: string; schema: z.ZodType<LinkupQueryStructuredResult> } {
  const entityTypeLabel = PrintedEntityTypes[entity.type];

  const query = `**Your task is to** find information about ${entity.name} (${entityTypeLabel}).
  
Context: ${entity.description}

First scrape homepages, press releases, and other relevant sources for ${entity.name} (${entityTypeLabel}). Then, synthesize the extracted data into a structured format that describes its relationships to other entities.`;

  return { query, schema: LinkupQueryStructuredResultSchema(entity) };
}

/**
 * Formats the result of a generic Linkup query into a string for ingestion.
 * @param entity The entity that was searched for.
 * @param result The structured result from Linkup.
 * @returns A string representation of the result.
 */
export function formatGenericLinkupResult(
  entity: { name: string; type: EntityType },
  result: LinkupQueryStructuredResult,
): string {
  // We can reuse the existing formatLinkupResult logic, but we need to adapt the object shape if formatLinkupResult expects strictly SelectEntity
  // Actually formatLinkupResult expects SelectEntity which matches { name, type } mostly but has extra fields.
  // Let's create a new function that copies the logic but takes { name, type }.
  // Or just cast it.

  const lines: string[] = [];
  const entityType = PrintedEntityTypes[entity.type];

  lines.push(`Found relations for ${entity.name} (${entityType}):`);

  if (result.inRelations.length > 0) {
    lines.push("\nIn-coming relations:");
    for (const rel of result.inRelations) {
      const relType = PrintedRelationTypes[rel.relationType];
      lines.push(
        `- ${rel.otherEntityName} (${rel.otherEntityType}) ${relType} ${entity.name}`,
      );
      lines.push(`  Evidence: ${rel.evidence}`);
    }
  }

  if (result.outRelations.length > 0) {
    lines.push("\nOut-going relations:");
    for (const rel of result.outRelations) {
      const relType = PrintedRelationTypes[rel.relationType];
      lines.push(
        `- ${entity.name} ${relType} ${rel.otherEntityName} (${rel.otherEntityType})`,
      );
      lines.push(`  Evidence: ${rel.evidence}`);
    }
  }

  return lines.join("\n");
}
