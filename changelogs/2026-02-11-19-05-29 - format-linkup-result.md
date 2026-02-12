# Format Linkup Result

- Implemented `formatLinkupResult` helper function in `src/saturation.ts` to format `LinkupQueryStructuredResult` into a human-readable string.
- Updated `src/server.ts` to use `formatLinkupResult` instead of `JSON.stringify` when ingesting Linkup search results.
- Fixed `LinkupQueryStructuredResultSchema` to correctly use `PrintedEntityTypes` values in Zod enum.

```typescript
export function formatLinkupResult(
  entity: SelectEntity,
  result: LinkupQueryStructuredResult,
): string {
  // ... implementation ...
}
```
