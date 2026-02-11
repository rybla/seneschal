import React, {
  useState,
  useEffect,
  type FormEvent,
  useCallback,
  useRef,
} from "react";
import { createRoot } from "react-dom/client";
import ForceGraph2D from "react-force-graph-2d";
import {
  fetchDocuments,
  fetchEntities,
  fetchRelations,
  uploadDocument,
  mergeNodes,
  queryGraph,
  saturateDatabase,
} from "./api";
import type {
  Document,
  Entity,
  Relation,
  QueryResponse,
  PrivacyLevel,
  GraphNode,
  GraphEdge,
} from "./types";

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

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, width: size.width, height: size.height };
}

// --- Sections ---

// Extend GraphNode to include properties added by react-force-graph-2d
interface ForceGraphNode extends GraphNode {
  x?: number;
  y?: number;
}

function SearchSection() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<QueryResponse | null>(null);
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>("PRIVATE");

  useEffect(() => {
    // Fetch the initial graph data when the component mounts
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [entities, relations] = await Promise.all([
          fetchEntities(),
          fetchRelations(),
        ]);
        const graphData = {
          nodes: entities,
          edges: relations.map((r) => ({
            ...r,
            source: r.sourceEntityId,
            target: r.targetEntityId,
          })),
        };
        setData({
          graphData,
          answer: "Showing the full knowledge graph.",
        });
      } catch (err) {
        console.error(err);
        alert("Failed to load initial graph: " + err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const result = await queryGraph(query, privacyLevel);
      setData(result);
    } catch (err) {
      console.error(err);
      alert("Search failed: " + err);
    } finally {
      setLoading(false);
    }
  };

  const { ref: containerRef, width, height } = useElementSize<HTMLDivElement>();

  const nodeCanvasObject = useCallback(
    (
      node: ForceGraphNode,
      ctx: CanvasRenderingContext2D,
      globalScale: number,
    ) => {
      const label = node.name;
      const fontSize = 12 / globalScale;
      ctx.font = `${fontSize}px Sans-Serif`;
      const textWidth = ctx.measureText(label).width;
      const bckgDimensions: [number, number] = [
        textWidth + fontSize * 0.2,
        fontSize + fontSize * 0.2,
      ]; // some padding

      ctx.fillStyle = "rgba(255, 255, 255, 0)"; // transparent background
      ctx.fillRect(
        (node.x ?? 0) - bckgDimensions[0] / 2,
        (node.y ?? 0) - bckgDimensions[1] / 2,
        ...bckgDimensions,
      );

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff"; // visible white text
      ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + 12);

      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, 6, 0, 2 * Math.PI, false);
      ctx.fillStyle = "#6366f1"; // primary color (indigo-500)

      ctx.fill();
    },
    [],
  );

  return (
    <section className="search-section">
      <h2>Knowledge Graph Explorer</h2>
      <form
        onSubmit={handleSearch}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          marginBottom: "2rem",
          marginTop: "1rem",
        }}
      >
        <div style={{ display: "flex", gap: "1rem" }}>
          <input
            type="text"
            placeholder="Ask a question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flexGrow: 1 }}
          />
          <Button disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: "1rem",
          }}
        >
          <span>Privacy Level</span>
          <div className="privacy-toggle">
            <button
              type="button"
              onClick={() => setPrivacyLevel("PRIVATE")}
              className={`toggle-btn ${
                privacyLevel === "PRIVATE" ? "active" : ""
              }`}
            >
              Private
            </button>
            <button
              type="button"
              onClick={() => setPrivacyLevel("PUBLIC")}
              className={`toggle-btn ${
                privacyLevel === "PUBLIC" ? "active" : ""
              }`}
            >
              Public
            </button>
          </div>
        </div>
      </form>

      {data && (
        <Card className="answer-card">
          <h4>Synthesized Answer</h4>
          <p>{data.answer}</p>
        </Card>
      )}

      {data ? (
        <Card className="graph-viz">
          {data.graphData.nodes.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center" }}>
              <p>No results found for your query.</p>
            </div>
          ) : (
            <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
              {width > 0 && height > 0 && (
                <ForceGraph2D
                  width={width}
                  height={height}
                  graphData={{
                    nodes: data.graphData.nodes,
                    links: data.graphData.edges,
                  }}
                  nodeLabel={(node: ForceGraphNode) =>
                    `${node.name} (${node.type})`
                  }
                  linkLabel={(link: GraphEdge) => link.type}
                  backgroundColor="rgba(0,0,0,0)"
                  linkColor={() => "rgba(255, 255, 255, 0.3)"}
                  linkDirectionalArrowLength={3.5}
                  linkDirectionalArrowRelPos={1}
                  nodeCanvasObject={nodeCanvasObject}
                />
              )}
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
                {doc.createdAt
                  ? new Date(doc.createdAt).toLocaleDateString()
                  : "N/A"}{" "}
                • {doc.securityLevel}
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
  const [privacyLevel, setPrivacyLevel] = useState<"PRIVATE" | "PUBLIC">(
    "PRIVATE",
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      await uploadDocument(file, privacyLevel);
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
            style={{
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Privacy Level</span>
            <div className="privacy-toggle">
              <button
                type="button"
                onClick={() => setPrivacyLevel("PRIVATE")}
                className={`toggle-btn ${
                  privacyLevel === "PRIVATE" ? "active" : ""
                }`}
              >
                Private
              </button>
              <button
                type="button"
                onClick={() => setPrivacyLevel("PUBLIC")}
                className={`toggle-btn ${
                  privacyLevel === "PUBLIC" ? "active" : ""
                }`}
              >
                Public
              </button>
            </div>
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
      if ("mergedCount" in result) {
        alert(`Merged ${result.mergedCount} pairs successfully.`);
      } else {
        alert(result.message);
      }
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
      <header>
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
