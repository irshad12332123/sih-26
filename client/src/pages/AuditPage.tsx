import { useEffect, useState } from "react";
import {
  Activity,
  Code,
  Eye,
  Filter,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { api, csvDownload } from "../api";
import { PageHeader } from "../components/common";
import { Alert, ErrorBlock, Modal, TableLoadingRow } from "../components/ui";

/**
 * Filters are matched against the action identifiers the API actually emits
 * (PROJECT_CREATED, TASK_APPROVED, FIELD_VERIFIED, COMPENSATION_PAID, …).
 */
const ACTION_FILTERS: { id: string; label: string; match: (action: string) => boolean }[] = [
  { id: "ALL", label: "All events", match: () => true },
  { id: "PROJECT", label: "Projects", match: (a) => a.includes("PROJECT") },
  { id: "TASK", label: "Approvals & tasks", match: (a) => a.includes("TASK") || a.includes("APPROVED") },
  { id: "FIELD", label: "Field verification", match: (a) => a.includes("FIELD") },
  { id: "COMPENSATION", label: "Compensation & PFMS", match: (a) => a.includes("COMPENSATION") || a.includes("PFMS") || a.includes("PAYMENT") },
  { id: "RR", label: "R&R", match: (a) => a.startsWith("RR_") || a.includes("_RR") },
  { id: "POSSESSION", label: "Possession", match: (a) => a.includes("POSSESSION") },
  { id: "DOCUMENT", label: "Documents", match: (a) => a.includes("DOCUMENT") },
  { id: "SYNC", label: "Integrations", match: (a) => a.includes("SYNC") || a.includes("EXTERNAL") },
];

/** Best-effort one-line summary of an audit record's metadata payload. */
function describeAudit(row: any): string {
  const meta = row?.metadata || {};
  const preferred = meta.remarks || meta.reason || meta.name || meta.stage || meta.title;
  if (preferred) return String(preferred);
  const entries = Object.entries(meta).filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (entries.length === 0) return "Statutory mutation recorded";
  return entries
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`)
    .join(" · ");
}

export function AuditPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const loadAudit = async () => {
    try {
      setLoading(true);
      setRows((await api<any[]>("/audit")) || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit trail");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
    const onChange = () => loadAudit();
    window.addEventListener("nlams:data-changed", onChange);
    return () => window.removeEventListener("nlams:data-changed", onChange);
  }, []);

  const filteredRows = rows.filter((r) => {
    const action: string = r.action || "";
    const filter = ACTION_FILTERS.find((f) => f.id === actionFilter) || ACTION_FILTERS[0];
    if (!filter.match(action)) return false;
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return true;
    return [action, r.actorId, r.actorRole, r.entityId, r.entityType, JSON.stringify(r.metadata || {})]
      .some((field) => (field || "").toLowerCase().includes(needle));
  });

  return (
    <>
      <PageHeader
        title="Immutable Audit & Mutation Trail"
        description="Tamper-evident, chronological event log capturing all state changes, statutory approvals, field verifications, and financial DBT disbursements."
      />

      {/* Trust Notice */}
      <div className="trust-banner" style={{ marginBottom: "20px" }}>
        <strong>IMMUTABLE APPEND-ONLY AUDIT LEDGER</strong>
        <span>
          Every administrative action, digital approval, and adapter reconciliation is recorded with cryptographic actor attribution.
        </span>
      </div>

      <Alert tone="error" message={error} onDismiss={() => setError("")} />

      {/* Filter Toolbar */}
      <div className="list-toolbar">
        <div className="toolbar-group">
          {ACTION_FILTERS.map((cat) => (
            <button
              key={cat.id}
              className={`button button-sm ${actionFilter === cat.id ? "button-primary" : "button-secondary"}`}
              onClick={() => setActionFilter(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="toolbar-group">
          <div className="search-field">
            <Search size={14} />
            <input
              type="search"
              placeholder="Search action, actor, entity…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search audit trail"
            />
          </div>
          <button
            className="button button-secondary button-sm"
            onClick={() => csvDownload(filteredRows, "nlams-audit-trail.csv")}
            disabled={filteredRows.length === 0}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Audit Table */}
      <section className="panel table-panel">
        <div className="table-top">
          <span>{filteredRows.length} Recorded Mutation Events <small>· APPEND-ONLY TRAIL</small></span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Timestamp (UTC/IST)</th>
                <th>Action Identifier</th>
                <th>Authorized Actor</th>
                <th>Entity Target</th>
                <th>Details / Payload</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <TableLoadingRow colSpan={6} label="Loading immutable audit trail…" />
              ) : error && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <ErrorBlock message={error} onRetry={loadAudit} />
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "26px", color: "#64748b", fontSize: "12.5px" }}>
                    No audit records match the current filter.
                    {(actionFilter !== "ALL" || searchQuery) && (
                      <button
                        className="button button-secondary button-sm"
                        style={{ marginLeft: "8px" }}
                        onClick={() => {
                          setActionFilter("ALL");
                          setSearchQuery("");
                        }}
                      >
                        Reset filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div>
                        <strong>{new Date(r.createdAt).toLocaleTimeString()}</strong>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: r.action.includes("APPROVED")
                            ? "#ecfdf5"
                            : r.action.includes("CREATE")
                            ? "#eff6ff"
                            : r.action.includes("SYNC")
                            ? "#f5f3ff"
                            : "#f1f5f9",
                          color: r.action.includes("APPROVED")
                            ? "#065f46"
                            : r.action.includes("CREATE")
                            ? "#1e40af"
                            : r.action.includes("SYNC")
                            ? "#6b21a8"
                            : "#334155",
                        }}
                      >
                        {r.action}
                      </span>
                    </td>
                    <td>
                      <div>
                        <strong>{r.actorId}</strong>
                        {r.actorRole && (
                          <div style={{ fontSize: "10px", color: "#64748b" }}>{r.actorRole}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className="mono" style={{ fontSize: "11px", fontWeight: 600 }}>{r.entityType}</span>
                        <div className="mono" style={{ fontSize: "10px", color: "#64748b" }}>{r.entityId || "—"}</div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "11px", color: "#475569", display: "block", maxWidth: "320px" }}>
                        {describeAudit(r)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="button button-secondary button-sm"
                        onClick={() => setSelectedEvent(r)}
                        style={{ fontSize: "11px" }}
                      >
                        <Code size={13} /> JSON
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* PAYLOAD INSPECTION MODAL */}
      <Modal
        open={!!selectedEvent}
        width={560}
        title="Audit Event Payload"
        eyebrow={selectedEvent ? `${selectedEvent.action} · ${selectedEvent.id}` : undefined}
        onClose={() => setSelectedEvent(null)}
        footer={
          <button className="button button-secondary button-sm" onClick={() => setSelectedEvent(null)}>
            Close
          </button>
        }
      >
        <pre
          style={{
            background: "#0f172a",
            color: "#38bdf8",
            padding: "16px",
            borderRadius: "8px",
            fontSize: "12px",
            overflowX: "auto",
            maxHeight: "360px",
            margin: 0,
          }}
        >
          {JSON.stringify(selectedEvent, null, 2)}
        </pre>
      </Modal>
    </>
  );
}
