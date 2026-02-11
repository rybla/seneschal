# Updated Missing Relations API

Modified `findEntitiesWithMissingRelations` to return a structured result distinguishing between missing outgoing (source) and incoming (target) relations.

## Changes

- Updated `findEntitiesWithMissingRelations` return type:
  ```typescript
  Promise<
    Map<
      SelectEntity,
      { inRelationTypes: RelationType[]; outRelationTypes: RelationType[] }
    >
  >
  ```
- Updated `generateLinkupQuery` in `src/saturation.ts` to generate directional queries:
  ```typescript
  export function generateLinkupQuery(
    entity: SelectEntity,
    missingRelations: {
      inRelationTypes: RelationType[];
      outRelationTypes: RelationType[];
    },
  )
  ```
- Updated `src/server.ts` to use the new API.
- Fixed type errors in `src/ingestion.ts` and test files revealed during validation.
