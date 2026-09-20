-- N-LAMS Supabase/PostGIS foundation. Apply in Supabase SQL Editor or with `supabase db push`.
create extension if not exists postgis;
create extension if not exists pgcrypto;

create type public.project_status as enum ('DRAFT','UNDER_SCRUTINY','APPROVED','IN_PROGRESS','AT_RISK','COMPLETED','CLOSED');
create type public.parcel_status as enum ('PROPOSED','VERIFIED','NOTIFIED','UNDER_ACQUISITION','AWARDED','COMPENSATED','POSSESSED','DISPUTED','WITHDRAWN');
create type public.risk_level as enum ('LOW','MEDIUM','HIGH','CRITICAL');

create table public.roles (id uuid primary key default gen_random_uuid(), code text unique not null, name text not null, description text);
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text not null, role_id uuid references public.roles(id), state text, district text, created_at timestamptz not null default now());
create table public.organizations (id uuid primary key default gen_random_uuid(), name text not null, kind text not null, state text, district text, created_at timestamptz not null default now());
create table public.projects (
 id uuid primary key default gen_random_uuid(), code text unique not null, name text not null, ministry text not null, project_type text not null, state text not null, district text not null,
 status project_status not null default 'DRAFT', risk risk_level not null default 'LOW', proposed_area_ha numeric(14,2) not null default 0, notified_area_ha numeric(14,2) not null default 0, acquired_area_ha numeric(14,2) not null default 0,
 compensation_percent numeric(5,2) not null default 0, affected_families integer not null default 0, progress_percent numeric(5,2) not null default 0, target_date date, description text, geometry geometry(MultiPolygon,4326), source_system text default 'N-LAMS demo', data_verified boolean not null default false,
 created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.land_parcels (
 id uuid primary key default gen_random_uuid(), parcel_number text unique not null, survey_number text not null, village text not null, tehsil text, district text not null, state text not null, area_hectares numeric(14,4) not null, land_type text, ownership_type text, status parcel_status not null default 'PROPOSED', project_id uuid references public.projects(id) on delete set null, geometry geometry(MultiPolygon,4326) not null, source_system text default 'Demo cadastral layer', source_synced_at timestamptz, record_version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.acquisition_cases (id uuid primary key default gen_random_uuid(), case_number text unique not null, project_id uuid not null references public.projects(id) on delete cascade, parcel_id uuid references public.land_parcels(id), current_stage text not null default 'PROJECT_PROPOSAL', status text not null default 'SUBMITTED', owner_id uuid references auth.users(id), due_date date, comments text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.workflow_tasks (id uuid primary key default gen_random_uuid(), case_id uuid not null references public.acquisition_cases(id) on delete cascade, stage text not null, status text not null default 'PENDING', assigned_to uuid references auth.users(id), due_date date, completed_at timestamptz, comments text);
create table public.compensation_assessments (id uuid primary key default gen_random_uuid(), case_id uuid not null references public.acquisition_cases(id) on delete cascade, amount_assessed numeric(16,2) not null default 0, amount_approved numeric(16,2) not null default 0, amount_paid numeric(16,2) not null default 0, payment_status text not null default 'PENDING', payment_reference text, paid_at timestamptz);
create table public.possession_records (id uuid primary key default gen_random_uuid(), case_id uuid not null references public.acquisition_cases(id) on delete cascade, status text not null default 'PENDING', scheduled_date date, actual_date date, officer_id uuid references auth.users(id), handed_to text, remarks text);
create table public.rr_records (id uuid primary key default gen_random_uuid(), case_id uuid not null references public.acquisition_cases(id) on delete cascade, affected_families integer not null default 0, displaced_families integer not null default 0, eligible_families integer not null default 0, benefits_delivered integer not null default 0, status text not null default 'IN_PROGRESS', package_name text);
create table public.documents (id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id) on delete cascade, case_id uuid references public.acquisition_cases(id) on delete cascade, name text not null, document_type text not null, storage_path text not null, mime_type text, size_bytes bigint, version integer not null default 1, uploaded_by uuid references auth.users(id), created_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(), recipient_id uuid references auth.users(id) on delete cascade, title text not null, body text not null, priority text not null default 'MEDIUM', read_at timestamptz, created_at timestamptz not null default now());
create table public.audit_logs (id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id), action text not null, entity_type text not null, entity_id uuid, old_value jsonb, new_value jsonb, metadata jsonb, created_at timestamptz not null default now());

create index land_parcels_geometry_gix on public.land_parcels using gist (geometry);
create index projects_geometry_gix on public.projects using gist (geometry);
create index projects_state_idx on public.projects(state); create index projects_status_idx on public.projects(status); create index parcels_project_idx on public.land_parcels(project_id); create index audit_created_idx on public.audit_logs(created_at desc);

create or replace view public.dashboard_summary as select count(*)::int as total_projects, coalesce(sum(proposed_area_ha),0) as proposed_area_ha, coalesce(sum(notified_area_ha),0) as notified_area_ha, coalesce(sum(acquired_area_ha),0) as acquired_area_ha, coalesce(sum(affected_families),0)::int as affected_families, count(*) filter (where status='AT_RISK')::int as delayed_cases from public.projects;
alter table public.projects enable row level security; alter table public.land_parcels enable row level security; alter table public.acquisition_cases enable row level security; alter table public.documents enable row level security; alter table public.notifications enable row level security; alter table public.audit_logs enable row level security;
create policy "authenticated users can read projects" on public.projects for select to authenticated using (true);
create policy "authenticated users can read parcels" on public.land_parcels for select to authenticated using (true);
create policy "authenticated users can read cases" on public.acquisition_cases for select to authenticated using (true);
create policy "authenticated users can read documents" on public.documents for select to authenticated using (true);
create policy "users read own notifications" on public.notifications for select to authenticated using (recipient_id=auth.uid());
create policy "authenticated users read audit" on public.audit_logs for select to authenticated using (true);
insert into public.roles(code,name) values ('NATIONAL_ADMIN','National Administrator'),('STATE_ADMIN','State Administrator'),('DISTRICT_OFFICER','District Officer'),('FIELD_OFFICER','Field Officer'),('VIEWER','Decision Maker') on conflict (code) do nothing;
