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
  securityLevel: text("security_level").notNull().default("standard"), // Clearance level: "standard", "sensitive", etc.
  privacyLevel: text("privacy_level", { enum: ["PUBLIC", "PRIVATE"] })
    .notNull()
    .default("PRIVATE"),
  lastIndexedAt: integer("last_indexed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(CURRENT_TIMESTAMP)`,
  ),
  metadata: text("metadata", { mode: "json" }), // Type-specific structured data (see DocumentMetadataByType)
});

/** Document types. SLACK_MESSAGE used by Scope Checker for intercepted employer messages. */
export const DOCUMENT_TYPES = {
  GENERIC: "GENERIC",
  INVOICE: "INVOICE",
  BANK_STATEMENT: "BANK_STATEMENT",
  CONTRACT: "CONTRACT",
  SOW: "SOW",
  NDA: "NDA",
  OFFER: "OFFER",
  RECEIPT: "RECEIPT",
  SLACK_MESSAGE: "SLACK_MESSAGE",
} as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];

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
  type: text("type").notNull(), // Use ENTITY_TYPES
  description: text("description"),
  privacyLevel: text("privacy_level", { enum: ["PUBLIC", "PRIVATE"] })
    .notNull()
    .default("PRIVATE"),
  sourceDocumentId: integer("source_document_id").references(
    () => documentsTable.id,
  ),
  metadata: text("metadata", { mode: "json" }), // e.g. amount, date for AMOUNT/DATE/BANK_TRANSACTION
});

/** Entity types for autonomous actions: Scope (SOW/deliverables), Invoice (invoices/transactions), Non-compete (contracts/offers). */
export const ENTITY_TYPES = {
  PERSON: "PERSON",
  COMPANY: "COMPANY",
  PARTY: "PARTY",
  CONTRACT: "CONTRACT",
  SOW: "SOW",
  CLAUSE: "CLAUSE",
  INVOICE: "INVOICE",
  INVOICE_NUMBER: "INVOICE_NUMBER",
  BANK_TRANSACTION: "BANK_TRANSACTION",
  AMOUNT: "AMOUNT",
  DATE: "DATE",
  DELIVERABLE: "DELIVERABLE",
  PAYMENT_TERM: "PAYMENT_TERM",
  OFFER: "OFFER",
  INDUSTRY: "INDUSTRY",
  VENDOR: "VENDOR",
  PAYEE: "PAYEE",
  ROLE_OR_SERVICE: "ROLE_OR_SERVICE",
  SLACK_MESSAGE: "SLACK_MESSAGE", // Requested work from employer (Scope Checker)
} as const;

export type EntityType = (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES];

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
  type: text("type").notNull(), // Use RELATION_TYPES
  description: text("description"),
  privacyLevel: text("privacy_level", { enum: ["PUBLIC", "PRIVATE"] })
    .notNull()
    .default("PRIVATE"),
  sourceDocumentId: integer("source_document_id").references(
    () => documentsTable.id,
  ),
  properties: text("properties", { mode: "json" }), // e.g. amount, date for PAID_BY
});

/** Relation types for autonomous actions. */
export const RELATION_TYPES = {
  // General (Design doc)
  WORKS_AT: "WORKS_AT",
  SIGNED: "SIGNED",
  RESTRICTS: "RESTRICTS",
  CONTAINS: "CONTAINS",
  EXPIRES_ON: "EXPIRES_ON",
  SUBSIDIARY_OF: "SUBSIDIARY_OF",
  // Invoice Checker: link invoices to bank transactions
  ISSUED_BY: "ISSUED_BY",
  PAYABLE_TO: "PAYABLE_TO",
  AMOUNT_OF: "AMOUNT_OF",
  DUE_DATE: "DUE_DATE",
  PAID_BY: "PAID_BY", // bank transaction paid this invoice
  MATCHES_TRANSACTION: "MATCHES_TRANSACTION", // invoice matches bank transaction
  // SOW / Scope Checker: deliverables and scope
  PARTY_TO: "PARTY_TO",
  DELIVERABLE_OF: "DELIVERABLE_OF",
  IN_SCOPE: "IN_SCOPE",
  PAYMENT_TERMS_OF: "PAYMENT_TERMS_OF",
  // Non-compete Checker: restrictions and conflicts
  RESTRICTS_INDUSTRY: "RESTRICTS_INDUSTRY",
  RESTRICTS_COMPANY: "RESTRICTS_COMPANY",
  CONFLICTS_WITH: "CONFLICTS_WITH",
  EFFECTIVE_UNTIL: "EFFECTIVE_UNTIL",
} as const;

export type RelationType = (typeof RELATION_TYPES)[keyof typeof RELATION_TYPES];

export type InsertRelation = typeof relationsTable.$inferInsert;
export type SelectRelation = typeof relationsTable.$inferSelect;
