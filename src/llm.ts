import env from "@/env";
import { GoogleGenAI } from "@google/genai";
import { Ollama } from "ollama";
import type { PrivacyLevel } from "./types";

const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

const ollama = new Ollama({
  headers: { Authorization: "Bearer " + env.OLLAMA_API_KEY },
});

async function generateText(
  prompt: string,
  privacyLevel: PrivacyLevel,
): Promise<string> {
  if (privacyLevel === "PRIVATE") {
    const response = await ollama.chat({
      model: "gpt-oss:20b-cloud",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });
    return response.message.content;
  }

  // Default to PUBLIC/Gemini
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  const text = response.text;

  return text ?? "";
}

/**
 * Extracts entities and relations from a user query using Gemini.
 * @param query The user's natural language query.
 * @returns A list of potential entity names found in the query.
 */
export async function extractQueryEntities(
  query: string,
  privacyLevel: PrivacyLevel,
): Promise<string[]> {
  const prompt = `
    Extract the key entities (people, companies, contracts, clauses, etc.) from the following query.
    Return ONLY a JSON array of strings, where each string is an extracted entity name.
    Do not include any markdown formatting or explanation.

    Query: "${query}"
    `;

  try {
    const text = await generateText(prompt, privacyLevel);

    if (!text) return [];

    // Clean up potential markdown code blocks
    const jsonStr = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(jsonStr) as string[];
  } catch (e) {
    console.error("Failed to parse Gemini response for entity extraction", e);
    return [];
  }
}

const VALID_DOCUMENT_TYPES = [
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

/**
 * Classifies the document type based on its text content.
 * Types support autonomous actions: INVOICE/BANK_STATEMENT (Invoice Checker), SOW (Scope Checker), CONTRACT/OFFER (Non-compete Checker), SLACK_MESSAGE (Scope Checker).
 * @param text The text content of the document.
 * @returns The estimated document type.
 */
export async function classifyDocument(
  text: string,
  privacyLevel: PrivacyLevel,
): Promise<string> {
  const prompt = `
    Classify the following document into one of these types:
    - GENERIC
    - INVOICE
    - BANK_STATEMENT
    - CONTRACT
    - SOW (Statement of Work)
    - NDA (Non-Disclosure Agreement)
    - OFFER (Job Offer or work offer)
    - RECEIPT
    - SLACK_MESSAGE (message from employer requesting work)

    Return ONLY the type name (e.g. "INVOICE").
    If you are unsure or it doesn't fit specific categories, return "GENERIC".

    Document Preview:
    "${text.slice(0, 2000)}"
    `;

  try {
    const result = (await generateText(prompt, privacyLevel))
      .trim()
      .toUpperCase();
    if (
      result &&
      VALID_DOCUMENT_TYPES.includes(
        result as (typeof VALID_DOCUMENT_TYPES)[number],
      )
    ) {
      return result;
    }
    return "GENERIC";
  } catch (e) {
    console.error("Failed to classify document", e);
    return "GENERIC";
  }
}

/** Entity types used in the knowledge graph (Scope Checker, Invoice Checker, Non-compete Checker). */
const ENTITY_TYPE_LIST =
  "PERSON, COMPANY, PARTY, CONTRACT, SOW, CLAUSE, INVOICE, INVOICE_NUMBER, BANK_TRANSACTION, AMOUNT, DATE, DELIVERABLE, PAYMENT_TERM, OFFER, INDUSTRY, VENDOR, PAYEE, ROLE_OR_SERVICE, SLACK_MESSAGE";
/** Relation types used in the knowledge graph. */
const RELATION_TYPE_LIST =
  "WORKS_AT, SIGNED, RESTRICTS, CONTAINS, EXPIRES_ON, SUBSIDIARY_OF, ISSUED_BY, PAYABLE_TO, AMOUNT_OF, DUE_DATE, PAID_BY, MATCHES_TRANSACTION, PARTY_TO, DELIVERABLE_OF, IN_SCOPE, PAYMENT_TERMS_OF, RESTRICTS_INDUSTRY, RESTRICTS_COMPANY, CONFLICTS_WITH, EFFECTIVE_UNTIL";

/**
 * Extracts entities and relations from a document text chunk using canonical types for autonomous actions.
 * @param text The text chunk from the document.
 * @param documentType The type of the document (e.g. INVOICE, BANK_STATEMENT, SOW, CONTRACT, OFFER) to guide extraction.
 * @returns An object containing extracted entities and relations.
 */
export async function extractEntitiesAndRelations(
  text: string,
  documentType: string = "GENERIC",
  privacyLevel: PrivacyLevel,
): Promise<{
  entities: { name: string; type: string; description: string }[];
  relations: {
    source: string;
    target: string;
    type: string;
    description: string;
  }[];
}> {
  const prompt = `
    Analyze the following text from a ${documentType} document.
    Extract key entities and relations. Use ONLY these entity types: ${ENTITY_TYPE_LIST}
    Use ONLY these relation types: ${RELATION_TYPE_LIST}

    Document-type specific guidance:
    - INVOICE: Extract VENDOR, PAYEE, AMOUNT (total), DATE (due/issue), INVOICE_NUMBER. Use ISSUED_BY, PAYABLE_TO, AMOUNT_OF, DUE_DATE.
    - BANK_STATEMENT: Extract each transaction as BANK_TRANSACTION with PAYEE, AMOUNT, DATE. Use PAYABLE_TO, AMOUNT_OF for matching to invoices later.
    - SOW: Extract PARTY, DELIVERABLE, DATE (effective/end), PAYMENT_TERM. Use PARTY_TO, DELIVERABLE_OF, PAYMENT_TERMS_OF, EFFECTIVE_UNTIL.
    - CONTRACT/NDA: Extract PARTY, CLAUSE, DATE, INDUSTRY/COMPANY for restrictions. Use RESTRICTS_INDUSTRY, RESTRICTS_COMPANY, CONTAINS, EXPIRES_ON, EFFECTIVE_UNTIL.
    - OFFER: Extract COMPANY, PERSON, ROLE_OR_SERVICE, INDUSTRY. Use CONFLICTS_WITH when comparing to contracts.

    Return a JSON object with two arrays: "entities" and "relations". Use exact entity names as they appear so relations can link source/target by name.

    "entities": [ { "name": "Exact Name/Value", "type": "<one of the entity types above>", "description": "Brief description" } ]
    "relations": [ { "source": "Source Entity name", "target": "Target Entity name", "type": "<one of the relation types above>", "description": "Brief explanation" } ]

    Return ONLY the JSON. No markdown.

    Text:
    "${text}"
    `;

  try {
    const resultText = await generateText(prompt, privacyLevel);
    if (!resultText) return { entities: [], relations: [] };

    const jsonStr = resultText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const data = JSON.parse(jsonStr);

    return {
      entities: data.entities || [],
      relations: data.relations || [],
    };
  } catch (e) {
    console.error("Failed to extract entities and relations", e);
    return { entities: [], relations: [] };
  }
}

/** Document types that have structured metadata for autonomous actions. */
const METADATA_DOCUMENT_TYPES = [
  "INVOICE",
  "BANK_STATEMENT",
  "SOW",
  "CONTRACT",
  "OFFER",
] as const;

/**
 * Extracts type-specific structured metadata from document text for use by autonomous actions.
 * Invoice Checker uses invoice + bank statement metadata; Scope Checker uses SOW metadata; Non-compete Checker uses contract + offer metadata.
 * @param text Full document text.
 * @param documentType Classified document type.
 * @returns Structured metadata to store in document.metadata, or null if type has no schema.
 */
export async function extractStructuredMetadata(
  text: string,
  documentType: string,
  privacyLevel: PrivacyLevel,
): Promise<Record<string, unknown> | null> {
  if (
    !METADATA_DOCUMENT_TYPES.includes(
      documentType as (typeof METADATA_DOCUMENT_TYPES)[number],
    )
  ) {
    return null;
  }

  const prompts: Record<string, string> = {
    INVOICE: `Extract from this INVOICE document. Return JSON only: { "invoiceNumber": string or null, "vendor": string, "payee": string, "totalAmount": number, "currency": string, "dueDate": "YYYY-MM-DD", "issueDate": "YYYY-MM-DD" }. Use null for missing.`,
    BANK_STATEMENT: `Extract from this BANK_STATEMENT. Return JSON only: { "accountId": string, "periodStart": "YYYY-MM-DD", "periodEnd": "YYYY-MM-DD", "transactions": [ { "payee": string, "amount": number, "date": "YYYY-MM-DD", "description": string } ] }. Use null for missing.`,
    SOW: `Extract from this Statement of Work. Return JSON only: { "parties": string[], "effectiveDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "deliverables": string[], "paymentTerms": string, "scopeSummary": string }. Use null for missing.`,
    CONTRACT: `Extract from this CONTRACT. Return JSON only: { "parties": string[], "effectiveDate": "YYYY-MM-DD", "expirationDate": "YYYY-MM-DD", "restrictsIndustry": string[], "restrictsCompany": string[], "nonCompeteClauseSummary": string }. Use null for missing.`,
    OFFER: `Extract from this OFFER (job/work offer). Return JSON only: { "offeringParty": string, "roleOrService": string, "industry": string, "company": string, "effectiveDate": "YYYY-MM-DD" }. Use null for missing.`,
  };
  const prompt = `${prompts[documentType]}\n\nDocument:\n"${text.slice(0, 4000)}"`;

  try {
    const resultText = await generateText(prompt, privacyLevel);
    if (!resultText) return null;
    const jsonStr = resultText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const data = JSON.parse(jsonStr) as Record<string, unknown>;
    return data;
  } catch (e) {
    console.error("Failed to extract structured metadata", e);
    return null;
  }
}

/**
 * Takes a user query and graph context and synthesizes a natural language answer.
 * @param query The user's original question.
 * @param graphContext The knowledge graph context with nodes and edges.
 * @returns A natural language answer synthesized from the graph.
 */
export async function synthesizeAnswerFromGraph(
  query: string,
  graphContext: {
    nodes: { id: number; name: string; type: string }[];
    edges: { source: number; target: number; type: string }[];
  },
  privacyLevel: PrivacyLevel,
): Promise<string> {
  const contextStr = `
    Nodes:
    ${graphContext.nodes.map((n) => `- ${n.name} (Type: ${n.type}, ID: ${n.id})`).join("\n")}

    Edges:
    ${graphContext.edges
      .map((e) => {
        const sourceNode = graphContext.nodes.find((n) => n.id === e.source);
        const targetNode = graphContext.nodes.find((n) => n.id === e.target);
        return `- ${sourceNode?.name} -> ${e.type} -> ${targetNode?.name}`;
      })
      .join("\n")}
    `;

  const prompt = `
    Based on the following knowledge graph context, provide a concise, natural language answer to the user's query.
    Synthesize the information from the nodes and edges into a coherent response.
    Do not return the graph data, only the answer.

    User Query: "${query}"

    Knowledge Graph Context:
    ${contextStr}

    Answer:
    `;

  try {
    const text = await generateText(prompt, privacyLevel);
    return text.trim() ?? "I could not find an answer in the provided context.";
  } catch (e) {
    console.error("Failed to synthesize answer from graph", e);
    return "I encountered an error while trying to find an answer.";
  }
}
