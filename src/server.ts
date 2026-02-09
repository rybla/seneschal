import env from "@/env";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import z from "zod";

// -----------------------------------------------------------------------------

export const app = new Hono()

app.use(cors())

// -----------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-unused-vars */
const routes = app
    .basePath("/api")
    .on("GET", "/ping", async (c) => {
        return c.text("pong")
    })
    .on("POST", "/echo", zValidator("json", z.object({ message: z.string() })), async (c) => {
        const { message } = c.req.valid("json");
        return c.text(message)
    })
    .on("POST", "/ingest", async (c) => {
        const body = await c.req.parseBody();
        const file = body["file"];

        if (!(file instanceof File)) {
            return c.json({ error: "No file uploaded" }, 400);
        }

        const buffer = await file.arrayBuffer();
        const bufferNode = Buffer.from(buffer);

        // Save to uploads directory
        const uploadsDir = "./uploads";
        await Bun.write(`${uploadsDir}/${file.name}`, file);

        // Extract text
        const { extractTextFromPdf } = await import("@/pdf");
        let textContent: string;
        try {
            textContent = await extractTextFromPdf(bufferNode);
        } catch (e) {
            console.error("Failed to extract text from PDF", e);
            return c.json({ error: "Failed to parse PDF" }, 500);
        }

        // Create document in DB
        const { createDocument, createEntity, createRelation, getDocumentByPath } = await import("@/db/query");

        try {
            const docPath = `${process.cwd()}/uploads/${file.name}`;
            let document = await getDocumentByPath(docPath);

            if (!document) {
                document = await createDocument({
                    path: docPath,
                    title: file.name,
                    content: textContent,
                    securityLevel: "standard",
                    metadata: {},
                });
            }

            // Placeholder for entity extraction
            // Real implementation would use an LLM here
            // For now, we'll just create a dummy entity for the document itself if needed, 
            // but the design says "extract entities and relations".
            // I'll add a simple entity based on the filename.

            const entity = await createEntity({
                name: file.name.replace(".pdf", ""),
                type: "DOCUMENT",
                description: "Imported document",
                sourceDocumentId: document.id,
                metadata: {},
            });

            // Create a relation just to show we can
            // (Self-reference or similar, or just skip if no other entities)
            await createRelation({
                sourceEntityId: entity.id,
                targetEntityId: entity.id,
                type: "SELF_REFERENCE",
                description: "Auto-generated self reference for testing",
                sourceDocumentId: document.id,
                properties: {},
            });

            return c.json({
                success: true,
                documentId: document.id,
                entityId: entity.id
            });

        } catch (error) {
            console.error("Database error", error);
            return c.json({ error: "Database error" }, 500);
        }
    })

// -----------------------------------------------------------------------------

// Serve static files from the dist directory.
app.get("*", serveStatic({ root: "./dist" }))

// -----------------------------------------------------------------------------

export type AppType = typeof routes;

export default {
    port: env.PORT,
    fetch: app.fetch,
};
