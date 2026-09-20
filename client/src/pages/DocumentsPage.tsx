import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Plus,
  Search,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import { api } from "../api";
import { PageHeader } from "../components/common";
import { Alert, ErrorBlock, Modal, TableLoadingRow } from "../components/ui";

type DocType = { type: string; label: string };

/** Fallback list if /documents/types cannot be reached. */
const FALLBACK_DOC_TYPES: DocType[] = [
  { type: "PRELIMINARY_NOTIFICATION", label: "Preliminary Land Acquisition Notification" },
  { type: "GAZETTE_NOTIFICATION", label: "Statutory Gazette Notification" },
  { type: "FIELD_VERIFICATION_REPORT", label: "Field Ground Inspection & Evidence Report" },
  { type: "SURVEY_REPORT", label: "Revenue Scrutiny Note & Cadastral Report" },
  { type: "COMPENSATION_AWARD", label: "Statutory Compensation Award Declaration" },
  { type: "POSSESSION_RECORD", label: "Form 3E Site Possession & Handover Certificate" },
  { type: "OTHER", label: "Other Supporting Document" },
];

/**
 * The demo has no real object storage, so hand the viewer a small text stub
 * describing the record instead of pretending to stream a PDF.
 */
function downloadSyntheticCopy(doc: any) {
  if (!doc) return;
  const body = [
    "N-LAMS DEMO / SYNTHETIC DOCUMENT — NOT A LEGAL GOVERNMENT NOTIFICATION",
    "",
    `Title:        ${doc.title || "Untitled"}`,
    `Document ID:  ${doc.documentId || doc.id}`,
    `Type:         ${doc.documentType || "OTHER"}`,
    `Stage:        ${doc.workflowStage || "General"}`,
    `Project:      ${doc.projectId || "—"}`,
    `Case:         ${doc.caseId || "—"}`,
    `Uploaded by:  ${doc.uploadedByName || doc.uploadedBy || "—"}`,
    `Uploaded at:  ${doc.uploadedAt || "—"}`,
    `Checksum:     ${doc.checksum || "—"}`,
  ].join("\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${(doc.fileName || "document").replace(/\.pdf$/i, "")}-demo.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [docTypes, setDocTypes] = useState<DocType[]>(FALLBACK_DOC_TYPES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: "",
    documentType: "PRELIMINARY_NOTIFICATION",
    projectId: "",
    caseId: "",
    stage: "Administrative Review",
    file: null as File | null,
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchDocs = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const [docs, types, projs] = await Promise.all([
        api<any[]>("/documents"),
        api<DocType[]>("/documents/types").catch(() => FALLBACK_DOC_TYPES),
        api<any[]>("/projects").catch(() => [] as any[]),
      ]);
      setDocuments(docs || []);
      setDocTypes(types?.length ? types : FALLBACK_DOC_TYPES);
      setProjects(projs || []);
      setError("");
      if (projs?.length > 0) {
        setUploadData((prev) =>
          prev.projectId && projs.some((p) => p.id === prev.projectId)
            ? prev
            : { ...prev, projectId: projs[0].id },
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents repository");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    const onChange = () => fetchDocs({ silent: true });
    window.addEventListener("nlams:data-changed", onChange);
    return () => window.removeEventListener("nlams:data-changed", onChange);
  }, []);

  // Keep the selected document type valid when the list arrives from the API.
  useEffect(() => {
    setUploadData((prev) =>
      docTypes.some((t) => t.type === prev.documentType)
        ? prev
        : { ...prev, documentType: docTypes[0]?.type || "OTHER" },
    );
  }, [docTypes]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.title.trim()) {
      setError("Enter a document title before registering the document.");
      return;
    }
    try {
      setUploading(true);
      setError("");
      setMessage("");

      await api("/documents/upload", {
        method: "POST",
        body: JSON.stringify({
          title: uploadData.title.trim(),
          documentType: uploadData.documentType,
          projectId: uploadData.projectId || undefined,
          caseId: uploadData.caseId || undefined,
          workflowStage: uploadData.stage,
          fileName: `${uploadData.documentType.toLowerCase()}_${Date.now()}.pdf`,
          fileSize: "1.4 MB",
          mimeType: "application/pdf",
        }),
      });

      setMessage("Document uploaded and recorded in the immutable statutory registry.");
      setShowUploadModal(false);
      setUploadData({
        title: "",
        documentType: docTypes[0]?.type || "OTHER",
        projectId: projects[0]?.id || "",
        caseId: "",
        stage: "Administrative Review",
        file: null,
      });
      await fetchDocs({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Document upload failed");
    } finally {
      setUploading(false);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const type: string = doc.documentType || "";
    const matchesCategory =
      categoryFilter === "ALL" ||
      type === categoryFilter ||
      (categoryFilter === "GAZETTE" && (type.includes("GAZETTE") || type.includes("NOTIFICATION") || type.includes("DECLARATION") || type.includes("APPROVAL"))) ||
      (categoryFilter === "AWARDS" && (type.includes("AWARD") || type.includes("PAYMENT"))) ||
      (categoryFilter === "FIELD" && (type.includes("FIELD") || type.includes("VERIFICATION") || type.includes("EVIDENCE") || type.includes("SURVEY"))) ||
      (categoryFilter === "POSSESSION" && (type.includes("POSSESSION") || type.includes("COMPLETION")));

    const needle = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !needle ||
      [doc.title, doc.fileName, type, doc.projectId, doc.caseId, doc.uploadedByName, doc.workflowStage]
        .some((field) => (field || "").toLowerCase().includes(needle));

    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <PageHeader
        title="Document & Statutory Gazette Repository"
        description="Immutable registry of Statutory Notifications, Ground Inspection Reports, Compensation Award Declarations, and Site Possession Handover Certificates."
      />

      {/* Synthetic Document Watermark Banner */}
      <div className="trust-banner" style={{ marginBottom: "20px" }}>
        <strong>DEMO / SYNTHETIC DOCUMENT SYSTEM</strong>
        <span>
          All PDF documents, Gazette scans, and possession handover certificates are generated for demonstration purposes with cryptographic SHA-256 integrity simulation.
        </span>
      </div>

      <Alert tone="success" message={message} onDismiss={() => setMessage("")} />
      <Alert tone="error" message={error} onDismiss={() => setError("")} />

      {/* KPI Stats */}
      <div className="stat-grid" style={{ marginBottom: "20px" }}>
        <div className="stat-card">
          <div className="stat-icon blue"><FileText size={18} /></div>
          <div className="stat-label">Total Documents</div>
          <strong className="stat-value">{documents.length}</strong>
          <span className="stat-delta">In immutable registry</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FileCheck2 size={18} /></div>
          <div className="stat-label">Statutory Notifications</div>
          <strong className="stat-value">{documents.filter((d) => d.documentType?.includes("GAZETTE") || d.documentType?.includes("NOTIFICATION") || d.documentType?.includes("DECLARATION")).length}</strong>
          <span className="stat-delta">Gazette publications</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><ShieldCheck size={18} /></div>
          <div className="stat-label">Awards & Handover</div>
          <strong className="stat-value">{documents.filter((d) => d.documentType?.includes("AWARD") || d.documentType?.includes("POSSESSION")).length}</strong>
          <span className="stat-delta">Valuation / Possession</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><UploadCloud size={18} /></div>
          <div className="stat-label">Field Evidence Dossiers</div>
          <strong className="stat-value">{documents.filter((d) => d.documentType?.includes("FIELD") || d.documentType?.includes("EVIDENCE")).length}</strong>
          <span className="stat-delta">Geo-tagged submissions</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="list-toolbar">
        {/* Category Filters */}
        <div className="toolbar-group">
          {[
            { id: "ALL", label: "All Documents" },
            { id: "GAZETTE", label: "Statutory Notifications" },
            { id: "FIELD", label: "Field Reports & Photos" },
            { id: "AWARDS", label: "Compensation Awards" },
            { id: "POSSESSION", label: "Possession Handover" },
          ].map((cat) => (
            <button
              key={cat.id}
              className={`button button-sm ${categoryFilter === cat.id ? "button-primary" : "button-secondary"}`}
              onClick={() => setCategoryFilter(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Actions & Search */}
        <div className="toolbar-group">
          <div className="search-field">
            <Search size={14} />
            <input
              type="search"
              placeholder="Search documents…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search documents"
            />
          </div>

          <button className="button button-primary button-sm" onClick={() => setShowUploadModal(true)}>
            <Plus size={14} /> Upload Statutory Doc
          </button>
        </div>
      </div>

      {/* Document Table */}
      <section className="panel table-panel">
        <div className="table-top">
          <span>{filteredDocs.length} Documents in Registry <small>· SHA-256 VERIFIED</small></span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Document Title & Type</th>
                <th>Project / Case</th>
                <th>Workflow Stage</th>
                <th>File Size / Hash</th>
                <th>Uploaded By</th>
                <th>Integrity Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && documents.length === 0 ? (
                <TableLoadingRow colSpan={7} label="Loading statutory registry…" />
              ) : error && documents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 0 }}>
                    <ErrorBlock message={error} onRetry={() => fetchDocs()} />
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "34px 20px", color: "#64748b", fontSize: "12.5px" }}>
                    The statutory registry is empty. Documents are attached automatically as cases advance through the workflow, or uploaded here.
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "28px", color: "#64748b", fontSize: "12.5px" }}>
                    No documents match the current filter{searchQuery ? ` and “${searchQuery}”` : ""}.
                    <button
                      className="button button-secondary button-sm"
                      style={{ marginLeft: "8px" }}
                      onClick={() => {
                        setSearchQuery("");
                        setCategoryFilter("ALL");
                      }}
                    >
                      Reset filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div>
                        <strong>{doc.title}</strong>
                        <div style={{ fontSize: "11px", color: "#2563eb", fontWeight: 600 }}>{doc.documentType}</div>
                        <div className="mono" style={{ fontSize: "10px", color: "#64748b" }}>{doc.fileName}</div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className="mono" style={{ fontSize: "12px", fontWeight: 600 }}>{doc.projectId || "—"}</span>
                        {doc.caseId && <div className="mono" style={{ fontSize: "11px", color: "#64748b" }}>Case: {doc.caseId}</div>}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "11px", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "2px 6px", borderRadius: "4px" }}>
                        {doc.workflowStage || "General"}
                      </span>
                    </td>
                    <td>
                      <div>
                        <span style={{ fontSize: "12px" }}>{doc.fileSize || "1.2 MB"}</span>
                        <div className="mono" style={{ fontSize: "9px", color: "#94a3b8" }}>
                          SHA: {doc.checksum ? doc.checksum.slice(0, 16) : "e3b0c44298fc1c14"}…
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "12px" }}>
                        <strong>{doc.uploadedByName || doc.uploadedBy || "Officer"}</strong>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : "—"}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: doc.status === "REJECTED" ? "#dc2626" : "#16a34a", fontSize: "11px", fontWeight: 700 }}>
                        <CheckCircle2 size={13} /> {doc.status || "ATTACHED"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="button button-secondary button-sm"
                        onClick={() => setSelectedDoc(doc)}
                        style={{ fontSize: "11px" }}
                      >
                        <Eye size={13} /> Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SYNTHETIC DOCUMENT PREVIEW MODAL */}
      <Modal
        open={!!selectedDoc}
        width={680}
        title="Document Dossier Preview"
        onClose={() => setSelectedDoc(null)}
        footer={
          <>
            <span className="modal-foot-start" style={{ fontSize: "11px", color: "#64748b" }}>
              File: {selectedDoc?.fileName} ({selectedDoc?.fileSize || "1.2 MB"})
            </span>
            <button className="button button-secondary button-sm" onClick={() => setSelectedDoc(null)}>
              Close
            </button>
            <button
              type="button"
              className="button button-primary button-sm"
              onClick={() => downloadSyntheticCopy(selectedDoc)}
            >
              <Download size={14} /> Download Copy
            </button>
          </>
        }
      >
        {selectedDoc && (
          /* Simulated official sheet */
          <div style={{ padding: "24px", background: "#f8fafc" }}>
            <div
              style={{
                background: "#fff",
                padding: "24px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                position: "relative",
                fontFamily: "Georgia, serif",
              }}
            >
              {/* Watermark */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%) rotate(-30deg)",
                  fontSize: "24px",
                  fontWeight: 900,
                  color: "rgba(220, 38, 38, 0.08)",
                  letterSpacing: "4px",
                  textAlign: "center",
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                }}
              >
                DEMO / SYNTHETIC DOCUMENT<br />NOT A LEGAL GOVERNMENT NOTIFICATION
              </div>

              {/* Government Header */}
              <div style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: "12px", marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", letterSpacing: "2px", fontWeight: 700, color: "#475569" }}>
                  GOVERNMENT OF HARYANA / REVENUE DEPARTMENT
                </div>
                <h2 style={{ fontSize: "16px", margin: "6px 0 2px 0", color: "#0f172a" }}>
                  {selectedDoc.title}
                </h2>
                <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "sans-serif" }}>
                  Statutory Document Type: <strong>{selectedDoc.documentType}</strong> · Stage: <strong>{selectedDoc.workflowStage || "General"}</strong>
                </div>
              </div>

              {/* Metadata Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px", marginBottom: "16px", fontFamily: "sans-serif" }}>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "10px" }}>PROJECT REFERENCE:</span>
                  <strong>{selectedDoc.projectId || "All Corridor Projects"}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "10px" }}>ACQUISITION CASE:</span>
                  <strong>{selectedDoc.caseId || "All Corridor Parcels"}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "10px" }}>DIGITAL HASH (SHA-256):</span>
                  <span className="mono" style={{ fontSize: "10px", wordBreak: "break-all" }}>
                    {selectedDoc.checksum || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
                  </span>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "10px" }}>ISSUING AUTHORITY / SIGNATORY:</span>
                  <strong>{selectedDoc.uploadedByName || selectedDoc.uploadedBy || "Competent Authority Land Acquisition (CALA)"}</strong>
                </div>
              </div>

              {/* Text excerpt */}
              <div style={{ fontSize: "13px", lineHeight: "1.6", color: "#334155", background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <p style={{ margin: 0 }}>
                  WHEREAS it appears to the Appropriate Government that land in the District of Ambala is required for the public purpose, namely for the development of infrastructure corridors under the National Land Acquisition & Monitoring Framework.
                </p>
                <p style={{ marginTop: "8px", marginBottom: 0, fontSize: "11px", color: "#64748b" }}>
                  Schedule of Affected Cadastral Parcels: Registered under Survey Numbers across Demo Kalan and Chandpur Demo revenue villages.
                </p>
              </div>

              {/* Signature Block */}
              <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontFamily: "sans-serif" }}>
                <div style={{ fontSize: "10px", color: "#64748b" }}>
                  Digitally recorded on: {selectedDoc.uploadedAt ? new Date(selectedDoc.uploadedAt).toLocaleString() : new Date().toLocaleString()}<br />
                  Repository: N-LAMS Master Statutory Store
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ borderBottom: "1px solid #0f172a", paddingBottom: "2px", fontWeight: 700, fontSize: "12px" }}>
                    {selectedDoc.uploadedByName || selectedDoc.uploadedBy || "Authorized Signatory"}
                  </div>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>Competent Authority (Land Acquisition)</span>
                </div>
              </div>
            </div>
          </div>

        )}
      </Modal>

      {/* UPLOAD MODAL */}
      <Modal
        open={showUploadModal}
        width={520}
        title="Upload Statutory Document"
        onClose={() => setShowUploadModal(false)}
      >
        <form onSubmit={handleUpload}>
          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label htmlFor="doc-title" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
              Document Title *
            </label>
            <input
              id="doc-title"
              type="text"
              required
              placeholder="e.g. Gazette Notification under Section 3A"
              value={uploadData.title}
              onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label htmlFor="doc-type" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
              Document Type
            </label>
            <select
              id="doc-type"
              value={uploadData.documentType}
              onChange={(e) => setUploadData({ ...uploadData, documentType: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
            >
              {docTypes.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label htmlFor="doc-project" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
              Project Association
            </label>
            {projects.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#b45309", margin: 0 }}>
                No projects are available yet — the document will be registered without a project link.
              </p>
            ) : (
              <select
                id="doc-project"
                value={uploadData.projectId}
                onChange={(e) => setUploadData({ ...uploadData, projectId: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectId || p.id} — {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label htmlFor="doc-stage" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
              Workflow Stage
            </label>
            <input
              id="doc-stage"
              type="text"
              value={uploadData.stage}
              onChange={(e) => setUploadData({ ...uploadData, stage: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "18px" }}>
            <span style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
              Source File
            </span>
            <div
              style={{
                border: "2px dashed #cbd5e1",
                borderRadius: "8px",
                padding: "18px",
                textAlign: "center",
                background: "#f8fafc",
              }}
            >
              <UploadCloud size={24} color="#64748b" style={{ margin: "0 auto 6px auto", display: "block" }} />
              <span style={{ fontSize: "12px", color: "#334155", fontWeight: 600 }}>
                Synthetic demo document
              </span>
              <span style={{ display: "block", fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                No real file is uploaded in the demo — a synthetic file name, size and SHA-256 checksum are generated on registration.
              </span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" className="button button-secondary" onClick={() => setShowUploadModal(false)} disabled={uploading}>
              Cancel
            </button>
            <button type="submit" className="button button-primary" disabled={uploading || !uploadData.title.trim()}>
              {uploading ? "Recording…" : "Upload & Register"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
