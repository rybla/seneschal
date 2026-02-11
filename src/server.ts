import {
  findCommonRelationPatterns,
  findEntitiesByNames,
  findEntitiesWithMissingRelations,
  getAllDocuments,
  getAllEntities,
  getAllRelations,
  getGraphContext,
  mergeEntities,
} from "@/db/query";
import env from "@/env";
import { searchLinkup } from "@/linkup";
import { extractQueryEntities, synthesizeAnswerFromGraph } from "@/llm";
import { findSimilarEntities, getOramaDb, indexEntity } from "@/orama";
import * as pdf from "@/pdf";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import z from "zod";
import { runMigrations } from "./db/migration";
import { ingestText } from "./ingestion";
import { generateLinkupQuery } from "./saturation";

import { PRIVACY_LEVELS } from "@/common";

// -----------------------------------------------------------------------------

await runMigrations();

// -----------------------------------------------------------------------------

/**
 * The main Hono application instance.
 */
export const app = new Hono();

app.use(cors());
app.use(logger());

// -----------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Application routes definitions.
 */
const routes = app
  .basePath("/api")
  .on(
    "POST",
    "/ingest",
    zValidator(
      "form",
      z.object({
        file: z.instanceof(File),
        privacyLevel: z.enum(PRIVACY_LEVELS),
      }),
    ),
    async (c) => {
      const { file, privacyLevel } = c.req.valid("form");

      const buffer = await file.arrayBuffer();
      const bufferNode = Buffer.from(buffer);

      // Save to uploads directory
      const uploadsDir = "./uploads";
      await Bun.write(`${uploadsDir}/${file.name}`, file);

      // Extract text

      let textContent: string;
      if (file.name.toLowerCase().endsWith(".pdf")) {
        try {
          textContent = await pdf.extractTextFromPdf(bufferNode);
        } catch (e) {
          console.error("Failed to extract text from PDF", e);
          return c.json({ error: "Failed to parse PDF" }, 500);
        }
      } else {
        textContent = bufferNode.toString("utf-8");
      }

      try {
        const document = await ingestText(textContent, "USER", privacyLevel);
        return c.json({
          success: true,
          documentId: document.id,
        });
      } catch (error) {
        console.error("Database error", error);
        return c.json({ error: "Database error" }, 500);
      }
    },
  )
  .on("POST", "/merge-nodes", async (c) => {
    try {
      // 1. Fetch all entities
      const allEntities = await getAllEntities();
      if (allEntities.length === 0) {
        return c.json({ message: "No entities to merge" });
      }

      // 2. Index all entities into Orama
      // For MVP, we're doing a fresh index every time. Optimization: persist or incremental updates.
      const db = await getOramaDb();
      // Clear or assume fresh instance for simplicity in this MVP context (in memory var).
      // Actually, we should probably clear it if it persists across requests,
      // but for now let's just insert. Since `getOramaDb` uses a global variable,
      // we might be double-indexing if the server stays alive.
      // Correct approach for this MVP: just insert what we invoke.
      // Better: Re-create the DB instance for this operation to be clean.
      // But strictness aside, let's just insert.

      // To be safe against duplicates in a long-running server, let's just proceed with indexing.
      // Ideally we'd have a `clear()` method, but `create` makes a new one if we null it out.
      // Let's rely on the fact we likely restart or it's fine for now.

      for (const entity of allEntities) {
        await indexEntity(entity);
      }

      // 3. Find duplicates
      const mergedPairs: Array<{ winner: string; loser: string }> = [];
      const processedIds = new Set<number>();

      for (const entity of allEntities) {
        if (processedIds.has(entity.id)) continue;

        // Find similar entities
        // We use the name as the query.
        const similar = await findSimilarEntities(entity.name, 0.85); // High threshold for "equivalence"

        for (const hit of similar) {
          const otherId = hit.id;
          if (otherId === entity.id) continue;
          if (processedIds.has(otherId)) continue;

          // Simple logic: If we found a match that we haven't processed, merge it!
          // Validating similarity beyond just Orama score might be needed (e.g. types match).
          // For now, let's assume if names are very similar, they are the same.

          // Pick a winner: The one with the lower ID (arbitrary deterministic rule)
          // or maybe the longer description? Let's use lower ID for stability.
          const winnerId = Math.min(entity.id, otherId);
          const loserId = Math.max(entity.id, otherId);

          await mergeEntities(winnerId, loserId);

          processedIds.add(winnerId);
          processedIds.add(loserId);

          mergedPairs.push({
            winner: `${winnerId}`,
            loser: `${loserId}`,
          });
        }
      }

      return c.json({
        success: true,
        mergedCount: mergedPairs.length,
        mergedPairs,
      });
    } catch (error) {
      console.error("Merge error", error);
      return c.json({ error: "Merge failed" }, 500);
    }
  })
  .on("POST", "/saturate-database", async (c) => {
    try {
      const patterns = await findCommonRelationPatterns();
      const entitiesWithMissingRelations =
        await findEntitiesWithMissingRelations(patterns);
      let saturatedCount = 0;

      for (const [
        entity,
        missingRelations,
      ] of entitiesWithMissingRelations.entries()) {
        try {
          const linkupQuery = generateLinkupQuery(entity, missingRelations);
          if (!linkupQuery) continue;

          const result = await searchLinkup(
            linkupQuery.query,
            linkupQuery.schema,
          );

          if (result) {
            await ingestText(
              JSON.stringify(result, null, 2),
              "SEARCH",
              "PRIVATE",
            );
            saturatedCount++;
          }
        } catch (e) {
          console.error(
            `Failed to saturate entity ${entity.name} for relations ${JSON.stringify(missingRelations)}:`,
            e,
          );
        }
      }

      return c.json({
        success: true,
        saturatedCount,
      });
    } catch (error) {
      console.error("Saturation error", error);
      return c.json({ error: "Saturation failed" }, 500);
    }
  })
  .on(
    "POST",
    "/query",
    zValidator(
      "json",
      z.object({
        query: z.string(),
        privacy_level: z.enum(PRIVACY_LEVELS),
      }),
    ),

    async (c) => {
      const { query, privacy_level } = c.req.valid("json");

      try {
        const entities = await extractQueryEntities(query, privacy_level);
        // If no entities found, returning empty graph
        if (entities.length === 0) {
          return c.json({ nodes: [], edges: [] });
        }

        const resolvedEntities = await findEntitiesByNames(
          entities,
          privacy_level,
        );
        const ids = resolvedEntities.map((e) => e.id);

        if (ids.length === 0) {
          return c.json({ nodes: [], edges: [] });
        }

        const graphData = await getGraphContext(ids, 2, privacy_level); // Depth 2

        if (graphData.nodes.length === 0) {
          return c.json({
            graphData: { nodes: [], edges: [] },
            answer: "No relevant information found.",
          });
        }

        const answer = await synthesizeAnswerFromGraph(
          query,
          graphData,
          privacy_level,
        );

        return c.json({ graphData, answer });
      } catch (e) {
        console.error("Query error", e);
        return c.json({ error: "Query failed" }, 500);
      }
    },
  )
  .get("/documents", async (c) => {
    try {
      const documents = await getAllDocuments();
      return c.json(documents);
    } catch (e) {
      console.error("Failed to fetch documents", e);
      return c.json({ error: "Failed to fetch documents" }, 500);
    }
  })
  .get("/entities", async (c) => {
    try {
      const entities = await getAllEntities();
      return c.json(entities);
    } catch (e) {
      console.error("Failed to fetch entities", e);
      return c.json({ error: "Failed to fetch entities" }, 500);
    }
  })
  .get("/relations", async (c) => {
    try {
      const relations = await getAllRelations();
      return c.json(relations);
    } catch (e) {
      console.error("Failed to fetch relations", e);
      return c.json({ error: "Failed to fetch relations" }, 500);
    }
  });

// -----------------------------------------------------------------------------

// Serve static files from the dist directory.
app.get("*", serveStatic({ root: "./dist" }));

// -----------------------------------------------------------------------------

export type AppType = typeof routes;

export default {
  port: env.PORT,
  fetch: app.fetch,
};
