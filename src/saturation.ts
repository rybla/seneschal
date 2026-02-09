import { CompanyHeadquartersSchema } from "./linkup";
import type { SelectEntity } from "./db/schema";
import { toJsonSchema } from "./utility";

export function generateLinkupQuery(
  entity: SelectEntity,
  relationType: string,
): { query: string; schema: Record<string, unknown> } | null {
  switch (relationType) {
    case "HAS_HEADQUARTERS":
      return {
        query: `What is the headquarters location of ${entity.name}?`,
        schema: toJsonSchema(CompanyHeadquartersSchema),
      };
    // Add other cases here
    default:
      return null;
  }
}
