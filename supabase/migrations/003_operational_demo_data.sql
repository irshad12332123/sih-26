-- Operational dashboard data, relationships, and an idempotent demo dataset.
-- Apply after 001_initial_schema.sql and 002_reconciliation.sql.

create extension if not exists postgis;
create extension if not exists pgcrypto;

create table if not exists public.case_activity (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.acquisition_cases(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  message text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists case_activity_case_created_idx on public.case_activity(case_id, created_at desc);

-- Keep the aggregate R&R fields used by the operational dashboard alongside
-- the individual-family fields from the base schema.
alter table public.rr_records add column if not exists affected_families integer not null default 0;
alter table public.rr_records add column if not exists displaced_families integer not null default 0;
alter table public.rr_records add column if not exists eligible_families integer not null default 0;
alter table public.rr_records add column if not exists benefits_delivered integer not null default 0;
alter table public.rr_records add column if not exists source_system text not null default 'N-LAMS';
alter table public.compensation_records add column if not exists source_system text not null default 'N-LAMS';
alter table public.compensation_records add column if not exists external_reference text;

-- Ensure unique constraint on districts for state_id + name
create unique index if not exists districts_state_name_idx on public.districts(state_id, name);

-- Views intentionally join through project_parcels, so records on both
-- financial screens always lead back to the same case and cadastral parcel.
create or replace view public.compensation_dashboard as
select
  cr.id, ac.case_id as case_reference, ac.id as case_uuid,
  p.name as project_name, pr.parcel_id, pr.village,
  cr.eligible_amount as assessed_amount, cr.award_amount as approved_amount,
  cr.paid_amount, cr.payment_status as status, cr.payment_reference,
  cr.source_system, cr.external_reference,
  cr.last_synchronized_at
from public.compensation_records cr
join public.acquisition_cases ac on ac.id = cr.case_id
join public.projects p on p.id = ac.project_id
join public.project_parcels pp on pp.id = ac.project_parcel_id
join public.parcels pr on pr.id = pp.parcel_id;

create or replace view public.rr_dashboard as
select
  rr.id, ac.case_id as case_reference, ac.id as case_uuid,
  p.name as project_name, pr.parcel_id, pr.village,
  rr.affected_families, rr.displaced_families, rr.eligible_families,
  rr.benefits_delivered, rr.status, rr.source_system
from public.rr_records rr
join public.acquisition_cases ac on ac.id = rr.case_id
join public.projects p on p.id = ac.project_id
join public.project_parcels pp on pp.id = ac.project_parcel_id
join public.parcels pr on pr.id = pp.parcel_id;

-- Seed External Systems
insert into public.external_systems (id, code, name, adapter_key, is_mock)
values
  ('90000000-0000-0000-0000-000000000001', 'BHOOMIRASHI', 'BhoomiRashi Portal (DEMO)', 'MockBhoomiRashiAdapter', true),
  ('90000000-0000-0000-0000-000000000002', 'PFMS', 'Public Financial Management System (DEMO)', 'MockPfmsAdapter', true),
  ('90000000-0000-0000-0000-000000000003', 'STATE_LAND_RECORDS', 'State Cadastral Land Records (DEMO)', 'MockLandRecordsAdapter', true)
on conflict (code) do update set name = excluded.name, adapter_key = excluded.adapter_key, is_mock = excluded.is_mock;

-- Seed Reference Geographies and Departments
insert into public.departments (id, name, code)
values ('10000000-0000-0000-0000-000000000001', 'Ministry of Road Transport & Highways — Demo', 'MORTH-DEMO')
on conflict (code) do update set name = excluded.name;

insert into public.states (id, name, code)
values ('10000000-0000-0000-0000-000000000002', 'Haryana', 'HR')
on conflict (code) do update set name = excluded.name;

insert into public.districts (id, state_id, name)
select '10000000-0000-0000-0000-000000000003', s.id, 'Ambala'
from public.states s where s.code = 'HR'
on conflict (state_id, name) do update set name = excluded.name;

-- Seed Workflow Template & Stages for Highway Corridor Acquisition
insert into public.workflow_templates (id, name, version, active)
values ('a0000000-0000-0000-0000-000000000001', 'HIGHWAY_DEMO_WORKFLOW', 1, true)
on conflict (id) do update set name = excluded.name, active = true;

insert into public.workflow_stages (id, template_id, stage_name, sequence, responsible_role, required_documents, approval_required)
values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '3A Preliminary Notification', 1, 'PROJECT_OFFICER', '["Section 3A Notification"]'::jsonb, false),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '3C Objection Hearing', 2, 'DISTRICT_OFFICER', '["Objection Application", "Hearing Record"]'::jsonb, false),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Field Verification', 3, 'FIELD_OFFICER', '["Field Verification Report", "Geo-tagged Site Photographs"]'::jsonb, false),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Review & Approval', 4, 'REVIEWER', '["Review Note"]'::jsonb, true),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '3D Declaration of Acquisition', 5, 'NATIONAL_ADMIN', '["Section 3D Declaration"]'::jsonb, true),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', '3G Compensation Determination', 6, 'DEPARTMENT_ADMIN', '["Compensation Assessment Award"]'::jsonb, true),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', '3H Deposit and Payment', 7, 'PROJECT_OFFICER', '["Payment Advice", "PFMS Acknowledgement"]'::jsonb, false),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', '3E Taking Possession', 8, 'DISTRICT_OFFICER', '["Possession Certificate"]'::jsonb, true),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'R&R Completion', 9, 'FIELD_OFFICER', '["R&R Benefit Delivery Report"]'::jsonb, false)
on conflict (template_id, sequence) do update set
  stage_name = excluded.stage_name,
  responsible_role = excluded.responsible_role,
  required_documents = excluded.required_documents,
  approval_required = excluded.approval_required;

-- Seed Demo Project
insert into public.projects (id, project_id, name, department_id, project_type, state_id, district_id, description, status, target_completion_date, geometry)
select
  '20000000-0000-0000-0000-000000000001', 'NH-DEMO-PB-001',
  'NH-44 Corridor Expansion — Demo Section', d.id, 'National Highway', s.id, di.id,
  'Synthetic corridor record for the N-LAMS demonstration in Ambala district. Connected to mock BhoomiRashi adapter.',
  'IN_PROGRESS', date '2027-03-31',
  st_setsrid(st_makeline(array[
    st_makepoint(76.776, 30.362),
    st_makepoint(76.812, 30.380),
    st_makepoint(76.850, 30.395),
    st_makepoint(76.873, 30.407)
  ]), 4326)
from public.departments d
join public.states s on s.code = 'HR'
join public.districts di on di.state_id = s.id and di.name = 'Ambala'
where d.code = 'MORTH-DEMO'
on conflict (project_id) do update set
  name = excluded.name,
  description = excluded.description,
  geometry = excluded.geometry,
  updated_at = now();

-- Seed 10 Synthetic Parcels along the Ambala Corridor
insert into public.parcels (id, parcel_id, state_id, district_id, tehsil, village, survey_number, total_area, geometry)
select
  ('30000000-0000-0000-0000-' || lpad(series::text, 12, '0'))::uuid,
  'PCL-' || lpad((127 + series)::text, 5, '0'),
  s.id, di.id, 'Ambala',
  case when series % 2 = 0 then 'Demo Village' else 'Corridor Kalan' end,
  (141 + series)::text || '/' || ((series % 4) + 1)::text,
  round((2.4 + (series * 0.31))::numeric, 4),
  st_makeenvelope(
    76.776 + (series * 0.0090),
    30.362 + (series * 0.0042),
    76.783 + (series * 0.0090),
    30.368 + (series * 0.0042),
    4326
  )
from generate_series(1, 10) as series
join public.states s on s.code = 'HR'
join public.districts di on di.state_id = s.id and di.name = 'Ambala'
on conflict (parcel_id) do update set
  total_area = excluded.total_area,
  geometry = excluded.geometry,
  village = excluded.village,
  survey_number = excluded.survey_number;

-- Seed Project-Parcel Associations
insert into public.project_parcels (id, project_id, parcel_id, required_area, affected_geometry)
select
  ('40000000-0000-0000-0000-' || lpad(series::text, 12, '0'))::uuid,
  p.id, pr.id,
  round((1.1 + (series * 0.15))::numeric, 4),
  pr.geometry
from generate_series(1, 10) as series
join public.projects p on p.project_id = 'NH-DEMO-PB-001'
join public.parcels pr on pr.parcel_id = 'PCL-' || lpad((127 + series)::text, 5, '0')
on conflict (project_id, parcel_id) do update set
  required_area = excluded.required_area,
  affected_geometry = excluded.affected_geometry;

-- Seed Acquisition Cases with Distinct Lifecycles
insert into public.acquisition_cases (id, case_id, project_id, project_parcel_id, land_owner_reference, status, priority, risk_level, current_stage, acquisition_purpose)
select
  ('50000000-0000-0000-0000-' || lpad(series::text, 12, '0'))::uuid,
  case when series = 1 then 'NLA-C-00231' else 'NLA-C-' || lpad((230 + series)::text, 5, '0') end,
  p.id, pp.id,
  'CITIZEN-' || (12344 + series)::text,
  case
    when series = 1 then 'UNDER_REVIEW'::public.case_status
    when series = 2 then 'UNDER_REVIEW'::public.case_status
    when series in (3, 4) then 'IN_PROGRESS'::public.case_status
    when series = 5 then 'APPROVED'::public.case_status
    when series = 6 then 'COMPENSATION_PENDING'::public.case_status
    when series = 7 then 'COMPENSATION_COMPLETED'::public.case_status
    when series = 8 then 'POSSESSION_PENDING'::public.case_status
    when series = 9 then 'POSSESSION_COMPLETED'::public.case_status
    else 'CLOSED'::public.case_status
  end,
  case when series in (3, 7) then 'HIGH' else 'MEDIUM' end,
  case when series = 3 then 'HIGH' else 'LOW' end,
  (array[
    'Field Verification',
    'Review & Approval',
    '3C Objection Hearing',
    '3D Declaration of Acquisition',
    '3G Compensation Determination',
    '3G Compensation Determination',
    '3H Deposit and Payment',
    '3E Taking Possession',
    'Possession Completed',
    'R&R Completion'
  ])[series],
  'NH-44 corridor expansion demonstration'
from generate_series(1, 10) as series
join public.projects p on p.project_id = 'NH-DEMO-PB-001'
join public.project_parcels pp on pp.id = ('40000000-0000-0000-0000-' || lpad(series::text, 12, '0'))::uuid
on conflict (case_id) do update set
  status = excluded.status,
  current_stage = excluded.current_stage,
  priority = excluded.priority,
  risk_level = excluded.risk_level;

-- Seed Workflow Instances for Cases
insert into public.case_workflow_instances (id, case_id, template_id, overall_progress)
select
  ('c0000000-0000-0000-0000-' || lpad(series::text, 12, '0'))::uuid,
  ac.id,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  case
    when series = 1 then 30.00
    when series = 2 then 40.00
    when series = 3 then 20.00
    when series = 4 then 50.00
    when series = 5 then 60.00
    when series = 6 then 65.00
    when series = 7 then 75.00
    when series = 8 then 85.00
    when series = 9 then 95.00
    else 100.00
  end
from generate_series(1, 10) as series
join public.acquisition_cases ac on ac.id = ('50000000-0000-0000-0000-' || lpad(series::text, 12, '0'))::uuid
on conflict (id) do update set overall_progress = excluded.overall_progress;

-- Seed Workflow Tasks for Golden Case NLA-C-00231 (Series 1)
insert into public.case_workflow_tasks (id, instance_id, stage_id, status, started_at, completed_at, remarks)
values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'COMPLETED', now() - interval '14 days', now() - interval '10 days', 'Section 3A gazette notification published.'),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'COMPLETED', now() - interval '9 days', now() - interval '4 days', 'No objections received under Section 3C.'),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'IN_PROGRESS', now() - interval '3 days', null, 'Field verification task pending on-site survey and photograph evidence.')
on conflict (id) do update set status = excluded.status, remarks = excluded.remarks;

-- Seed Case Activity Timeline for Golden Case NLA-C-00231
insert into public.case_activity (id, case_id, event_type, message, metadata, created_at)
values
  ('e0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'CASE_CREATED', 'Acquisition case initialized from alignment corridor discovery.', '{"source": "BhoomiRashi Adapter", "parcelId": "PCL-00128"}'::jsonb, now() - interval '15 days'),
  ('e0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'STAGE_COMPLETED', '3A Preliminary Notification published and verified.', '{"legalSection": "3A"}'::jsonb, now() - interval '10 days'),
  ('e0000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 'STAGE_COMPLETED', '3C Objection hearing period concluded without dispute.', '{"legalSection": "3C"}'::jsonb, now() - interval '4 days'),
  ('e0000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000001', 'TASK_ASSIGNED', 'Field verification assigned to FO-AMB-01 (Ambala).', '{"officer": "FO-AMB-01", "role": "FIELD_OFFICER"}'::jsonb, now() - interval '3 days')
on conflict (id) do nothing;

-- Seed Compensation Records
insert into public.compensation_records (id, case_id, eligible_amount, award_amount, paid_amount, payment_status, payment_reference, external_payment_system, source_system, external_reference, last_synchronized_at)
select
  ('60000000-0000-0000-0000-' || lpad(series::text, 12, '0'))::uuid,
  ac.id,
  1000000 + (series * 125000),
  case when series >= 5 then 950000 + (series * 100000) else 0 end,
  case when series >= 7 then 950000 + (series * 100000) else 0 end,
  case
    when series >= 7 then 'PAID'
    when series >= 5 then 'APPROVED'
    else 'ASSESSED'
  end,
  case when series >= 7 then 'DEMO-PFMS-2026-' || lpad(series::text, 4, '0') else null end,
  'PFMS (DEMO)',
  'PFMS (DEMO)',
  case when series >= 7 then 'DEMO-PFMS-2026-' || lpad(series::text, 4, '0') else null end,
  now()
from generate_series(1, 10) as series
join public.acquisition_cases ac on ac.id = ('50000000-0000-0000-0000-' || lpad(series::text, 12, '0'))::uuid
on conflict (case_id) do update set
  eligible_amount = excluded.eligible_amount,
  award_amount = excluded.award_amount,
  paid_amount = excluded.paid_amount,
  payment_status = excluded.payment_status,
  payment_reference = excluded.payment_reference,
  last_synchronized_at = now();

-- Seed R&R Records
insert into public.rr_records (id, case_id, affected_family_reference, eligible, entitlement_type, status, affected_families, displaced_families, eligible_families, benefits_delivered, source_system)
select
  ('70000000-0000-0000-0000-' || lpad(series::text, 12, '0'))::uuid,
  ac.id,
  'DEMO-FAMILY-GROUP-' || series,
  true,
  'Relocation assistance & livelihood allowance',
  case when series >= 8 then 'COMPLETED' else 'IN_PROGRESS' end,
  5 + series,
  series % 3,
  4 + series,
  case when series >= 8 then 4 + series else series end,
  'N-LAMS DEMO'
from generate_series(1, 10) as series
join public.acquisition_cases ac on ac.id = ('50000000-0000-0000-0000-' || lpad(series::text, 12, '0'))::uuid
on conflict (case_id) do update set
  affected_families = excluded.affected_families,
  displaced_families = excluded.displaced_families,
  eligible_families = excluded.eligible_families,
  benefits_delivered = excluded.benefits_delivered,
  status = excluded.status;

-- Seed Possession Records
insert into public.possession_records (id, case_id, status)
select
  ('80000000-0000-0000-0000-' || lpad(series::text, 12, '0'))::uuid,
  ac.id,
  case
    when series >= 9 then 'POSSESSION_COMPLETED'
    when series >= 7 then 'READY'
    when series >= 5 then 'POSSESSION_PENDING'
    else 'NOT_READY'
  end
from generate_series(1, 10) as series
join public.acquisition_cases ac on ac.id = ('50000000-0000-0000-0000-' || lpad(series::text, 12, '0'))::uuid
on conflict (case_id) do update set status = excluded.status;

-- Seed External References Mapping (BhoomiRashi -> Local)
insert into public.external_references (id, case_id, system_id, external_case_id, external_reference, last_synced_at)
select
  ('f0000000-0000-0000-0000-' || lpad(series::text, 12, '0'))::uuid,
  ac.id,
  '90000000-0000-0000-0000-000000000001'::uuid,
  'BR-CASE-DEMO-' || lpad(series::text, 3, '0'),
  'BR-PARCEL-DEMO-' || lpad(series::text, 3, '0'),
  now()
from generate_series(1, 10) as series
join public.acquisition_cases ac on ac.id = ('50000000-0000-0000-0000-' || lpad(series::text, 12, '0'))::uuid
on conflict (id) do update set last_synced_at = now();
