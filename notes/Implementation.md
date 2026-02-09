# Implementation of Seneschal

Technology stack:

- [Bun](https://bun.sh/) package manager and server-side runtime
- [TypeScript](https://www.typescriptlang.org/) for type safety and autocompletion
- [SQLite](https://www.sqlite.org/) for database
- [Drizzle](https://orm.drizzle.team/) for database schema and queries
- [Hono](https://hono.dev/) for web server library
- [Gemini API](https://ai.google.dev/gemini-api/docs) for general LLM functionalities via the "@google/genai" package
- [LinkUp](https://www.linkup.so) for agentic AI internet search
- Use [Orama](https://orama.com/product/vector-database) for the vector database framework

## Hono Server

The Hono server is defined in `src/index.ts`. It exposes API endpoints for the frontend to use (each API endpoint begins with `/api/`). It serves static files from the `dist` directory, which is populated by the bundling process. The server is started using `just dev`.

## Database

The database will be a SQLite database. The schema will be defined using Drizzle.

- Database client is exported from `src/db/index.ts`. It can be imported via `import db from "@/db"`.
- Database schema definitions are in `src/db/schema.ts`
- Database queries are in `src/db/query.ts`

## Frontend

The frontend is a collection of single-page React applications. Each page has an entrypoint HTML page in `./src/pages/`. The entrypoint HTML page is used to load the React application and its styles. The React application is bundled and served as static assets.
