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
import { api, currentUser } from "../api";
import { PageHeader, StatusBadge } from "../components/common";

export function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [docTypes, setDocTypes] = useState<any[]>([]);
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
    stage: "ADMINISTRATIVE_REVIEW",
    file: null as File | null,
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const [docs, types, projs] = await Promise.all([
        api<any[]>("/documents"),
        api<any[]>("/documents/types"),
        api<any[]>("/projects"),
      ]);
      setDocuments(docs);
      setDocTypes(types);
      setProjects(projs);
      if (projs.length > 0 && !uploadData.projectId) {
        setUploadData((prev) => ({ ...prev, projectId: projs[0].id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents repository");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUploading(true);
      setError("");
      setMessage("");

      const user = currentUser();
      await api("/documents/upload", {
        method: "POST",
        body: JSON.stringify({
          title: uploadData.title || `${uploadData.documentType} Document`,
          documentType: uploadData.documentType,
          projectId: uploadData.projectId,
          caseId: uploadData.caseId || undefined,
          stage: uploadData.stage,
          fileName: `${uploadData.documentType.toLowerCase()}_${Date.now()}.pdf`,
          fileSize: "1.4 MB",
          mimeType: "application/pdf",
          uploadedBy: user?.displayName || user?.email || "Authorized Officer",
        }),
      });

      setMessage("Document uploaded and recorded in the immutable statutory registry.");
      setShowUploadModal(false);
      setUploadData({
        title: "",
        documentType: "PRELIMINARY_NOTIFICATION",
        projectId: projects[0]?.id || "",
        caseId: "",
        stage: "ADMINISTRATIVE_REVIEW",
        file: null,
      });
      await fetchDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Document upload failed");
    } finally {
      setUploading(false);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesCategory =
      categoryFilter === "ALL" ||
      doc.documentType === categoryFilter ||
      (categoryFilter === "GAZETTE" && (doc.documentType.includes("GAZETTE") || doc.documentType.includes("NOTIFICATION") || doc.documentType.includes("DECLARATION"))) ||
      (categoryFilter === "AWARDS" && doc.documentType.includes("AWARD")) ||
      (categoryFilter === "FIELD" && (doc.documentType.includes("FIELD") || doc.documentType.includes("VERIFICATION") || doc.documentType.includes("EVIDENCE"))) ||
      (categoryFilter === "POSSESSION" && doc.documentType.includes("POSSESSION"));

    const matchesSearch =
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.projectId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.caseId && doc.caseId.toLowerCase().includes(searchQuery.toLowerCase()));

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

      {message && <div className="login-note" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>{message}</div>}
      {error && <div className="login-note" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>{error}</div>}

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        {/* Category Filters */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
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
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{ position: "relative", width: "240px" }}>
            <input
              type="text"
              placeholder="Search documents…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px 6px 28px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
              }}
            />
            <Search size={14} style={{ position: "absolute", left: "8px", top: "9px", color: "#64748b" }} />
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
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                    No matching documents found.
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
                        <span className="mono" style={{ fontSize: "12px", fontWeight: 600 }}>{doc.projectId}</span>
                        {doc.caseId && <div className="mono" style={{ fontSize: "11px", color: "#64748b" }}>Case: {doc.caseId}</div>}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "11px", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "2px 6px", borderRadius: "4px" }}>
                        {doc.stage || "General"}
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
                        <strong>{doc.uploadedBy || "Officer"}</strong>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : "Demo"}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#16a34a", fontSize: "11px", fontWeight: 700 }}>
                        <CheckCircle2 size={13} /> {doc.verified ? "VERIFIED" : "ATTACHED"}
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
      {selectedDoc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              border: "1px solid #cbd5e1",
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FileText size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: "16px", color: "#1e293b" }}>Document Dossier Preview</h3>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Document Body (Simulated Official Sheet) */}
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
                    Statutory Document Type: <strong>{selectedDoc.documentType}</strong> · Stage: <strong>{selectedDoc.stage}</strong>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px", marginBottom: "16px", fontFamily: "sans-serif" }}>
                  <div>
                    <span style={{ color: "#64748b", display: "block", fontSize: "10px" }}>PROJECT REFERENCE:</span>
                    <strong>{selectedDoc.projectId}</strong>
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
                    <strong>{selectedDoc.uploadedBy || "Competent Authority Land Acquisition (CALA)"}</strong>
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
                      {selectedDoc.uploadedBy || "Authorized Signatory"}
                    </div>
                    <span style={{ fontSize: "10px", color: "#64748b" }}>Competent Authority (Land Acquisition)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                File: {selectedDoc.fileName} ({selectedDoc.fileSize || "1.2 MB"})
              </span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="button button-secondary button-sm" onClick={() => setSelectedDoc(null)}>
                  Close
                </button>
                <a
                  href={selectedDoc.fileUrl || "#"}
                  download={selectedDoc.fileName}
                  onClick={(e) => {
                    e.preventDefault();
                    alert(`Synthetic download initiated for ${selectedDoc.fileName}`);
                  }}
                  className="button button-primary button-sm"
                >
                  <Download size={14} /> Download Copy
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              border: "1px solid #cbd5e1",
            }}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#1e293b" }}>Upload Statutory Document</h3>
              <button onClick={() => setShowUploadModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpload} style={{ padding: "20px" }}>
              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gazette Notification under Section 3A"
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Document Type
                </label>
                <select
                  value={uploadData.documentType}
                  onChange={(e) => setUploadData({ ...uploadData, documentType: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                >
                  <option value="SECTION_3A_GAZETTE">SECTION_3A_GAZETTE — Preliminary Notification</option>
                  <option value="SECTION_3D_DECLARATION">SECTION_3D_DECLARATION — Final Declaration</option>
                  <option value="FIELD_VERIFICATION_REPORT">FIELD_VERIFICATION_REPORT — Ground Survey & GPS Evidence</option>
                  <option value="REVIEW_SCRUTINY_NOTE">REVIEW_SCRUTINY_NOTE — Competent Scrutiny Note</option>
                  <option value="COMPENSATION_AWARD_3G">COMPENSATION_AWARD_3G — Section 3G Award Order</option>
                  <option value="POSSESSION_CERTIFICATE_FORM_3E">POSSESSION_CERTIFICATE_FORM_3E — Handover Certificate</option>
                  <option value="SUPPORTING_LEGAL_AFFIDAVIT">SUPPORTING_LEGAL_AFFIDAVIT — Revenue / Land Title Record</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Project Association
                </label>
                <select
                  value={uploadData.projectId}
                  onChange={(e) => setUploadData({ ...uploadData, projectId: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Select File (PDF, DOCX, GeoTIFF)
                </label>
                <div
                  style={{
                    border: "2px dashed #cbd5e1",
                    borderRadius: "8px",
                    padding: "20px",
                    textAlign: "center",
                    background: "#f8fafc",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setUploadData((prev) => ({
                      ...prev,
                      title: prev.title || "Gazette Notification under Section 3A (Haryana)",
                    }));
                  }}
                >
                  <UploadCloud size={24} color="#64748b" style={{ margin: "0 auto 6px auto", display: "block" }} />
                  <span style={{ fontSize: "12px", color: "#334155", fontWeight: 600 }}>Click to select sample file</span>
                  <span style={{ display: "block", fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                    Synthetic file hash and metadata will be generated automatically.
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="button button-secondary" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={uploading}>
                  {uploading ? "Recording…" : "Upload & Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
