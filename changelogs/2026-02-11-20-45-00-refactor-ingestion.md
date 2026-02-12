# Refactor Ingestion

Refactored `src/ingestion.ts` and `src/llm.ts` to process the entire document at once instead of in chunks.
This simplifies the ingestion pipeline and allows the LLM to have full context of the document.

## Changes

- Modified `extractEntitiesAndRelations` in `src/llm.ts`:
  - Removed chunking arguments (`entireDocumentText`, `text`).
  - Updated prompt to analyze the entire document.
  - Updated signature to use `DocumentType` enum.
- Modified `ingestText` in `src/ingestion.ts`:
  - Removed chunking loop.
  - Calls `extractEntitiesAndRelations` once with full content.
  - Preserved privacy upgrade logic.
- Updated `src/privacy.test.ts`:
  - Added mock for `extractEntitiesAndRelations` to prevent test timeouts.
