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

Once the database is populated with documents and their extracted information, the system can use a vector embedding to merge equivalent nodes (perhaps names are spelled slightly differently or with words in a slightly different order). This is done by computing the vector embedding of each node and then clustering the nodes based on their vector embeddings. 

Use [Orama](https://orama.com/product/vector-database) for the vector database framework.

## Autonomous Actions

The system can also take autonomous action on behalf of the user. In particular:

- Scope Checker: Intercepts slack messages from the user's employer, checks requested work against existing statement of work, and then notifies the user if the employer is asking them to do something outside the SOW or should otherwise cost extra.
- Invoice Checker: Checks that invoices are paid by cross-checking bank statements with invoices.
- Non-compete Checker: Checks for conflicts between current contracts and potential work offers.

