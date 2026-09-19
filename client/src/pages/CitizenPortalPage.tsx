import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  FileCheck2,
  Globe2,
  LockKeyhole,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";
import { api } from "../api";
import { StatusBadge } from "../components/common";

export function CitizenPortalPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "CITIZEN-12345");
  const [record, setRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (val?: string) => {
    const q = val || query;
    if (!q.trim()) return;
    try {
      setLoading(true);
      setError("");
      setRecord(null);
      const data = await api<any>(`/public/citizen-status?query=${encodeURIComponent(q.trim())}`);
      setRecord(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Record not found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query) {
      handleSearch(query);
    }
  }, []);

  return (
    <div style={{ maxWidth: "880px", margin: "0 auto", padding: "10px 0" }}>
      {/* Header */}
      <div className="integration-hero" style={{ marginBottom: "20px" }}>
        <div className="integration-hero-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
          <Globe2 size={26} />
        </div>
        <div>
          <div className="eyebrow" style={{ color: "#2563eb" }}>
            NATIONAL CITIZEN ACQUISITION TRACKER
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "4px 0" }}>
            Transparent Land Acquisition Status
          </h2>
          <p style={{ fontSize: "12px", color: "#64748b" }}>
            CITIZEN PORTAL — PROTOTYPE. Track the stage of your parcel acquisition, statutory declaration, and compensation payment.
          </p>
        </div>
      </div>

      {/* Search Box */}
      <div className="panel" style={{ padding: "16px", marginBottom: "20px" }}>
        <label style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", display: "block", marginBottom: "8px" }}>
          Search by Citizen Reference, Parcel ID, Survey Number, or Case Reference:
        </label>
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} style={{ position: "absolute", top: "11px", left: "12px", color: "#94a0b1" }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. CITIZEN-12345, PCL-00128, 142/3, NLA-C-00231"
              style={{
                width: "100%",
                padding: "9px 12px 9px 36px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            />
          </div>
          <button className="button button-primary" onClick={() => handleSearch()} disabled={loading}>
            {loading ? "Searching…" : "Track Status"}
          </button>
        </div>
        <div style={{ marginTop: "8px", fontSize: "11px", color: "#64748b" }}>
          Demo suggestions:{" "}
          <button
            style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline", fontSize: "11px" }}
            onClick={() => {
              setQuery("CITIZEN-12345");
              handleSearch("CITIZEN-12345");
            }}
          >
            CITIZEN-12345 (PCL-00128)
          </button>
          {" · "}
          <button
            style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline", fontSize: "11px" }}
            onClick={() => {
              setQuery("PCL-00135");
              handleSearch("PCL-00135");
            }}
          >
            PCL-00135 (Paid)
          </button>
        </div>
      </div>

      {error && (
        <div className="login-note" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {/* Search Result */}
      {record && (
        <div className="panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #e2e8f0", paddingBottom: "14px", marginBottom: "16px" }}>
            <div>
              <div className="eyebrow" style={{ color: "#2563eb" }}>
                OFFICIAL RECORD · {record.caseReference}
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", margin: "4px 0" }}>
                {record.projectName}
              </h2>
              <p style={{ fontSize: "12px", color: "#64748b" }}>
                📍 Village {record.village}, District {record.district}, {record.state}
              </p>
            </div>
            <StatusBadge status={record.overallStatus} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "11px", color: "#64748b" }}>Cadastral Parcel Reference</span>
              <strong style={{ display: "block", fontSize: "14px", color: "#1e293b", marginTop: "2px" }}>
                {record.parcelReference} (Survey {record.surveyNumber})
              </strong>
            </div>

            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "11px", color: "#64748b" }}>Current Acquisition Stage</span>
              <strong style={{ display: "block", fontSize: "14px", color: "#2563eb", marginTop: "2px" }}>
                {record.acquisitionStage}
              </strong>
            </div>
          </div>

          {/* Financial Summary */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
              <CircleDollarSign size={16} color="#2563eb" /> Direct Benefit Transfer & Compensation
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Assessed Amount</span>
                <strong style={{ display: "block", fontSize: "15px", color: "#1e293b" }}>
                  ₹{record.compensationAssessed.toLocaleString("en-IN")}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Awarded / Approved</span>
                <strong style={{ display: "block", fontSize: "15px", color: "#16a34a" }}>
                  ₹{record.compensationApproved.toLocaleString("en-IN")}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Payment Status</span>
                <span style={{ display: "inline-block", marginTop: "2px" }}>
                  <StatusBadge status={record.paymentStatus} />
                </span>
              </div>
            </div>
          </div>

          {/* Privacy & Legal Disclaimer */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#64748b", background: "#f1f5f9", padding: "10px 12px", borderRadius: "6px" }}>
            <ShieldCheck size={16} color="#059669" />
            <span>
              {record.disclaimer} Privacy Notice: Personal owner details and internal notes are protected and not displayed.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
