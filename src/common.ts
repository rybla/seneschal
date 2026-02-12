// ----------------------------------------------------------------------------
// Document types
// ----------------------------------------------------------------------------

export const DOCUMENT_TYPES = [
  "GENERIC",
  "INVOICE",
  "BANK_STATEMENT",
  "CONTRACT",
  "SOW",
  "NDA",
  "OFFER",
  "RECEIPT",
  "SLACK_MESSAGE",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/**
 * Printed document types in natural language.
 */
export const PrintedDocumentTypes = {
  GENERIC: "document",
  INVOICE: "invoice",
  BANK_STATEMENT: "bank statement",
  CONTRACT: "contract",
  SOW: "sow",
  NDA: "nda",
  OFFER: "offer",
  RECEIPT: "receipt",
  SLACK_MESSAGE: "slack message",
} as const satisfies Record<DocumentType, string>;

// ----------------------------------------------------------------------------
// Entity types
// ----------------------------------------------------------------------------

/** Entity types for autonomous actions: Scope (SOW/deliverables), Invoice (invoices/transactions), Non-compete (contracts/offers). */
export const ENTITY_TYPES = [
  "PERSON",
  "COMPANY",
  "PARTY",
  "CONTRACT",
  "SOW",
  "CLAUSE",
  "INVOICE",
  "INVOICE_NUMBER",
  "BANK_TRANSACTION",
  "BANK_STATEMENT",
  "AMOUNT",
  "DATE",
  "DELIVERABLE",
  "PAYMENT_TERM",
  "OFFER",
  "INDUSTRY",
  "VENDOR",
  "PAYEE",
  "ROLE_OR_SERVICE",
  "SLACK_MESSAGE", // Requested work from employer (Scope Checker)
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

/**
 * Printed entity types in natural language.
 */
export const PrintedEntityTypes = {
  PERSON: "person",
  COMPANY: "company",
  PARTY: "party",
  CONTRACT: "contract",
  SOW: "sow",
  CLAUSE: "clause",
  INVOICE: "invoice",
  INVOICE_NUMBER: "invoice number",
  BANK_TRANSACTION: "bank transaction",
  AMOUNT: "amount",
  DATE: "date",
  DELIVERABLE: "deliverable",
  PAYMENT_TERM: "payment term",
  OFFER: "offer",
  INDUSTRY: "industry",
  VENDOR: "vendor",
  PAYEE: "payee",
  ROLE_OR_SERVICE: "role or service",
  SLACK_MESSAGE: "slack message",
  BANK_STATEMENT: "bank statement",
} as const satisfies Record<EntityType, string>;

// ----------------------------------------------------------------------------
// Relation types
// ----------------------------------------------------------------------------

/** Relation types for autonomous actions. */
export const RELATION_TYPES = [
  // General (Design doc)
  "WORKS_AT",
  "SIGNED",
  "RESTRICTS",
  "CONTAINS",
  "EXPIRES_ON",
  "SUBSIDIARY_OF",
  // Invoice Checker: link invoices to bank transactions
  "ISSUED_BY",
  "PAYABLE_TO",
  "AMOUNT_OF",
  "DUE_DATE",
  "PAID_BY", // bank transaction paid this invoice
  "MATCHES_TRANSACTION", // invoice matches bank transaction
  // SOW / Scope Checker: deliverables and scope
  "PARTY_TO",
  "DELIVERABLE_OF",
  "IN_SCOPE",
  "PAYMENT_TERMS_OF",
  // Non-compete Checker: restrictions and conflicts
  "RESTRICTS_INDUSTRY",
  "RESTRICTS_COMPANY",
  "CONFLICTS_WITH",
  "EFFECTIVE_UNTIL",
] as const;

export type RelationType = (typeof RELATION_TYPES)[number];

/**
 * Relation types printed in natural language.
 */
export const PrintedRelationTypes = {
  WORKS_AT: "works at",
  SIGNED: "signed",
  RESTRICTS: "restricts",
  CONTAINS: "contains",
  EXPIRES_ON: "expires on",
  SUBSIDIARY_OF: "subsidiary of",
  ISSUED_BY: "issued by",
  PAYABLE_TO: "payable to",
  AMOUNT_OF: "amount of",
  DUE_DATE: "due date",
  PAID_BY: "paid by",
  MATCHES_TRANSACTION: "matches transaction",
  PARTY_TO: "party to",
  DELIVERABLE_OF: "deliverable of",
  IN_SCOPE: "in scope",
  PAYMENT_TERMS_OF: "payment terms of",
  RESTRICTS_INDUSTRY: "restricts industry",
  RESTRICTS_COMPANY: "restricts company",
  CONFLICTS_WITH: "conflicts with",
  EFFECTIVE_UNTIL: "effective until",
} as const satisfies Record<RelationType, string>;

// ----------------------------------------------------------------------------
// Privacy Level
// ----------------------------------------------------------------------------

export const PRIVACY_LEVELS = ["PUBLIC", "PRIVATE"] as const;

export type PrivacyLevel = (typeof PRIVACY_LEVELS)[number];

/**
 * Privacy levels printed in natural language.
 */
export const PrintedPrivacyLevels = {
  PUBLIC: "public",
  PRIVATE: "private",
} as const satisfies Record<PrivacyLevel, string>;

// ----------------------------------------------------------------------------
// Source Type
// ----------------------------------------------------------------------------

export const SOURCE_TYPES = ["USER", "SEARCH"] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

/**
 * Source types printed in natural language.
 */
export const PrintedSourceTypes = {
  USER: "user",
  SEARCH: "search",
} as const satisfies Record<SourceType, string>;
