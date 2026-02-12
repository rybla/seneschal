import {
  ENTITY_TYPES,
  PRIVACY_LEVELS,
  RELATION_TYPES,
  SOURCE_TYPES,
} from "@/common";
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Table to store metadata and content reference for local files (contracts, statements, etc.)
export const documentsTable = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  path: text("path").notNull().unique(), // Absolute path to the file
  hash: text("hash"), // Checksum for change detection
  title: text("title"),
  content: text("content"), // Extracted text content or summary
  type: text("type").notNull().default("GENERIC"), // e.g. "INVOICE", "BANK_STATEMENT", "CONTRACT"
  privacyLevel: text("privacy_level", { enum: PRIVACY_LEVELS })
    .notNull()
    .default("PRIVATE"),
  sourceType: text("source_type", { enum: SOURCE_TYPES })
    .notNull()
    .default("USER"),
  lastIndexedAt: integer("last_indexed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
});

export type InsertDocument = typeof documentsTable.$inferInsert;
export type SelectDocument = typeof documentsTable.$inferSelect;

// Nodes in the Knowledge Graph (Entities). Types support Scope Checker, Invoice Checker, Non-compete Checker.
export const entitiesTable = sqliteTable("entities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", { enum: ENTITY_TYPES }).notNull(),
  description: text("description"),
  privacyLevel: text("privacy_level", { enum: PRIVACY_LEVELS })
    .notNull()
    .default("PRIVATE"),
  sourceType: text("source_type", { enum: SOURCE_TYPES })
    .notNull()
    .default("USER"),
  sourceDocumentId: integer("source_document_id").references(
    () => documentsTable.id,
  ),
});

export type InsertEntity = typeof entitiesTable.$inferInsert;
export type SelectEntity = typeof entitiesTable.$inferSelect;

// Edges in the Knowledge Graph (Relations). Types support cross-document checks (e.g. PAID_BY, CONFLICTS_WITH).
export const relationsTable = sqliteTable("relations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceEntityId: integer("source_entity_id")
    .notNull()
    .references(() => entitiesTable.id),
  targetEntityId: integer("target_entity_id")
    .notNull()
    .references(() => entitiesTable.id),
  type: text("type", { enum: RELATION_TYPES }).notNull(),
  description: text("description"),
  privacyLevel: text("privacy_level", { enum: PRIVACY_LEVELS })
    .notNull()
    .default("PRIVATE"),
  sourceType: text("source_type", { enum: SOURCE_TYPES })
    .notNull()
    .default("USER"),
  sourceDocumentId: integer("source_document_id").references(
    () => documentsTable.id,
  ),
  properties: text("properties", { mode: "json" }), // e.g. amount, date for PAID_BY
});

export type InsertRelation = typeof relationsTable.$inferInsert;
export type SelectRelation = typeof relationsTable.$inferSelect;
