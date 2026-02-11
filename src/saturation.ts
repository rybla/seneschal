import {
  RELATION_TYPES,
  type RelationType,
  PrintedEntityTypes,
  PrintedRelationTypes,
} from "./common";
import type { SelectEntity } from "./db/schema";
import z from "zod";

export const LinkupQueryStructuredResultSchema = z.object({
  ...RELATION_TYPES.reduce(
    (acc, relationType) => ({ ...acc, [relationType]: z.optional(z.string()) }),
    {} as Record<RelationType, z.ZodOptional<z.ZodString>>,
  ),
});

export type LinkupQueryStructuredResult = z.infer<
  typeof LinkupQueryStructuredResultSchema
>;

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

  const parts: string[] = [];
  parts.push(
    `Find the following relations for ${entity.name} (${entityTypeLabel}):`,
  );

  if (outRelationTypes.length > 0) {
    const outLabels = outRelationTypes
      .map((type) => PrintedRelationTypes[type])
      .join(", ");
    parts.push(`Outgoing (entity is source): ${outLabels}.`);
  }

  if (inRelationTypes.length > 0) {
    const inLabels = inRelationTypes
      .map((type) => PrintedRelationTypes[type])
      .join(", ");
    parts.push(`Incoming (entity is target): ${inLabels}.`);
  }

  return { query: parts.join(" "), schema: LinkupQueryStructuredResultSchema };
}
