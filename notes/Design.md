# Design of Seneschal

An autonomous Personal Chief of Staff for freelancers.

This is the strongest use case for the "Privacy-First" constraint. Users have highly sensitive local data (contracts, tax forms, bank statements) they never want to upload to the cloud, but they struggle to track obligations across them. A freelancer or consultant has a complex web of NDAs, SOWs (Statements of Work), and invoices. 

This system indexes all of your important documents locally and automatically discover higher-order relationships between them. The user can query the system with natural-language questions like "Which clauses in my active contracts prevent me from accepting this new offer from Competitor X?" and the system will find the relationships embedded in their documents to produce a logical response "You cannot work for Competitor X because of the interaction of clause Y1 in contract Z1 and clause Y2 in contract Z2". The index also stores useful structured information about all your documents and how they relate, such as non-competes, time-frames, etc. Since the data is stored in a database with links to document text, the metadata of these documents can be updated over time, such as marking a contract as no longer active or only considering some documents as potential future statements of work rather than currently active.

## Knowledge Graph

In the knowledge graph, nodes are nouns and edges are relations between nouns. For example, nodes are companies, people, companies, topics/industries, parties, products, contracts, clauses etc. And edges contain detailed information about relations of the form for example: 

- "{person} works at {company}"
- "{company} provides {service}"
- "{party} signed {contract}"
- "{contract} restricts working in {topic/industry}"
- "{contract} contains {clause}"
- "{clause} expires on {date}"
- "{party} is subsidiary of {party}"

The knowledge graph is first built by extracting information from documents. Then the knowledge graph is saturated by using a vector embedding to merge equivalent nodes (perhaps names are spelled slightly differently or with words in a slightly different order).

During conversations, a conversation-specific knowledge graph is maintained that keeps track of local references that the user is talked about and exploring, but doesn't want to commit new information theto the persistent database.

## Privacy

The system is private since it builds this relational index and queries it only locally. There can be explicit clearance levels for certain documents to ensure that external queried never leak info about them. This protocol is formally specified and actively enforced by a rich typed encoding of the domain as well as runtime assertions.

## Workflows

### Document Ingestion

1. User uploads a PDF document. It is saved to a local directory.
2. System extracts text from the document using pdf-parse.
3. System extracts entities and relations from the text.
4. System stores the document and its extracted information in the database.

### Database Node Merging

1. System computes vector embeddings for each node in the knowledge graph.
2. System clusters nodes based on their vector embeddings to identify equivalent entities (e.g., names with different spellings or word orders).
3. System merges equivalent nodes to consolidate the graph while preserving all existing relations.

### Database Saturation

1. Analyze the database for missing information. In particular, instances of relations that are missing for some key entities that are involved in many other relations.
2. Group these missing relations by involved entity.
3. For each group of missing relations, use LinkUp agentic search (demonstrated in `./scripts/test_linkup.ts`) to find that missing information. Extract the results similarly to ingesting new documents and insert the new information into the database.

### User Query

1. User submits a query.
2. System extracts entities and relations from the query using an LLM.
3. System queries the knowledge graph for all relevant information within a certain radius of the query entities (in terms of graph distance)
4. System generates a structured response that summarizes all the information, so it can be rendered in the UI with a certain degree of interactivity and structured formatting.

## Autonomous Actions

The system can also take autonomous action on behalf of the user. In particular:

- Scope Checker: Intercepts slack messages from the user's employer, checks requested work against existing statement of work, and then notifies the user if the employer is asking them to do something outside the SOW or should otherwise cost extra.
- Invoice Checker: Checks that invoices are paid by cross-checking bank statements with invoices.
- Non-compete Checker: Checks for conflicts between current contracts and potential work offers.

## Frontend

The frontend is a single page application. The main view is a dashboard with the following sections:

- A search bar to query the knowledge graph (using the `/api/query` endpoint). Upon success, the structured results are rendered below the search bar in a structured way that allows the user to explore the knowledge graph interactively.
- A list of documents that have been uploaded to the system. This list is updated in real-time as documents are uploaded.
- A list of entities that have been extracted from the documents. This list is updated in real-time as documents are uploaded.
- A list of relations that have been extracted from the documents. This list is updated in real-time as documents are uploaded.
- A list of workflows that can be run on the system. Each workflow, when clicked, opens a modal that allows the user to enter the parameters of the workflow and a submit button to run the workflow.
