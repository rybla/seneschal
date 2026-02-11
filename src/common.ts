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
];

export type RelationType = (typeof RELATION_TYPES)[number];

// ----------------------------------------------------------------------------
// Privacy Level
// ----------------------------------------------------------------------------

export const PRIVACY_LEVELS = ["PUBLIC", "PRIVATE"] as const;

export type PrivacyLevel = (typeof PRIVACY_LEVELS)[number];

// ----------------------------------------------------------------------------
// Source Type
// ----------------------------------------------------------------------------

export const SOURCE_TYPES = ["USER", "SEARCH"] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];
