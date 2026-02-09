import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Table to store metadata and content reference for local files (contracts, statements, etc.)
export const documentsTable = sqliteTable("documents", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    path: text("path").notNull().unique(), // Absolute path to the file
    hash: text("hash"), // Checksum for change detection
    title: text("title"),
    content: text("content"), // Extracted text content or summary
    securityLevel: text("security_level").notNull().default("standard"), // Clearance level: "standard", "sensitive", etc.
    lastIndexedAt: integer("last_indexed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(CURRENT_TIMESTAMP)`),
    metadata: text("metadata", { mode: "json" }), // Flexible JSON for unexpected fields like specific tags
});

export type InsertDocument = typeof documentsTable.$inferInsert;
export type SelectDocument = typeof documentsTable.$inferSelect;

// Nodes in the Knowledge Graph (Entities like Person, Company, Contract, Clause)
export const entitiesTable = sqliteTable("entities", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    type: text("type").notNull(), // e.g. "PERSON", "COMPANY", "CONTRACT", "CLAUSE"
    description: text("description"),
    sourceDocumentId: integer("source_document_id").references(() => documentsTable.id), // Link to origin document if applicable
    metadata: text("metadata", { mode: "json" }), // Additional structured info
});

export type InsertEntity = typeof entitiesTable.$inferInsert;
export type SelectEntity = typeof entitiesTable.$inferSelect;

// Edges in the Knowledge Graph (Relations)
export const relationsTable = sqliteTable("relations", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceEntityId: integer("source_entity_id").notNull().references(() => entitiesTable.id),
    targetEntityId: integer("target_entity_id").notNull().references(() => entitiesTable.id),
    type: text("type").notNull(), // e.g. "WORKS_AT", "SIGNED", "RESTRICTS", "EXPIRES_ON"
    description: text("description"),
    sourceDocumentId: integer("source_document_id").references(() => documentsTable.id), // Link to origin document if applicable
    properties: text("properties", { mode: "json" }), // Edge attributes like timeframe, specific conditions
});

export type InsertRelation = typeof relationsTable.$inferInsert;
export type SelectRelation = typeof relationsTable.$inferSelect;
