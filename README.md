# N-LAMS — National Land Acquisition & Management System

N-LAMS is a national land-acquisition coordination, GIS corridor discovery, and monitoring orchestration platform developed as an SIH prototype. Existing departmental and state systems (such as BhoomiRashi, State Land Records, and PFMS) remain authoritative systems of record; N-LAMS provides the unified orchestration layer connecting projects, candidate cadastral parcels, cases, statutory workflow stages, geo-tagged field verification, reviewer scrutiny, compensation awards, possession, R&R, notifications, dashboards, reports, and citizen tracking.

The repository is structured into a clean, independently deployable client/server architecture with npm workspaces.

---

## 📁 Repository Structure

```text
sih-26/
├── client/                     # Frontend Application (Vite + React 19 + TypeScript)
│   ├── src/                    # Components, pages, layouts, state & API client
│   ├── index.html              # Frontend entry HTML
│   ├── vite.config.ts          # Vite build & dev configuration
│   ├── tsconfig.json           # Frontend TypeScript configuration
│   ├── .env.example            # Client environment variables template
│   └── package.json            # Client package dependencies & scripts
├── server/                     # Backend API Service (Node.js + Express 5 + TypeScript)
│   ├── src/                    # API routes, middleware, integrations & repositories
│   │   ├── app.ts              # Express application definition & middleware
│   │   ├── server.ts           # Server entrypoint (listening on 0.0.0.0)
│   │   ├── config/             # Environment configuration (env.ts)
│   │   ├── middleware/         # Authentication and error handling
│   │   ├── integrations/       # BhoomiRashi & external adapters
│   │   ├── repositories/       # Local JSON state store & master hierarchy
│   │   ├── routes/             # REST API endpoints (/api/*)
│   │   ├── storage/            # Object storage providers (Local / S3)
│   │   └── tests/              # Golden path automated end-to-end tests
│   ├── migrations/             # Canonical PostGIS / Supabase SQL schema migrations
│   ├── .data/                  # Persistent local JSON data runtime storage
│   ├── tsconfig.json           # Server TypeScript configuration
│   ├── .env.example            # Server environment variables template
│   └── package.json            # Server package dependencies & scripts
├── package.json                # Root workspace controller & orchestration scripts
├── tsconfig.json               # Root TypeScript reference config
└── README.md                   # Project documentation
```

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

## 🚀 Quick Start (Root Workspace)

Prerequisites: **Node.js 20+** and **npm**.

```bash
# 1. Install dependencies across all workspaces
npm install

# 2. Initialize / Seed the golden demo baseline
npm run seed

# 3. Run automated end-to-end golden flow tests (32 assertions)
npm test

# 4. Start both frontend and backend concurrently
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:4000 (API at /api, Health at /health)
```

### Root Workspace Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs both `client` and `server` in parallel |
| `npm run dev:client` | Starts only the frontend Vite development server (`http://localhost:5173`) |
| `npm run dev:server` | Starts only the backend Express API with hot-reload (`http://localhost:4000`) |
| `npm run build` | Builds both `client` and `server` production bundles |
| `npm run build:client` | Compiles client TypeScript and outputs Vite production build to `client/dist/` |
| `npm run build:server` | Compiles server TypeScript to `server/dist/` |
| `npm run start` | Runs the compiled production backend server (`node server/dist/server.js`) |
| `npm test` | Executes the full 32-step golden-path integration test suite |
| `npm run seed` | Resets local runtime state to the baseline master data |

---

## 📦 Independent Workspace Development

Both `client` and `server` can be built, tested, and run independently in isolation.

### 🌐 Frontend (`client/`)

```bash
cd client
npm install
npm run dev      # Start Vite dev server on http://localhost:5173
npm run build    # Build for production into client/dist/
npm run preview  # Preview production build locally
```

**Frontend Environment Variables (`client/.env.example`)**:
```env
VITE_API_URL=http://localhost:4000/api
VITE_APP_ENV=demo
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### ⚙️ Backend (`server/`)

```bash
cd server
npm install
npm run dev      # Start Express API with tsx watch on http://0.0.0.0:4000
npm run build    # Compile TypeScript into server/dist/
npm run test     # Run automated golden path tests
npm run seed     # Reset local runtime state
npm start        # Run compiled production server
```

**Backend Environment Variables (`server/.env.example`)**:
```env
PORT=4000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173
CLIENT_URL=http://localhost:5173
AUTH_MODE=demo
DATA_DRIVER=local-json
NLAMS_DATA_FILE=.data/nlams.json

# Optional Supabase Connection
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# Optional S3 Document Storage
STORAGE_DRIVER=local
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

# Optional AI Assistance
AI_PROVIDER=gemini
```

---

## 🩺 Health Check Endpoints

- **Server Root Health**: `GET /health` → `{"status": "ok", "service": "nlams-api"}`
- **API Health**: `GET /api/health` → `{"data": {"service": "n-lams-api", "status": "ok", "persistence": "local-json", ...}}`

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
   - Open **Integrations** → Click **[ SYNC PROJECTS ]** on BhoomiRashi.
   - Inspect synchronized project `NH-44 Corridor Expansion — Demo Section` (42 projects, 1,284 parcels, 248.6 ha required).
2. **Switch to Project Officer (`project@nlams.demo`)**
   - Open **Projects** → Select `NH-44 Corridor Expansion — Demo Section`.
   - Inspect alignment corridor map → Set buffer corridor (e.g. 100m).
   - Click **[ DISCOVER AFFECTED PARCELS ]** → Automatically imports candidate parcels, creates acquisition cases, and triggers workflow stages.
3. **Switch to Field Officer (`field@nlams.demo`)**
   - Open **My Field Tasks** → Select `PCL-00128` (Survey 142/3, Demo Village).
   - Fill in boundary checklist → Click **DEMO GPS** → Upload site photograph → Click **[ SUBMIT VERIFICATION ]**.
   - Observe live topbar notification and activity timeline update.
4. **Switch to Reviewing Officer (`reviewer@nlams.demo`)**
   - Open **Review Queue** → Inspect submitted photographic evidence, GPS coordinates, checklist, and parcel map.
   - Click **[ APPROVE & ADVANCE STAGE ]** → Workflow advances to Section 3G Compensation.
5. **Open Compensation (`/compensation`)**
   - Review assessed compensation of ₹11,25,000 for `PCL-00128` → Click **[ Approve Award ]**.
   - Click **[ PFMS DEMO sync ]** → Directly reconciles with PFMS mock DBT adapter, marking status as `PAID` with reference `DEMO-PFMS-2026-0042`.
6. **Open R&R (`/rr`)**
   - View affected and eligible families → Click **[ Deliver & Complete ]** → R&R marked complete.
7. **Open National Overview (`/`)**
   - Observe real-time metric updates for land acquired, compensation disbursed, and possession taken.
8. **Open Citizen Status Portal (`/citizen`)**
   - Search `CITIZEN-12345` or `PCL-00128` → Transparent, privacy-preserving tracking of acquisition stage and payment confirmation.

---

## 🗄️ Database & PostGIS Migrations

Canonical migration sequence in `server/migrations/`:
1. `001_initial_schema.sql`: Core schema (PostGIS, projects, parcels, project_parcels, acquisition_cases, workflow, documents, RLS).
2. `001_n_lams.sql`: N-LAMS schema extension.
3. `002_reconciliation.sql`: System sync logs, statutory acts & legal mappings, reports.
4. `003_operational_demo_data.sql`: Idempotent seed data for Ambala corridor, workflow instances, tasks, external system mappings, and `case_activity` timeline.
5. `004_master_authority_and_native_demo.sql`: Master authority hierarchy and native demo dataset.

---

## ⚖️ Legal & Mock Disclaimer

- **BhoomiRashi, State Land Records & PFMS**: Integrations are executable **MOCK / DEMO ADAPTERS**. Authoritative government systems retain sole legal authority.
- **Cadastral Geometry**: Parcel polygons and alignment LineStrings are **SYNTHETIC DEMO GIS DATA** in Ambala district (Haryana) created for demonstration purposes without real citizen personal information.
- **Workflow Representation**: Based on the National Highways Act, 1956 configurable statutory templates for software demonstration purposes only.
