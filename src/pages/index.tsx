import React, { useState, useEffect, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import {
  fetchDocuments,
  fetchEntities,
  fetchRelations,
  uploadDocument,
  mergeNodes,
  queryGraph,
  saturateDatabase,
} from "./api";
import type { Document, Entity, Relation, GraphData } from "./types";

// --- Components ---

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

function Button({
  onClick,
  children,
  variant = "primary",
  disabled = false,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  return (
    <button
      className={`btn ${variant === "secondary" ? "secondary" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "rgba(99, 102, 241, 0.1)",
        color: "#a5b4fc",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontFamily: "var(--font-mono)",
        border: "1px solid rgba(99, 102, 241, 0.2)",
      }}
    >
      {children}
    </span>
  );
}

// --- Sections ---

function SearchSection() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GraphData | null>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const result = await queryGraph(query);
      setData(result);
    } catch (err) {
      console.error(err);
      alert("Search failed: " + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2>Knowledge Graph Explorer</h2>
      <form
        onSubmit={handleSearch}
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "2rem",
          marginTop: "1rem",
        }}
      >
        <input
          type="text"
          placeholder="Ask a question..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </Button>
      </form>

      {data ? (
        <Card className="graph-viz">
          {data.nodes.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center" }}>
              <p>No results found for your query.</p>
            </div>
          ) : (
            <div
              style={{
                padding: "1rem",
                width: "100%",
                height: "100%",
                overflow: "auto",
              }}
            >
              <h4 style={{ marginBottom: "1rem" }}>
                Found {data.nodes.length} Nodes, {data.edges.length} Edges
              </h4>
              <ul className="data-list">
                {data.nodes.map((node) => (
                  <li key={node.id} className="list-item">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <strong>{node.name}</strong>
                      <Badge>{node.type}</Badge>
                    </div>
                    {node.description && (
                      <span style={{ marginTop: "0.5rem" }}>
                        {node.description}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      ) : (
        <div className="graph-viz">
          <p>Graph visualization will appear here</p>
        </div>
      )}
    </section>
  );
}

function DataLists() {
  const [activeTab, setActiveTab] = useState<
    "documents" | "entities" | "relations"
  >("documents");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);

  // Expose fetch data to parent or use internal state
  // Simplification: We fetch here.

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Auto-refresh
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Parallel fetch
      const [docs, ents, rels] = await Promise.all([
        fetchDocuments(),
        fetchEntities(),
        fetchRelations(),
      ]);
      setDocuments(docs);
      setEntities(ents);
      setRelations(rels);
    } catch (e) {
      console.error("Failed to fetch lists", e);
    }
  };

  return (
    <Card>
      <div className="tabs">
        <button
          className={`tab ${activeTab === "documents" ? "active" : ""}`}
          onClick={() => setActiveTab("documents")}
        >
          Documents ({documents.length})
        </button>
        <button
          className={`tab ${activeTab === "entities" ? "active" : ""}`}
          onClick={() => setActiveTab("entities")}
        >
          Entities ({entities.length})
        </button>
        <button
          className={`tab ${activeTab === "relations" ? "active" : ""}`}
          onClick={() => setActiveTab("relations")}
        >
          Relations ({relations.length})
        </button>
      </div>

      <ul className="data-list">
        {activeTab === "documents" &&
          documents.map((doc) => (
            <li key={doc.id} className="list-item">
              <h4>{doc.title}</h4>
              <span>
                {new Date(doc.createdAt).toLocaleDateString()} •{" "}
                {doc.securityLevel}
              </span>
            </li>
          ))}
        {activeTab === "entities" &&
          entities.map((ent) => (
            <li key={ent.id} className="list-item">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h4>{ent.name}</h4>
                <Badge>{ent.type}</Badge>
              </div>
              <span>{ent.description}</span>
            </li>
          ))}
        {activeTab === "relations" &&
          relations.map((rel) => (
            <li key={rel.id} className="list-item">
              <h4>{rel.type}</h4>
              <span>
                Source: {rel.sourceEntityId} → Target: {rel.targetEntityId}
              </span>
              <span>{rel.description}</span>
            </li>
          ))}

        {((activeTab === "documents" && documents.length === 0) ||
          (activeTab === "entities" && entities.length === 0) ||
          (activeTab === "relations" && relations.length === 0)) && (
          <p style={{ textAlign: "center", padding: "2rem" }}>No items found</p>
        )}
      </ul>
    </Card>
  );
}

function IngestModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      await uploadDocument(file);
      alert("Document uploaded successfully!");
      onClose();
    } catch (e) {
      alert("Upload failed");
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Ingest Document</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {/* File Input Area */}
          <div
            style={{
              marginBottom: "1.5rem",
              border: "2px dashed var(--card-border)",
              padding: "2rem",
              borderRadius: "8px",
              textAlign: "center",
              cursor: "pointer",
              background: "rgba(255,255,255,0.02)",
            }}
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ display: "none" }}
              id="file-upload"
            />
            <p style={{ color: "var(--text-main)", marginBottom: "0.5rem" }}>
              {file ? file.name : "Click to select PDF"}
            </p>
            {!file && <p style={{ fontSize: "0.8rem" }}>Supports PDF only</p>}
          </div>

          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}
          >
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={!file || uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WorkflowSection() {
  const [showIngest, setShowIngest] = useState(false);

  const [merging, setMerging] = useState(false);

  const [saturating, setSaturating] = useState(false);

  const handleMerge = async () => {
    if (!confirm("Are you sure you want to merge duplicate nodes?")) return;

    setMerging(true);

    try {
      const result = await mergeNodes();

      alert(`Merged ${result.mergedCount} pairs successfully.`);
    } catch {
      alert("Merge failed");
    } finally {
      setMerging(false);
    }
  };

  const handleSaturate = async () => {
    if (
      !confirm(
        "Are you sure you want to saturate the database? This may use external services.",
      )
    )
      return;

    setSaturating(true);

    try {
      const result = await saturateDatabase();

      alert(`Saturated ${result.saturatedCount} entities successfully.`);
    } catch {
      alert("Saturation failed");
    } finally {
      setSaturating(false);
    }
  };

  return (
    <Card className="sidebar">
      <h3>Workflows</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Button onClick={() => setShowIngest(true)}>📄 Ingest Document</Button>

        <Button variant="secondary" onClick={handleMerge} disabled={merging}>
          🔗 {merging ? "Merging..." : "Merge Nodes"}
        </Button>

        <Button
          variant="secondary"
          onClick={handleSaturate}
          disabled={saturating}
        >
          🧠 {saturating ? "Saturating..." : "Saturate Database"}
        </Button>
      </div>

      {showIngest && <IngestModal onClose={() => setShowIngest(false)} />}
    </Card>
  );
}

function App() {
  return (
    <div className="app-container">
      <header
        style={{
          marginBottom: "3rem",
          borderBottom: "1px solid var(--card-border)",
          paddingBottom: "1rem",
        }}
      >
        <h1>Seneschal</h1>
        <p style={{ fontSize: "1.1rem", maxWidth: "600px" }}>
          Your autonomous Personal Chief of Staff. Using local AI to map your
          professional relationships and discover hidden connections in your
          documents.
        </p>
      </header>

      <div className="dashboard-grid">
        <aside className="sidebar">
          <WorkflowSection />
          <DataLists />
        </aside>

        <main className="main-content">
          <SearchSection />
        </main>
      </div>
    </div>
  );
}

// --- Mount ---

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
