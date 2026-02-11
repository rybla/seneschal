# Implement Privacy Levels

Implemented privacy levels for documents, entities, and relations to ensure sensitive data is protected.

## Highlights
- **Schema Updates**: Verified schema supports `privacyLevel` (PUBLIC/PRIVATE).
- **Ingestion**: 
    - Updated ingestion logic to inherit privacy level from documents.
    - Implemented privacy upgrade logic: if a PRIVATE document mentions a PUBLIC entity, the entity is upgraded to PRIVATE.
- **Database Logic**:
    - Updated `mergeEntities` to inherit the highest privacy level (PRIVATE wins).
    - Updated `getGraphContext` to filter nodes and edges based on query privacy level.
    - Updated `findEntitiesByNames` to respect privacy visibility.
- **Server API**:
    - Updated `/api/query` to accept `privacy_level` and pass it to graph context retrieval.
    - Added support for text file ingestion in `/api/ingest` (fallback from PDF).
- **Verification**:
    - Added `src/privacy.test.ts` to verify ingestion, merging, and querying privacy logic.
