# Seneshal: Autonomous Personal Chief of Staff

To run the project, use `just dev`. You'll need to have `just` installed (install it here: https://just.systems/). Then open the web app in your browser.

You'll need to provide a `.env` file with a schema matching that specified in `./src/env.ts`.

See [notes](notes/Index.md) for all design and implementation details.

The rest of this document gives an overview of the project.

## Introduction

For independent contractors, managing a multitude of contracts, constraints, and inter-document relationships is a complex and often overwhelming task. **Seneshal** is an autonomous "Personal Chief of Staff" designed to solve this problem. It provides a centralized, privacy-first knowledge bank that allows users to freely explore connections between their important documents while autonomously conducting online research to fill in knowledge gaps.

## Core Philosophy & Capabilities

Seneshal goes beyond simple document storage by creating a **structured representation** of the entities and relations mentioned within your data. It acts as both a comprehensive archive and an active researcher.

- **Ingestion:** Seneshal operates over multiple domains, ingesting text-based documents (PDFs, text files) and contextualizing them into specific types such as invoices, bank statements, contracts, Statements of Work (SOWs), NDAs, offers, receipts, emails, and Slack messages.
- **Hybrid Intelligence:** The system leverages Large Language Models (LLMs) for natural language understanding to extract structured data and identify connections between content.
- **External Saturation:** Recognizing the strict knowledge boundaries of LLMs, Seneshal uses **LinkUp** to bridge the gap between internal documents and public data. It explores beyond your private files to pull in public information (news, events, press releases) regarding the entities, companies, and people mentioned in your documents.

## Privacy-First Architecture

A critical feature of Seneshal is the strict delineation between public and private data to ensure security.

- **Private Data Handling:** Your private documents are **never** sent to external service providers. All private data is processed exclusively by local language models via the **Ollama** local language model manager.
- **Public Data Handling:** Data collected from public sources online can be processed by more powerful cloud-based language models.
- **Visual Delineation:** The system clearly distinguishes between public and private data nodes within the visual representation of your knowledge graph.

## The Knowledge Graph Engine

Seneshal utilizes a structured **Knowledge Graph** combined with vector embeddings, stored locally in memory and SQLite databases.

### Knowledge Graph vs. Vector Databases

While vector databases capture first-order relationships (semantic similarity), Seneshal’s knowledge graph captures **higher-order relationships**. This allows for the efficient traversal of relations that are not purely similarity-based. A single "jump" in the knowledge graph can connect data points that are semantically distant in a vector space, offering a much more powerful context for complex queries.

### Dual Memory Systems

- **Long-Term Memory:** The full structured graph represents every piece of data the user has ever submitted.
- **Short-Term Memory:** For running conversations, Seneshal focuses on specific subgraphs relevant to the immediate context, allowing for efficient and relevant interactions.

## Autonomous Recursive Research (The "Fixpoint")

Seneshal employs a multi-step workflow automation to "saturate" your knowledge base.

1. **Gap Detection:** The system automatically detects missing information based on uploaded documents or user queries. It identifies patterns implying blind spots in the current data.
2. **Recursive Fixpoint Loop:**

- Seneshal triggers a search using **LinkUp** to find missing info.
- This new data reveals more structure in the graph.
- The new structure enables more intelligent, targeted searches.
- This cycle repeats recursively until a "fixpoint" is reached—where the knowledge base is fully saturated based on available data.

3. **Goal Planning & Execution:** This process demonstrates goal planning, step-by-step execution, self-evaluation, and error handling. If a search branch yields no results (a dead end), the system accepts this as part of the fixpoint saturation.

## User Interface & Workflow

After uploading documents, the primary interface is a **Freeform Query** engine. When a user asks a question, Seneshal triggers a three-stage process:

1. **Subgraph Retrieval:** It identifies and retrieves the subgraph of the knowledge base most relevant to the query.
2. **Automated Enrichment:** It identifies missing information referenced in the query and triggers immediate automated searches to flush out the knowledge graph.
3. **Contextual Response:** Finally, it processes the original query, the generated response, and the focused graph context to suggest **follow-up queries**, driving deeper exploration of the data.
