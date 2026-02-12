import {
  RELATION_TYPES,
  type RelationType,
  PrintedEntityTypes,
  PrintedRelationTypes,
} from "./common";
import type { SelectEntity } from "./db/schema";
import z from "zod";
import type { Codomain } from "./utility";

export const LinkupQueryStructuredResultSchema = (entity: SelectEntity) =>
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
            .enum(Object.values(PrintedEntityTypes) as [string, ...string[]])
            .describe(
              `The type of the other entity, which is ${PrintedEntityTypes[entity.type]}`,
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
            .enum(Object.values(PrintedEntityTypes) as [string, ...string[]])
            .describe(
              `The type of the other entity, which is ${PrintedEntityTypes[entity.type]}`,
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
  entity: SelectEntity,
  result: LinkupQueryStructuredResult,
): string {
  const lines: string[] = [];
  const entityType =
    PrintedEntityTypes[entity.type as keyof typeof PrintedEntityTypes];

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

  const entityTypeLabel =
    PrintedEntityTypes[entity.type as keyof typeof PrintedEntityTypes];

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
