import type {
  DocumentType,
  EntityType,
  PrivacyLevel,
  RelationType,
} from "@/common";
import {
  ENTITY_TYPES,
  PrintedEntityTypes,
  PrintedRelationTypes,
  RELATION_TYPES,
  DOCUMENT_TYPES as VALID_DOCUMENT_TYPES,
} from "@/common";
import env from "@/env";
import { GoogleGenAI } from "@google/genai";
import { Ollama } from "ollama";
import { toJsonSchema } from "./utility";
import z from "zod";
import { ALWAYS_PUBLIC_LLM } from "./config";

/**
 * Public LLM client for use ONLY with Public data.
 */
const publicClient = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

/**
 * Private LLM client for use with either Public or Private data.
 */
const privateClient = new Ollama({
  headers: { Authorization: "Bearer " + env.OLLAMA_API_KEY },
});

/**
 * Generates text using the appropriate LLM client based on privacy level.
 * @param prompt The prompt to use for text generation.
 * @param privacyLevel The privacy level of the data.
 * @returns The generated text.
 */
async function generateText(
  prompt: string,
  privacyLevel: PrivacyLevel,
): Promise<string> {
  if (privacyLevel === "PRIVATE" && !ALWAYS_PUBLIC_LLM) {
    const response = await privateClient.chat({
      model: env.OLLAMA_MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });
    return response.message.content;
  } else {
    // Default to PUBLIC/Gemini
    const response = await publicClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const text = response.text;

    return text ?? "";
  }
}

async function generateJson<T>(
  prompt: string,
  privacyLevel: PrivacyLevel,
  schema: z.ZodType<T>,
): Promise<T> {
  if (privacyLevel === "PRIVATE" && !ALWAYS_PUBLIC_LLM) {
    const response = await privateClient.chat({
      model: env.OLLAMA_MODEL,
      format: toJsonSchema(schema),
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });
    console.log(`generateJson response:\n\n${response.message.content}\n\n`);
    return schema.parse(JSON.parse(response.message.content));
  } else {
    // Default to PUBLIC/Gemini
    const response = await publicClient.models.generateContent({
      model: "gemini-2.0-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: toJsonSchema(schema),
      },
      contents: prompt,
    });
    return schema.parse(JSON.parse(response.text ?? "{}"));
  }
}

// async function generateAnyJson(
//   prompt: string,
//   privacyLevel: PrivacyLevel,
// ): Promise<Record<string, unknown>> {
//   if (privacyLevel === "PRIVATE" && !ALWAYS_PUBLIC_LLM) {
//     const response = await privateClient.chat({
//       model: env.OLLAMA_MODEL,
//       format: "json",
//       messages: [
//         {
//           role: "user",
//           content: prompt,
//         },
//       ],
//     });
//     console.log(`generateJson response:\n\n${response.message.content}\n\n`);
//     return JSON.parse(response.message.content);
//   } else {
//     // Default to PUBLIC/Gemini
//     const response = await publicClient.models.generateContent({
//       model: "gemini-2.0-flash",
//       config: {
//         responseMimeType: "application/json",
//       },
//       contents: prompt,
//     });
//     return JSON.parse(response.text ?? "{}");
//   }
// }

/**
 * Extracts entities and relations from a user query using Gemini.
 * @param query The user's natural language query.
 * @returns A list of potential entity names found in the query.
 */
export async function extractQueryEntities(
  query: string,
  privacyLevel: PrivacyLevel,
): Promise<
  { entityName: string; entityType: EntityType; entityDescription: string }[]
> {
  try {
    const prompt = `
Extract the key entities (${ENTITY_TYPES.join(", ")}) from the following query.
Return ONLY a list of the entity names and short descriptions in the following format:

- <entity_name>: <entity_type> - <entity_description>
- <entity_name>: <entity_type> - <entity_description>
- ...

Query: "${query}"
`;
    const text = await generateText(prompt, privacyLevel);
    if (!text) return [];
    return generateJson(
      `Extract the details of entities and relations from the following text: ${text}`,
      privacyLevel,
      z.array(
        z.object({
          entityName: z.string(),
          entityType: z.enum(ENTITY_TYPES).describe("The type of the entity"),
          entityDescription: z.string(),
        }),
      ),
    );
  } catch (e) {
    console.error("Failed to parse LLM response for entity extraction", e);
    return [];
  }
}

// VALID_DOCUMENT_TYPES imported from @/common

/**
 * Classifies the document type based on its text content.
 * Types support autonomous actions: INVOICE/BANK_STATEMENT (Invoice Checker), SOW (Scope Checker), CONTRACT/OFFER (Non-compete Checker), SLACK_MESSAGE (Scope Checker).
 * @param text The text content of the document.
 * @returns The estimated document type.
 */
export async function classifyDocument(
  text: string,
  privacyLevel: PrivacyLevel,
): Promise<DocumentType> {
  try {
    const prompt = `
Classify the following document into one of these types:

${VALID_DOCUMENT_TYPES.map((t) => `    - ${t}`).join("\n")}

Return ONLY the type name (e.g. "INVOICE").
If you are unsure or it doesn't fit specific categories, return "GENERIC".

Document Preview:

${text.slice(0, 2000)}
`.trim();
    const { documentType } = await generateJson(
      prompt,
      privacyLevel,
      z.object({
        confidence: z
          .number()
          .describe("Confidence level on a scale from 1 to 100"),
        documentType: z.enum(VALID_DOCUMENT_TYPES),
      }),
    );
    return documentType;
  } catch (error) {
    console.error(
      "Failed to parse LLM response for document classification",
      error,
    );
    return "GENERIC";
  }
}

/** Entity types used in the knowledge graph (Scope Checker, Invoice Checker, Non-compete Checker). */
const ENTITY_TYPE_LIST = ENTITY_TYPES.join(", ");
/** Relation types used in the knowledge graph. */
const RELATION_TYPE_LIST = RELATION_TYPES.join(", ");

/**
 * Extracts entities and relations from a document text chunk using canonical types for autonomous actions.
 * @param entireDocumentText The entire document text.
 * @param text The text chunk from the document.
 * @param documentType The type of the document (e.g. INVOICE, BANK_STATEMENT, SOW, CONTRACT, OFFER) to guide extraction.
 * @returns An object containing extracted entities and relations.
 */
export async function extractEntitiesAndRelations(
  text: string,
  documentType: DocumentType = "GENERIC",
  privacyLevel: PrivacyLevel,
): Promise<{
  entities: { name: string; type: EntityType; description: string }[];
  relations: {
    source: string;
    target: string;
    type: RelationType;
    description: string;
  }[];
}> {
  try {
    const prompt = `
Analyze the following ${documentType} document.
Extract key entities and relations. Use ONLY these entity types: ${ENTITY_TYPE_LIST}
Use ONLY these relation types: ${RELATION_TYPE_LIST}

${(() => {
  switch (documentType) {
    case "INVOICE":
      return "Extract VENDOR, PAYEE, AMOUNT (total), DATE (due/issue), INVOICE_NUMBER. Use ISSUED_BY, PAYABLE_TO, AMOUNT_OF, DUE_DATE.";
    case "BANK_STATEMENT":
      return "Extract each transaction as BANK_TRANSACTION with PAYEE, AMOUNT, DATE. Use PAYABLE_TO, AMOUNT_OF for matching to invoices later.";
    case "SOW":
      return "Extract PARTY, DELIVERABLE, DATE (effective/end), PAYMENT_TERM. Use PARTY_TO, DELIVERABLE_OF, PAYMENT_TERMS_OF, EFFECTIVE_UNTIL.";
    case "CONTRACT":
    case "NDA":
      return "Extract PARTY, CLAUSE, DATE, INDUSTRY/COMPANY for restrictions. Use RESTRICTS_INDUSTRY, RESTRICTS_COMPANY, CONTAINS, EXPIRES_ON, EFFECTIVE_UNTIL.";
    case "OFFER":
      return "Extract COMPANY, PERSON, ROLE_OR_SERVICE, INDUSTRY. Use CONFLICTS_WITH when comparing to contracts.";
    default:
      return "";
  }
})()}

Your response should have two sections. The first section should be called "Entities" and contain just a list of entity names, their types, and a brief description. The second section should be called "Relations" and contain just a list of relations with their source entity name, target entity name, relation type, and a brief description of the evidence for the relation.

For example, here's a template for the response:

Entities:

- <entity_name>: <entity_type> - <description>
- <entity_name>: <entity_type> - <description>
- ...

Relations:
- <source_entity_name> <relation_type> <target_entity_name>: <description>
- <source_entity_name> <relation_type> <target_entity_name>: <description>
- ...

Important notes:
- Entity types are ${ENTITY_TYPE_LIST}
- Relation types are ${RELATION_TYPE_LIST}
- If you are unsure about the type of an entity or relation, use the GENERIC type.
- ALWAYS refer to entities by their FULL NAME. NEVER use pronouns.

The document text is:

${text}
  `.trim();
    const resultText = await generateText(prompt, privacyLevel);
    if (!resultText) return { entities: [], relations: [] };
    return generateJson(
      `Extract the details of entities and relations from the following text: ${resultText}`,
      privacyLevel,
      z.object({
        entities: z.array(
          z.object({
            name: z.string(),
            type: z.enum(ENTITY_TYPES),
            description: z.string(),
          }),
        ),
        relations: z.array(
          z.object({
            source: z.string(),
            target: z.string(),
            type: z.enum(RELATION_TYPES),
            description: z.string(),
          }),
        ),
      }),
    );
  } catch (e) {
    console.error("Failed to extract entities and relations", e);
    return { entities: [], relations: [] };
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
    nodes: { id: number; name: string; type: EntityType }[];
    edges: { source: number; target: number; type: RelationType }[];
  },
  privacyLevel: PrivacyLevel,
): Promise<string> {
  const contextStr = `
    Nodes:
    ${graphContext.nodes.map((n) => `- ${n.name} (Type: ${PrintedEntityTypes[n.type]}, ID: ${n.id})`).join("\n")}

    Edges:
    ${graphContext.edges
      .map((e) => {
        const sourceNode = graphContext.nodes.find((n) => n.id === e.source);
        const targetNode = graphContext.nodes.find((n) => n.id === e.target);
        return `- ${sourceNode?.name} -> ${PrintedRelationTypes[e.type]} -> ${targetNode?.name}`;
      })
      .join("\n")}
    `;

  const prompt = `
Using the knowledge graph data as helpful context, write a natural language answer to the user's query.
Synthesize the information from the nodes and edges into a coherent response.
Do not return the graph data, only the answer.

Knowledge Graph Context:
${contextStr}

User Query: "${query}"
`.trim();

  try {
    const text = await generateText(prompt, privacyLevel);
    return text.trim() ?? "I could not find an answer in the provided context.";
  } catch (e) {
    console.error("Failed to synthesize answer from graph", e);
    return "I encountered an error while trying to find an answer.";
  }
}

/**
 * Generates a list of suggested follow-up queries based on the current search context.
 * @param query The user's original query.
 * @param graphData The graph data returned for the query.
 * @param answer The synthesized answer.
 * @param privacyLevel The privacy level of the query.
 * @returns A list of suggested follow-up queries.
 */
export async function generateSuggestedQueries(
  query: string,
  graphData: {
    nodes: { id: number; name: string; type: EntityType }[];
    edges: { source: number; target: number; type: RelationType }[];
  },
  answer: string,
  privacyLevel: PrivacyLevel,
): Promise<{ label: string; prompt: string }[]> {
  try {
    const contextStr = `
Nodes:
${graphData.nodes.map((n) => `- ${n.name} (Type: ${PrintedEntityTypes[n.type]}, ID: ${n.id})`).join("\n")}

Edges:
${graphData.edges
  .map((e) => {
    const sourceNode = graphData.nodes.find((n) => n.id === e.source);
    const targetNode = graphData.nodes.find((n) => n.id === e.target);
    return `- ${sourceNode?.name} -> ${PrintedRelationTypes[e.type]} -> ${targetNode?.name}`;
  })
  .join("\n")}
`.trim();

    const prompt = `
Based on the following context (original query, graph data, and answer), generate a list of 3-5 suggested follow-up queries.
These queries should help the user explore the knowledge graph further.

The suggested queries MUST follow one of these formats:
- "Research more about {entity}"
- "Research more about {relation} involving {entity}"
- "Find connections between {entity1} and {entity2} involving {relation}"
- "Find connections between {entity1} and {entity2}"
- "Research more about {relation} involving {entity1} and {entity2}"

Original Query: "${query}"

Answer: "${answer}"

Graph Data:
${contextStr}

Return the suggestions as a JSON list of objects with "label" (short summary for UI) and "prompt" (full query text).
The "label" should be very short, e.g. "Research {entity}" or "Connect {entity1} & {entity2}".
`.trim();

    const result = await generateJson(
      prompt,
      privacyLevel,
      z.object({
        suggestions: z.array(
          z.object({
            label: z.string().describe("Short summary for UI"),
            prompt: z.string().describe("Full query text"),
          }),
        ),
      }),
    );

    return result.suggestions;
  } catch (e) {
    console.error("Failed to generate follow-up queries", e);
    return [];
  }
}
