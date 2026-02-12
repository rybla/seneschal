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
  metadata: text("metadata", { mode: "json" }), // Type-specific structured data (see DocumentMetadataByType)
});

/** Structured metadata for INVOICE (Invoice Checker: cross-check with bank statements). */
export interface InvoiceMetadata {
  invoiceNumber?: string;
  vendor?: string;
  payee?: string;
  totalAmount?: number;
  currency?: string;
  dueDate?: string; // ISO date
  issueDate?: string;
}

/** Structured metadata for BANK_STATEMENT (Invoice Checker: match transactions to invoices). */
export interface BankStatementMetadata {
  accountId?: string;
  periodStart?: string;
  periodEnd?: string;
  transactions?: Array<{
    payee?: string;
    amount?: number;
    date?: string;
    description?: string;
  }>;
}

/** Structured metadata for SOW (Scope Checker: compare requested work to deliverables). */
export interface SOWMetadata {
  parties?: string[];
  effectiveDate?: string;
  endDate?: string;
  deliverables?: string[];
  paymentTerms?: string;
  scopeSummary?: string;
}

/** Structured metadata for CONTRACT (Non-compete Checker: restrictions and validity). */
export interface ContractMetadata {
  parties?: string[];
  effectiveDate?: string;
  expirationDate?: string;
  restrictsIndustry?: string[];
  restrictsCompany?: string[];
  nonCompeteClauseSummary?: string;
}

/** Structured metadata for OFFER (Non-compete Checker: conflict with existing contracts). */
export interface OfferMetadata {
  offeringParty?: string;
  roleOrService?: string;
  industry?: string;
  company?: string;
  effectiveDate?: string;
}

export type DocumentMetadataByType =
  | InvoiceMetadata
  | BankStatementMetadata
  | SOWMetadata
  | ContractMetadata
  | OfferMetadata
  | Record<string, unknown>;

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
  metadata: text("metadata", { mode: "json" }), // e.g. amount, date for AMOUNT/DATE/BANK_TRANSACTION
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
