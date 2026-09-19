-- ============================================================================
-- Migration 004: Master Authority Datasets, Jurisdictions & Native Demo Dataset
-- N-LAMS National Coordination & Monitoring Framework
-- Idempotent schema additions and seed data for Haryana demonstration.
-- ============================================================================

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Master Departments & Sponsoring Bodies
-- ----------------------------------------------------------------------------
create table if not exists public.master_departments (
  code text primary key,
  name text not null,
  state text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. Master Organizations / Executing Agencies
-- ----------------------------------------------------------------------------
create table if not exists public.master_organizations (
  code text primary key,
  name text not null,
  department_code text references public.master_departments(code) on delete set null,
  type text not null default 'PSU',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. Master Jurisdictions (Tehsils & Villages)
-- ----------------------------------------------------------------------------
create table if not exists public.master_tehsils (
  code text primary key,
  name text not null,
  district_code text not null,
  state_code text not null default 'HR',
  created_at timestamptz not null default now()
);

create table if not exists public.master_villages (
  code text primary key,
  name text not null,
  tehsil_code text not null references public.master_tehsils(code) on delete cascade,
  district_code text not null,
  census_code text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. Extend Profiles Table for Master Authority & Jurisdictions
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists designation text;
alter table public.profiles add column if not exists organization text;
alter table public.profiles add column if not exists department_code text;
alter table public.profiles add column if not exists jurisdiction_type text default 'DISTRICT';
alter table public.profiles add column if not exists state text default 'Haryana';
alter table public.profiles add column if not exists district text default 'Ambala';
alter table public.profiles add column if not exists tehsil text;
alter table public.profiles add column if not exists village text;
alter table public.profiles add column if not exists employee_ref text;
alter table public.profiles add column if not exists source_system text default 'HR-HRMS';

-- ----------------------------------------------------------------------------
-- 5. Master Cadastral Parcels Pool (State Land Records / Jamabandi)
-- ----------------------------------------------------------------------------
create table if not exists public.master_cadastral_parcels (
  id text primary key,
  parcel_id text not null unique,
  survey_number text not null,
  state text not null default 'Haryana',
  district text not null default 'Ambala',
  tehsil text not null,
  village text not null,
  owner_name text not null,
  owner_contact text,
  land_type text not null default 'Agricultural',
  area_hectares numeric(10, 4) not null default 1.0,
  market_value numeric(14, 2) not null default 1000000.0,
  status text not null default 'AVAILABLE',
  coordinates geometry(Polygon, 4326),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 6. Statutory Document Registry
-- ----------------------------------------------------------------------------
create table if not exists public.statutory_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  document_type text not null,
  project_id uuid references public.projects(id) on delete cascade,
  case_id uuid references public.acquisition_cases(id) on delete set null,
  stage text not null,
  file_name text not null,
  file_url text not null,
  file_size text default '1.2 MB',
  mime_type text default 'application/pdf',
  checksum text not null,
  version integer not null default 1,
  verified boolean not null default true,
  uploaded_by text not null,
  uploaded_at timestamptz not null default now()
);
create index if not exists statutory_docs_project_idx on public.statutory_documents(project_id);
create index if not exists statutory_docs_case_idx on public.statutory_documents(case_id);

-- ----------------------------------------------------------------------------
-- 7. Seed Master Departments & Organizations
-- ----------------------------------------------------------------------------
insert into public.master_departments (code, name, state)
values
  ('MORTH', 'Ministry of Road Transport and Highways', 'National'),
  ('HR_PWD', 'Haryana Public Works Department (B&R)', 'Haryana'),
  ('HR_REV', 'Haryana Department of Revenue and Disaster Management', 'Haryana'),
  ('HR_IND', 'Haryana Industries & Commerce Department', 'Haryana')
on conflict (code) do update set name = excluded.name, state = excluded.state;

insert into public.master_organizations (code, name, department_code, type)
values
  ('NHAI', 'National Highways Authority of India', 'MORTH', 'PSU'),
  ('HSIDC', 'Haryana State Infrastructure & Industrial Development Corp', 'HR_IND', 'State PSU'),
  ('HSRDC', 'Haryana State Roads & Bridges Development Corp', 'HR_PWD', 'State PSU'),
  ('CALA_AMB', 'Competent Authority Land Acquisition (CALA Ambala)', 'HR_REV', 'Statutory Body')
on conflict (code) do update set name = excluded.name, department_code = excluded.department_code;

-- ----------------------------------------------------------------------------
-- 8. Seed Master Jurisdictions (Haryana -> Ambala)
-- ----------------------------------------------------------------------------
insert into public.master_tehsils (code, name, district_code, state_code)
values
  ('TEH-AMB-01', 'Ambala', 'DIST-HR-AMB', 'HR'),
  ('TEH-SAHA-02', 'Saha', 'DIST-HR-AMB', 'HR')
on conflict (code) do update set name = excluded.name;

insert into public.master_villages (code, name, tehsil_code, district_code, census_code)
values
  ('VIL-DEMO-01', 'Demo Kalan', 'TEH-AMB-01', 'DIST-HR-AMB', '057400'),
  ('VIL-DEMO-02', 'Chandpur Demo', 'TEH-SAHA-02', 'DIST-HR-AMB', '057401')
on conflict (code) do update set name = excluded.name;

-- ----------------------------------------------------------------------------
-- 9. Seed Master Cadastral Parcels Pool (Ambala)
-- ----------------------------------------------------------------------------
insert into public.master_cadastral_parcels (id, parcel_id, survey_number, state, district, tehsil, village, owner_name, owner_contact, land_type, area_hectares, market_value, status)
values
  ('mp-01', 'HR-AMB-DK-101', '101/1', 'Haryana', 'Ambala', 'Ambala', 'Demo Kalan', 'Rajinder Kumar & Brothers', '+91 98120 11001', 'Agricultural (Irrigated)', 1.45, 1850000.0, 'AVAILABLE'),
  ('mp-02', 'HR-AMB-DK-102', '102/2', 'Haryana', 'Ambala', 'Ambala', 'Demo Kalan', 'Smt. Sunita Devi', '+91 98120 11002', 'Agricultural (Canal Fed)', 0.95, 1250000.0, 'AVAILABLE'),
  ('mp-03', 'HR-AMB-DK-103', '103/1', 'Haryana', 'Ambala', 'Ambala', 'Demo Kalan', 'Gurpreet Singh Dhillon', '+91 98120 11003', 'Commercial / Highway Frontage', 0.60, 2400000.0, 'AVAILABLE'),
  ('mp-04', 'HR-AMB-DK-104', '104/2', 'Haryana', 'Ambala', 'Ambala', 'Demo Kalan', 'Virender Sharma', '+91 98120 11004', 'Agricultural (Barani)', 1.80, 1950000.0, 'AVAILABLE'),
  ('mp-05', 'HR-AMB-CD-201', '201/1', 'Haryana', 'Ambala', 'Saha', 'Chandpur Demo', 'Harbhajan Singh', '+91 98120 22001', 'Agricultural (Irrigated)', 2.10, 2600000.0, 'AVAILABLE'),
  ('mp-06', 'HR-AMB-CD-202', '202/2', 'Haryana', 'Ambala', 'Saha', 'Chandpur Demo', 'Mukesh Chand & Sons', '+91 98120 22002', 'Residential / Abadi Deh', 0.40, 1600000.0, 'AVAILABLE'),
  ('mp-07', 'HR-AMB-CD-203', '203/1', 'Haryana', 'Ambala', 'Saha', 'Chandpur Demo', 'Pritam Kaur', '+91 98120 22003', 'Agricultural (Tubewell)', 1.25, 1550000.0, 'AVAILABLE')
on conflict (id) do update set
  owner_name = excluded.owner_name,
  market_value = excluded.market_value,
  status = excluded.status;

-- ----------------------------------------------------------------------------
-- 10. Seed Master Profiles / Demonstration Personas
-- ----------------------------------------------------------------------------
insert into public.profiles (
  id, email, full_name, role, designation, organization, department_code,
  jurisdiction_type, state, district, tehsil, village, employee_ref, source_system
)
values
  ('11111111-1111-1111-1111-111111111101', 'national.admin@demo.nlams.gov', 'Shri Rajesh Verma, IAS', 'NATIONAL_ADMIN', 'Joint Secretary (Land Acquisition & Highways)', 'MoRTH National Directorate', 'MORTH', 'NATIONAL', 'Haryana', 'Ambala', null, null, 'EMP-NAT-001', 'NIC-SPARROW'),
  ('11111111-1111-1111-1111-111111111102', 'project.authority@demo.nlams.gov', 'Er. Sandeep Gulati', 'PROJECT_OFFICER', 'Superintending Engineer (Infrastructure Planning)', 'Haryana State Infrastructure & Industrial Development Corp (HSIIDC)', 'HR_IND', 'STATE', 'Haryana', 'Ambala', null, null, 'EMP-HR-HSIIDC-104', 'HR-HRMS'),
  ('11111111-1111-1111-1111-111111111103', 'district.officer@demo.nlams.gov', 'Dr. Shalini Aggarwal, HCS', 'DISTRICT_OFFICER', 'Competent Authority Land Acquisition (CALA) / SDM Ambala', 'District Administration Ambala', 'HR_REV', 'DISTRICT', 'Haryana', 'Ambala', null, null, 'EMP-CALA-AMB-01', 'HR-HRMS'),
  ('11111111-1111-1111-1111-111111111104', 'field.ambala@demo.nlams.gov', 'Shri Ramesh Kumar Patwari', 'FIELD_OFFICER', 'Halqa Patwari (Revenue Field Inspector)', 'Tehsil Revenue Office Ambala', 'HR_REV', 'TEHSIL', 'Haryana', 'Ambala', 'Ambala', 'Demo Kalan', 'EMP-PAT-AMB-12', 'HR-HRMS'),
  ('11111111-1111-1111-1111-111111111105', 'reviewer.ambala@demo.nlams.gov', 'Shri Anil Chhabra, Naib Tehsildar', 'REVIEWER', 'Revenue Scrutiny Officer & Sub-Registrar', 'Tehsil Revenue Office Ambala', 'HR_REV', 'TEHSIL', 'Haryana', 'Ambala', 'Ambala', null, 'EMP-NT-AMB-04', 'HR-HRMS'),
  ('11111111-1111-1111-1111-111111111106', 'compensation.ambala@demo.nlams.gov', 'Shri Manjeet Singh', 'COMPENSATION_OFFICER', 'Land Acquisition Compensation Officer (LACO)', 'CALA Finance Division Ambala', 'HR_REV', 'DISTRICT', 'Haryana', 'Ambala', null, null, 'EMP-LACO-AMB-02', 'HR-HRMS'),
  ('11111111-1111-1111-1111-111111111107', 'compensation.review@demo.nlams.gov', 'Smt. Kavita Mehta', 'COMPENSATION_REVIEWER', 'Senior Accounts Officer / Finance Reviewer', 'CALA Accounts Division Ambala', 'HR_REV', 'DISTRICT', 'Haryana', 'Ambala', null, null, 'EMP-FIN-AMB-08', 'HR-HRMS'),
  ('11111111-1111-1111-1111-111111111108', 'rr.ambala@demo.nlams.gov', 'Shri Deepak Saini', 'RR_OFFICER', 'Rehabilitation & Resettlement Officer', 'Social Development Division Ambala', 'HR_REV', 'DISTRICT', 'Haryana', 'Ambala', null, null, 'EMP-RR-AMB-03', 'HR-HRMS'),
  ('11111111-1111-1111-1111-111111111109', 'rr.review@demo.nlams.gov', 'Smt. Neha Bansal', 'RR_REVIEWER', 'R&R Scrutiny & Approval Authority', 'District Social Welfare Directorate Ambala', 'HR_REV', 'DISTRICT', 'Haryana', 'Ambala', null, null, 'EMP-RRREV-AMB-01', 'HR-HRMS'),
  ('11111111-1111-1111-1111-111111111110', 'possession.ambala@demo.nlams.gov', 'Shri Gurmukh Singh, Tehsildar', 'DISTRICT_OFFICER', 'Tehsildar (Possession & Land Handover Authority)', 'Tehsil Revenue Office Ambala', 'HR_REV', 'TEHSIL', 'Haryana', 'Ambala', 'Ambala', null, 'EMP-TEH-AMB-01', 'HR-HRMS'),
  ('11111111-1111-1111-1111-111111111111', 'viewer@demo.nlams.gov', 'General Public / Ministry Observer', 'VIEWER', 'Public Oversight & Citizen Observer', 'National Governance Portal', 'MORTH', 'NATIONAL', 'Haryana', 'Ambala', null, null, 'EMP-PUB-001', 'GOV-OPEN')
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  role = excluded.role,
  designation = excluded.designation,
  organization = excluded.organization,
  department_code = excluded.department_code,
  jurisdiction_type = excluded.jurisdiction_type,
  employee_ref = excluded.employee_ref;

-- End of migration 004
