import { create, insert, search, type Orama } from "@orama/orama";

// Define the schema types for our local vector DB
export type EntityDocument = {
    id: string; // The database ID (as string)
    name: string;
    description: string;
    type: string;
}

// Global instance to hold the Orama DB in memory
// In a real app, we might want to persist this to disk or rebuild on startup.
// For this MVP, we'll rebuild it in memory when needed or keep it as a singleton.

const schema = {
    id: "string",
    name: "string",
    description: "string",
    type: "string",
} as const;

let oramaDb: Orama<typeof schema> | null = null;

/**
 * Initializes the Orama database if it doesn't exist.
 */
export async function getOramaDb() {
    if (oramaDb) return oramaDb;

    oramaDb = await create({
        schema,
    });

    return oramaDb;
}

/**
 * Indexes a single entity into the Orama database.
 */
export async function indexEntity(entity: { id: number; name: string; description: string | null; type: string }) {
    const db = await getOramaDb();
    await insert(db, {
        id: String(entity.id),
        name: entity.name,
        description: entity.description || "",
        type: entity.type,
    });
}

/**
 * Indexes multiple entities at once.
 */
export async function indexEntities(entities: Array<{ id: number; name: string; description: string | null; type: string }>) {
    const db = await getOramaDb();
    await params.insertMultiple(db, entities.map(e => ({
        id: String(e.id),
        name: e.name,
        description: e.description || "",
        type: e.type,
    })));
}
import * as params from "@orama/orama";


/**
 * Finds similar entities based on a text query (e.g. an entity name).
 * Uses Orama's default search/similarity.
 */
export async function findSimilarEntities(queryText: string, threshold = 0.5) {
    const db = await getOramaDb();
    // Orama's default search with threshold
    const result = await search(db, {
        term: queryText,
        properties: ["name"], // Search primarily in name
        threshold: threshold,
    });

    return result.hits.map(hit => ({
        id: parseInt(hit.document.id as string),
        score: hit.score,
        document: hit.document
    }));
}