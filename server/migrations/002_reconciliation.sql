-- N-LAMS canonical extension. Apply after 001_initial_schema.sql.
-- 001_n_lams.sql is retained as an historical draft and must not be applied with this migration.
create table if not exists public.authorities (
  id uuid primary key default gen_random_uuid(), name text not null, code text unique not null,
  department_id uuid references public.departments(id), state_id uuid references public.states(id),
  district_id uuid references public.districts(id), created_at timestamptz not null default now()
);
create table if not exists public.integration_sync_logs (
  id uuid primary key default gen_random_uuid(), system_code text not null, adapter_key text not null,
  status text not null, records_synchronized integer not null default 0, error_message text,
  started_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists public.acts (
  id uuid primary key default gen_random_uuid(), name text not null, citation text not null,
  disclaimer text not null default 'Software demonstration only; not legal advice.', active boolean not null default true
);
create table if not exists public.act_sections (
  id uuid primary key default gen_random_uuid(), act_id uuid not null references public.acts(id) on delete cascade,
  section_code text not null, title text not null, description text, unique(act_id, section_code)
);
create table if not exists public.workflow_legal_mappings (
  id uuid primary key default gen_random_uuid(), stage_id uuid not null references public.workflow_stages(id) on delete cascade,
  act_section_id uuid not null references public.act_sections(id), unique(stage_id)
);
create table if not exists public.report_definitions (
  id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null,
  query_key text not null, created_at timestamptz not null default now()
);
create table if not exists public.report_runs (
  id uuid primary key default gen_random_uuid(), report_id uuid not null references public.report_definitions(id),
  requested_by uuid references public.profiles(id), filters jsonb not null default '{}', status text not null default 'COMPLETED',
  generated_at timestamptz not null default now()
);
alter table public.notifications add column if not exists severity text not null default 'INFO';
alter table public.notifications add column if not exists project_id uuid references public.projects(id);
alter table public.notifications add column if not exists case_id uuid references public.acquisition_cases(id);
alter table public.notifications add column if not exists task_id uuid references public.case_workflow_tasks(id);
insert into public.acts(name,citation) values ('National Highways Act, 1956','National Highways Act, 1956') on conflict do nothing;
