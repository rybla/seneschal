import { RELATION_TYPES, type RelationType } from "./common";
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
 * @param missingRelationTypes The relation types to generate a query for.
 * @returns A Linkup query and schema, or null if the relation types are not supported.
 */
export function generateLinkupQuery(
  entity: SelectEntity,
  missingRelationTypes: RelationType[],
): { query: string; schema: z.ZodType<LinkupQueryStructuredResult> } | null {
  throw new Error("Not implemented");
}
