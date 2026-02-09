---
trigger: always_on
---

This project uses the Drizzle ORM with the SQLite dialect and the libSQL client.

- The database client is a default export form `./src/db/index.ts`. So you can import it via `import db from "@/db";`
- All schemas for the database are defined in `./src/db/schema.ts`.
- All queries to the database are defined as functions in `./src/db/query.ts`
