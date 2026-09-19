# N-LAMS — National Land Acquisition & Management System

N-LAMS is a national land-acquisition coordination, GIS corridor discovery, and monitoring orchestration platform developed as an SIH prototype. Existing departmental and state systems (such as BhoomiRashi, State Land Records, and PFMS) remain authoritative systems of record; N-LAMS provides the unified orchestration layer connecting projects, candidate cadastral parcels, cases, statutory workflow stages, geo-tagged field verification, reviewer scrutiny, compensation awards, possession, R&R, notifications, dashboards, reports, and citizen tracking.

Local development and demonstration run entirely on a persistent `.data/nlams.json` repository; the production path is the Supabase/PostgreSQL/PostGIS schema in `supabase/migrations/`.

---

## 🏛️ System Architecture

```text
BhoomiRashi / State Land Records / PFMS / Other Systems (MOCK ADAPTERS)
                         ↓
                    Adapters
                         ↓
                 Canonical N-LAMS
                         ↓
       ┌─────────────────┼─────────────────┐
       ↓                 ↓                 ↓
      GIS              Workflow         Monitoring
       ↓                 ↓                 ↓
    Parcels            Tasks          Dashboard
       ↓                 ↓                 ↓
    Cases            Officers        Analytics
       ↓                 ↓                 ↓
                  Documents / Audit
                         ↓
                Notifications / Citizen Portal
```

---

## 🚀 Quick Start & Running Locally

Prerequisites: **Node.js 20+** and **npm**.

```bash
# Install dependencies
npm install

# Initialize / Seed the golden demo baseline
npm run seed

# Run automated end-to-end golden flow tests
npm test

# Start the full development stack (Frontend on http://localhost:5173, Backend on http://localhost:4000)
npm run dev
```

---

## 👥 Demo User Personas & Credentials

| Role | Name | Email | Password | Primary Demo Scope |
| :--- | :--- | :--- | :--- | :--- |
| **National Admin** | MoRTH National Administrator | `national@nlams.demo` | `National@123` | National dashboard, BhoomiRashi sync, 3D Declaration |
| **Project Officer** | PIU Ambala Corridor Officer | `project@nlams.demo` | `Project@123` | Project alignment, 100m corridor parcel discovery |
| **Field Officer** | FO-AMB-01 (Ambala) | `field@nlams.demo` | `Field@123` | "My Field Tasks", physical boundary inspection, photo upload & DEMO GPS |
| **Reviewing Officer** | REV-AMB-01 (Ambala) | `reviewer@nlams.demo` | `Reviewer@123` | "Review Queue", photo evidence scrutiny, Approve / Reject / Correction |
| **District Officer** | CALA Ambala | `district@nlams.demo` | `District@123` | Section 3C objections, 3E possession taking, R&R completion |
| **Department Admin**| NHAI Land Acquisition Cell | `department@nlams.demo` | `Department@123` | Section 3G compensation award determination & approval |
| **Viewer** | Public / Ministry Viewer | `viewer@nlams.demo` | `Viewer@123` | Read-only access across national dashboards and reports |

---

## 🌟 End-to-End Golden Demonstration Flow

1. **Sign in as National Admin (`national@nlams.demo`)**
   - Open **Integrations** -> Click **[ SYNC PROJECTS ]** on BhoomiRashi.
   - Inspect synchronized project `NH-44 Corridor Expansion — Demo Section` (42 projects, 1,284 parcels, 248.6 ha required).
2. **Switch to Project Officer (`project@nlams.demo`)**
   - Open **Projects** -> Select `NH-44 Corridor Expansion — Demo Section`.
   - Inspect alignment corridor map -> Set buffer corridor (e.g. 100m).
   - Click **[ DISCOVER AFFECTED PARCELS ]** -> Automatically imports candidate parcels, creates acquisition cases, and triggers workflow stages.
3. **Switch to Field Officer (`field@nlams.demo`)**
   - Open **My Field Tasks** -> Select `PCL-00128` (Survey 142/3, Demo Village).
   - Fill in boundary checklist -> Click **DEMO GPS** -> Upload site photograph -> Click **[ SUBMIT VERIFICATION ]**.
   - Observe live topbar notification and activity timeline update.
4. **Switch to Reviewing Officer (`reviewer@nlams.demo`)**
   - Open **Review Queue** -> Inspect submitted photographic evidence, GPS coordinates, checklist, and parcel map.
   - Click **[ APPROVE & ADVANCE STAGE ]** -> Workflow advances to Section 3G Compensation.
5. **Open Compensation (`/compensation`)**
   - Review assessed compensation of ₹11,25,000 for `PCL-00128` -> Click **[ Approve Award ]**.
   - Click **[ PFMS DEMO sync ]** -> Directly reconciles with PFMS mock DBT adapter, marking status as `PAID` with reference `DEMO-PFMS-2026-0042`.
6. **Open R&R (`/rr`)**
   - View affected and eligible families -> Click **[ Deliver & Complete ]** -> R&R marked complete.
7. **Open National Overview (`/`)**
   - Observe real-time metric updates for land acquired, compensation disbursed, and possession taken.
8. **Open Citizen Status Portal (`/citizen`)**
   - Search `CITIZEN-12345` or `PCL-00128` -> Transparent, privacy-preserving tracking of acquisition stage and payment confirmation.

---

## 🗄️ Database & PostGIS Migrations

Canonical migration sequence in `supabase/migrations/`:
1. `001_initial_schema.sql`: Core schema (PostGIS, projects, parcels, project_parcels, acquisition_cases, workflow, documents, RLS).
2. `002_reconciliation.sql`: System sync logs, statutory acts & legal mappings, reports.
3. `003_operational_demo_data.sql`: Idempotent seed data for Ambala corridor, workflow instances, tasks, external system mappings, and `case_activity` timeline.

---

## ⚖️ Legal & Mock Disclaimer

- **BhoomiRashi, State Land Records & PFMS**: Integrations are executable **MOCK / DEMO ADAPTERS**. Authoritative government systems retain sole legal authority.
- **Cadastral Geometry**: Parcel polygons and alignment LineStrings are **SYNTHETIC DEMO GIS DATA** in Ambala district (Haryana) created for demonstration purposes without real citizen personal information.
- **Workflow Representation**: Based on the National Highways Act, 1956 configurable statutory templates for software demonstration purposes only.
