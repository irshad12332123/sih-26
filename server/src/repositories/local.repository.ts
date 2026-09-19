import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export type DemoRole =
  | "SUPER_ADMIN"
  | "NATIONAL_ADMIN"
  | "DEPARTMENT_ADMIN"
  | "PROJECT_OFFICER"
  | "DISTRICT_OFFICER"
  | "FIELD_OFFICER"
  | "REVIEWER"
  | "VIEWER";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: DemoRole;
  department?: string;
  state?: string;
  district?: string;
  tehsil?: string;
  village?: string;
  officerCode?: string;
  assignedProjects?: string[];
  password: string;
}

export interface Project {
  id: string;
  projectId: string;
  name: string;
  department: string;
  authority: string;
  type: string;
  state: string;
  district: string;
  tehsil: string;
  village: string;
  status: string;
  progress: number;
  targetDate: string;
  description: string;
  alignment: [number, number][];
  bufferMeters?: number;
  workflowTemplateId: string;
  sourceSystem?: string;
  externalProjectId?: string;
  landRequiredHa?: number;
  landAcquiredHa?: number;
  affectedParcelsCount?: number;
  bhoomiRashiStats?: {
    section3A: string;
    section3CObjections: number;
    section3D: string;
    section3GCases: number;
    section3HPayments: number;
    section3EPossessions: number;
  };
  createdAt: string;
}

export interface Parcel {
  id: string;
  parcelId: string;
  externalId: string;
  projectId: string;
  state: string;
  district: string;
  tehsil: string;
  village: string;
  surveyNumber: string;
  ownerReference: string;
  totalArea: number;
  requiredArea: number;
  geometry: [number, number][];
  sourceSystem: string;
  sourceReference: string;
  acquisitionStatus: string;
  caseId?: string;
  discoveryMethod?: string;
  discoveredAt?: string;
}

export interface Case {
  id: string;
  caseId: string;
  projectId: string;
  parcelId: string;
  status: string;
  risk: string;
  priority: string;
  currentStage: string;
  progress: number;
  assignedOfficerId?: string;
  dueDate?: string;
  externalRefs: { system: string; id: string }[];
  acquisitionPurpose: string;
  createdAt: string;
}

export interface WorkflowStage {
  id: string;
  templateId: string;
  name: string;
  sequence: number;
  legalSection?: string;
  responsibleRole: DemoRole;
  requiredDocuments: string[];
  slaDays: number;
  approvalRequired: boolean;
}

export interface FieldChecklist {
  physicallyIdentified: boolean;
  boundaryVerified: boolean;
  landUseVerified: boolean;
  structureAffected: boolean;
  encroachmentObserved: boolean;
}

export interface FieldEvidence {
  id: string;
  projectId: string;
  parcelId: string;
  caseId: string;
  taskId: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: string;
  evidenceType: string;
  latitude: number;
  longitude: number;
  isDemoGps: boolean;
  captureTimestamp: string;
  remarks: string;
  checklist: FieldChecklist;
  photoUrls: string[];
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "CORRECTION_REQUESTED";
}

export interface Task {
  id: string;
  caseId: string;
  stageId: string;
  status:
    | "PENDING"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "REJECTED"
    | "CORRECTION_REQUESTED"
    | "OVERDUE";
  assignedUserId?: string;
  dueAt: string;
  remarks?: string;
  completedAt?: string;
  evidence?: FieldEvidence;
}

export interface CaseActivity {
  id: string;
  caseId: string;
  actorId: string;
  actorRole: string;
  actorName: string;
  eventType: string;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientId?: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  projectId?: string;
  caseId?: string;
  taskId?: string;
  readAt?: string;
  createdAt: string;
}

export interface Audit {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Compensation {
  id: string;
  caseId: string;
  caseReference: string;
  parcelId: string;
  village: string;
  assessedAmount: number;
  approvedAmount: number;
  paidAmount: number;
  status: "ASSESSED" | "UNDER_REVIEW" | "APPROVED" | "PAYMENT_PENDING" | "PAID" | "RECONCILIATION_REQUIRED";
  paymentReference?: string;
  paymentDate?: string;
  sourceSystem: string;
  externalReference?: string;
  lastSyncedAt?: string;
}

export interface RR {
  id: string;
  caseId: string;
  caseReference: string;
  parcelId: string;
  village: string;
  affectedFamilies: number;
  displacedFamilies: number;
  eligibleFamilies: number;
  benefitsDelivered: number;
  status: "IDENTIFIED" | "ELIGIBILITY_ASSESSED" | "BENEFITS_PENDING" | "PARTIALLY_DELIVERED" | "COMPLETED";
  sourceSystem: string;
}

export interface Possession {
  id: string;
  caseId: string;
  caseReference: string;
  parcelId: string;
  village: string;
  status: "NOT_READY" | "READY" | "POSSESSION_PENDING" | "POSSESSION_COMPLETED";
  noticeDate?: string;
  possessionDate?: string;
  officerId?: string;
  remarks?: string;
}

export interface ExternalMapping {
  id: string;
  externalSystem: string;
  externalId: string;
  localId: string;
  entityType: "PROJECT" | "PARCEL" | "CASE";
  lastSyncedAt: string;
  syncStatus: string;
}

export interface SyncLog {
  id: string;
  system: string;
  status: string;
  records: number;
  message: string;
  syncedAt: string;
}

export interface State {
  users: User[];
  projects: Project[];
  parcels: Parcel[];
  cases: Case[];
  stages: WorkflowStage[];
  tasks: Task[];
  caseActivity: CaseActivity[];
  notifications: Notification[];
  audits: Audit[];
  compensations: Compensation[];
  rr: RR[];
  possessions: Possession[];
  externalMappings: ExternalMapping[];
  syncLogs: SyncLog[];
}

const path = resolve(process.env.NLAMS_DATA_FILE || ".data/nlams.json");
const now = () => new Date().toISOString();
export const uid = () => randomUUID();

export const seededUsers: User[] = [
  {
    id: "superadmin@nlams.demo",
    email: "superadmin@nlams.demo",
    displayName: "Super Admin",
    role: "SUPER_ADMIN",
    department: "MORTH-DEMO",
    password: "Admin@123",
  },
  {
    id: "national@nlams.demo",
    email: "national@nlams.demo",
    displayName: "National Admin (MoRTH)",
    role: "NATIONAL_ADMIN",
    department: "Ministry of Road Transport & Highways — DEMO",
    password: "National@123",
  },
  {
    id: "department@nlams.demo",
    email: "department@nlams.demo",
    displayName: "Department Authority",
    role: "DEPARTMENT_ADMIN",
    department: "NHAI Land Acquisition Cell",
    password: "Department@123",
  },
  {
    id: "project@nlams.demo",
    email: "project@nlams.demo",
    displayName: "Project Officer (Ambala Corridor)",
    role: "PROJECT_OFFICER",
    department: "NHAI Ambala Project Implementation Unit",
    state: "Haryana",
    district: "Ambala",
    assignedProjects: ["prj-nh44-demo"],
    password: "Project@123",
  },
  {
    id: "district@nlams.demo",
    email: "district@nlams.demo",
    displayName: "District Competent Authority (CALA Ambala)",
    role: "DISTRICT_OFFICER",
    state: "Haryana",
    district: "Ambala",
    password: "District@123",
  },
  {
    id: "field@nlams.demo",
    email: "field@nlams.demo",
    displayName: "Field Officer (FO-AMB-01)",
    role: "FIELD_OFFICER",
    officerCode: "FO-AMB-01",
    state: "Haryana",
    district: "Ambala",
    tehsil: "Ambala",
    village: "Demo Village",
    assignedProjects: ["prj-nh44-demo"],
    password: "Field@123",
  },
  {
    id: "reviewer@nlams.demo",
    email: "reviewer@nlams.demo",
    displayName: "Reviewing Officer (REV-AMB-01)",
    role: "REVIEWER",
    officerCode: "REV-AMB-01",
    state: "Haryana",
    district: "Ambala",
    assignedProjects: ["prj-nh44-demo"],
    password: "Reviewer@123",
  },
  {
    id: "viewer@nlams.demo",
    email: "viewer@nlams.demo",
    displayName: "Public / Ministry Viewer",
    role: "VIEWER",
    password: "Viewer@123",
  },
];

export function findResponsibleOfficer(
  state: State,
  criteria: {
    requiredRole: DemoRole;
    projectId?: string;
    stateName?: string;
    districtName?: string;
    tehsilName?: string;
    villageName?: string;
  },
): User {
  const matching = state.users.filter((u) => u.role === criteria.requiredRole);
  if (matching.length === 0) return state.users[0];

  // 1. Check project assignment
  if (criteria.projectId) {
    const projectOfficer = matching.find((u) =>
      u.assignedProjects?.includes(criteria.projectId!),
    );
    if (projectOfficer) return projectOfficer;
  }

  // 2. Check village / tehsil / district match
  if (criteria.villageName) {
    const villageOfficer = matching.find(
      (u) => u.village?.toLowerCase() === criteria.villageName?.toLowerCase(),
    );
    if (villageOfficer) return villageOfficer;
  }
  if (criteria.districtName) {
    const districtOfficer = matching.find(
      (u) => u.district?.toLowerCase() === criteria.districtName?.toLowerCase(),
    );
    if (districtOfficer) return districtOfficer;
  }

  // Fallback to first role match
  return matching[0];
}

export function seed(): State {
  const templateId = "HIGHWAY_DEMO_WORKFLOW";
  const projectId = "prj-nh44-demo";

  const stages: WorkflowStage[] = [
    {
      id: "stage-3a",
      templateId,
      name: "3A Preliminary Notification",
      sequence: 1,
      legalSection: "3A",
      responsibleRole: "PROJECT_OFFICER",
      requiredDocuments: ["Section 3A Gazette Notification"],
      slaDays: 7,
      approvalRequired: false,
    },
    {
      id: "stage-3c",
      templateId,
      name: "3C Objection Hearing",
      sequence: 2,
      legalSection: "3C",
      responsibleRole: "DISTRICT_OFFICER",
      requiredDocuments: ["Objection Application", "Hearing Record"],
      slaDays: 14,
      approvalRequired: false,
    },
    {
      id: "stage-field-verif",
      templateId,
      name: "Field Verification",
      sequence: 3,
      legalSection: "3C(2)",
      responsibleRole: "FIELD_OFFICER",
      requiredDocuments: ["Field Verification Report", "Geo-tagged Site Photographs"],
      slaDays: 5,
      approvalRequired: false,
    },
    {
      id: "stage-review",
      templateId,
      name: "Review & Approval",
      sequence: 4,
      legalSection: "3C(3)",
      responsibleRole: "REVIEWER",
      requiredDocuments: ["Review Note"],
      slaDays: 3,
      approvalRequired: true,
    },
    {
      id: "stage-3d",
      templateId,
      name: "3D Declaration of Acquisition",
      sequence: 5,
      legalSection: "3D",
      responsibleRole: "NATIONAL_ADMIN",
      requiredDocuments: ["Section 3D Declaration Gazette"],
      slaDays: 7,
      approvalRequired: true,
    },
    {
      id: "stage-3g",
      templateId,
      name: "3G Compensation Determination",
      sequence: 6,
      legalSection: "3G",
      responsibleRole: "DEPARTMENT_ADMIN",
      requiredDocuments: ["Compensation Assessment Award"],
      slaDays: 21,
      approvalRequired: true,
    },
    {
      id: "stage-3h",
      templateId,
      name: "3H Deposit and Payment",
      sequence: 7,
      legalSection: "3H",
      responsibleRole: "PROJECT_OFFICER",
      requiredDocuments: ["PFMS Payment Advice"],
      slaDays: 14,
      approvalRequired: false,
    },
    {
      id: "stage-3e",
      templateId,
      name: "3E Taking Possession",
      sequence: 8,
      legalSection: "3E",
      responsibleRole: "DISTRICT_OFFICER",
      requiredDocuments: ["Possession Certificate"],
      slaDays: 14,
      approvalRequired: true,
    },
    {
      id: "stage-rr",
      templateId,
      name: "R&R Completion",
      sequence: 9,
      legalSection: "R&R",
      responsibleRole: "FIELD_OFFICER",
      requiredDocuments: ["R&R Delivery Report"],
      slaDays: 30,
      approvalRequired: false,
    },
  ];

  // Project Alignment in Ambala Corridor (Haryana)
  const projectAlignment: [number, number][] = [
    [30.362, 76.776],
    [30.380, 76.812],
    [30.395, 76.850],
    [30.407, 76.873],
  ];

  const project: Project = {
    id: projectId,
    projectId: "NH-DEMO-PB-001",
    name: "NH-44 Corridor Expansion — Demo Section",
    department: "Ministry of Road Transport & Highways — DEMO",
    authority: "CALA Ambala / NHAI PIU (Demo)",
    type: "National Highway",
    state: "Haryana",
    district: "Ambala",
    tehsil: "Ambala",
    village: "Demo Village",
    status: "In Progress",
    progress: 48,
    targetDate: "2027-03-31",
    description:
      "Synthetic corridor project for the N-LAMS national land-acquisition orchestration and monitoring demonstration. Fully connected to BhoomiRashi and PFMS mock adapters.",
    alignment: projectAlignment,
    bufferMeters: 100,
    workflowTemplateId: templateId,
    sourceSystem: "BhoomiRashi MOCK",
    externalProjectId: "BR-PROJ-DEMO-001",
    landRequiredHa: 248.6,
    landAcquiredHa: 137.4,
    affectedParcelsCount: 482,
    bhoomiRashiStats: {
      section3A: "COMPLETED",
      section3CObjections: 17,
      section3D: "COMPLETED",
      section3GCases: 312,
      section3HPayments: 278,
      section3EPossessions: 193,
    },
    createdAt: now(),
  };

  // 12 synthetic parcels in Ambala corridor
  const parcels: Parcel[] = Array.from({ length: 12 }, (_, i) => {
    const idx = i + 1;
    const lat = 30.362 + i * 0.0042;
    const lng = 76.776 + i * 0.0090;
    const parcelId = `PCL-${String(127 + idx).padStart(5, "0")}`;
    const externalId = `BR-PARCEL-DEMO-${String(idx).padStart(3, "0")}`;
    const caseId = `case-${idx}`;
    return {
      id: `parcel-${idx}`,
      parcelId,
      externalId,
      projectId,
      state: "Haryana",
      district: "Ambala",
      tehsil: "Ambala",
      village: idx % 2 === 0 ? "Demo Village" : "Corridor Kalan",
      surveyNumber: `${141 + idx}/${(idx % 4) + 1}`,
      ownerReference: `CITIZEN-${12344 + idx}`,
      totalArea: Number((2.4 + idx * 0.31).toFixed(2)),
      requiredArea: Number((1.1 + idx * 0.15).toFixed(2)),
      geometry: [
        [lat, lng],
        [lat + 0.0040, lng + 0.0035],
        [lat + 0.0030, lng + 0.0075],
        [lat - 0.0020, lng + 0.0050],
      ],
      sourceSystem: "BhoomiRashi MOCK / State Land Records",
      sourceReference: externalId,
      acquisitionStatus:
        idx === 1
          ? "FIELD_VERIFICATION_PENDING"
          : idx === 2
            ? "FIELD_VERIFICATION_SUBMITTED"
            : idx === 3
              ? "REVIEWER_APPROVED"
              : idx === 4
                ? "3C_OBJECTION"
                : idx === 5
                  ? "3D_DECLARATION"
                  : idx === 6
                    ? "3G_COMPENSATION_PENDING"
                    : idx === 7
                      ? "COMPENSATION_APPROVED"
                      : idx === 8
                        ? "PAYMENT_COMPLETED"
                        : idx === 9
                          ? "POSSESSION_READY"
                          : idx === 10
                            ? "POSSESSION_COMPLETED"
                            : idx === 11
                              ? "RR_IN_PROGRESS"
                              : "RR_COMPLETED",
      caseId,
      discoveryMethod: "ALIGNMENT_CORRIDOR_100M",
      discoveredAt: now(),
    };
  });

  // 12 Acquisition Cases
  const stageNames = [
    "Field Verification", // Case 1: Golden Case!
    "Review & Approval",
    "3C Objection Hearing",
    "3D Declaration of Acquisition",
    "3G Compensation Determination",
    "3G Compensation Determination",
    "3H Deposit and Payment",
    "3E Taking Possession",
    "Taking Possession",
    "R&R Completion",
    "R&R Completion",
    "Completed",
  ];

  const caseStatuses = [
    "Under Review", // Case 1
    "Under Review", // Case 2
    "In Progress",  // Case 3
    "In Progress",  // Case 4
    "In Progress",  // Case 5
    "In Progress",  // Case 6
    "Approved",     // Case 7
    "Payment Completed", // Case 8
    "Possession Ready",  // Case 9
    "Possession Completed", // Case 10
    "R&R In Progress",     // Case 11
    "Completed",           // Case 12
  ];

  const cases: Case[] = parcels.map((p, i) => {
    const idx = i + 1;
    const isGolden = idx === 1;
    return {
      id: `case-${idx}`,
      caseId: isGolden ? "NLA-C-00231" : `NLA-C-${String(230 + idx).padStart(5, "0")}`,
      projectId,
      parcelId: p.id,
      status: caseStatuses[i],
      risk: idx === 4 ? "High" : idx === 7 ? "Medium" : "Low",
      priority: idx === 1 || idx === 4 ? "HIGH" : "MEDIUM",
      currentStage: stageNames[i],
      progress: isGolden ? 30 : Math.round((idx / 12) * 100),
      assignedOfficerId:
        idx === 1
          ? "field@nlams.demo" // Assigned to FO-AMB-01
          : idx === 2
            ? "reviewer@nlams.demo"
            : idx % 2 === 0
              ? "district@nlams.demo"
              : "project@nlams.demo",
      dueDate: new Date(Date.now() + (idx - 3) * 86400000).toISOString(),
      externalRefs: [
        { system: "BhoomiRashi MOCK", id: `BR-CASE-DEMO-${String(idx).padStart(3, "0")}` },
        { system: "State Land Records", id: p.sourceReference },
      ],
      acquisitionPurpose: "NH-44 6-lane Greenfield Corridor Widening",
      createdAt: now(),
    };
  });

  // Tasks for all cases
  const tasks: Task[] = cases.map((c, i) => {
    const idx = i + 1;
    const isGolden = idx === 1;
    const currentStageObj =
      stages.find((s) => s.name === c.currentStage) || stages[2];

    return {
      id: `task-${idx}`,
      caseId: c.id,
      stageId: currentStageObj.id,
      status:
        isGolden
          ? "IN_PROGRESS"
          : idx === 2
            ? "PENDING"
            : idx > 9
              ? "COMPLETED"
              : "IN_PROGRESS",
      assignedUserId: c.assignedOfficerId,
      dueAt: c.dueDate || now(),
      remarks: isGolden
        ? "Conduct physical boundary inspection and upload geo-tagged field evidence."
        : `Task managed under ${currentStageObj.name}.`,
    };
  });

  // Golden Case Activity Timeline (Case 1: NLA-C-00231)
  const caseActivity: CaseActivity[] = [
    {
      id: uid(),
      caseId: "case-1",
      actorId: "national@nlams.demo",
      actorRole: "NATIONAL_ADMIN",
      actorName: "National Admin (MoRTH)",
      eventType: "PROJECT_SYNCED",
      message: "Synchronized NH-44 project definition from BhoomiRashi mock adapter.",
      metadata: { externalProjectId: "BR-PROJ-DEMO-001" },
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
    {
      id: uid(),
      caseId: "case-1",
      actorId: "project@nlams.demo",
      actorRole: "PROJECT_OFFICER",
      actorName: "Project Officer (Ambala Corridor)",
      eventType: "PARCEL_DISCOVERED",
      message: "Candidate parcel PCL-00128 identified along 100m acquisition corridor.",
      metadata: { surveyNumber: "142/3", village: "Demo Village", area: 2.71 },
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    },
    {
      id: uid(),
      caseId: "case-1",
      actorId: "project@nlams.demo",
      actorRole: "PROJECT_OFFICER",
      actorName: "Project Officer (Ambala Corridor)",
      eventType: "STAGE_COMPLETED",
      message: "Section 3A Preliminary Notification published in official gazette.",
      metadata: { legalSection: "3A", gazetteRef: "CG-DL-E-19092026-001" },
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
      id: uid(),
      caseId: "case-1",
      actorId: "district@nlams.demo",
      actorRole: "DISTRICT_OFFICER",
      actorName: "District Competent Authority (CALA Ambala)",
      eventType: "STAGE_COMPLETED",
      message: "Section 3C objection window completed without claims.",
      metadata: { legalSection: "3C", objectionsReceived: 0 },
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: uid(),
      caseId: "case-1",
      actorId: "district@nlams.demo",
      actorRole: "DISTRICT_OFFICER",
      actorName: "District Competent Authority (CALA Ambala)",
      eventType: "TASK_ASSIGNED",
      message: "Field verification dispatched to Field Officer FO-AMB-01 (Ambala).",
      metadata: { officer: "field@nlams.demo", officerCode: "FO-AMB-01" },
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ];

  // Compensation Records
  const compensations: Compensation[] = cases.map((c, i) => {
    const idx = i + 1;
    const assessed = 1000000 + idx * 125000;
    const approved = idx >= 5 ? 950000 + idx * 100000 : 0;
    const paid = idx >= 8 ? approved : 0;
    const status: Compensation["status"] =
      idx >= 8 ? "PAID" : idx >= 5 ? "APPROVED" : "ASSESSED";
    const ref = idx >= 8 ? `DEMO-PFMS-2026-${String(idx).padStart(4, "0")}` : undefined;

    return {
      id: `comp-${idx}`,
      caseId: c.id,
      caseReference: c.caseId,
      parcelId: parcels[i].parcelId,
      village: parcels[i].village,
      assessedAmount: assessed,
      approvedAmount: approved,
      paidAmount: paid,
      status,
      paymentReference: ref,
      paymentDate: idx >= 8 ? now() : undefined,
      sourceSystem: "PFMS (DEMO)",
      externalReference: ref,
      lastSyncedAt: now(),
    };
  });

  // R&R Records
  const rr: RR[] = cases.map((c, i) => {
    const idx = i + 1;
    const affected = 5 + idx;
    const eligible = 4 + idx;
    const delivered = idx >= 10 ? eligible : idx >= 7 ? Math.floor(eligible / 2) : 0;
    const status: RR["status"] =
      idx >= 10
        ? "COMPLETED"
        : idx >= 7
          ? "PARTIALLY_DELIVERED"
          : idx >= 4
            ? "ELIGIBILITY_ASSESSED"
            : "IDENTIFIED";

    return {
      id: `rr-${idx}`,
      caseId: c.id,
      caseReference: c.caseId,
      parcelId: parcels[i].parcelId,
      village: parcels[i].village,
      affectedFamilies: affected,
      displacedFamilies: idx % 3,
      eligibleFamilies: eligible,
      benefitsDelivered: delivered,
      status,
      sourceSystem: "N-LAMS DEMO R&R",
    };
  });

  // Possession Records
  const possessions: Possession[] = cases.map((c, i) => {
    const idx = i + 1;
    const status: Possession["status"] =
      idx >= 10
        ? "POSSESSION_COMPLETED"
        : idx >= 8
          ? "POSSESSION_PENDING"
          : idx >= 6
            ? "READY"
            : "NOT_READY";

    return {
      id: `pos-${idx}`,
      caseId: c.id,
      caseReference: c.caseId,
      parcelId: parcels[i].parcelId,
      village: parcels[i].village,
      status,
      noticeDate: idx >= 7 ? new Date(Date.now() - 10 * 86400000).toISOString() : undefined,
      possessionDate: idx >= 10 ? now() : undefined,
      officerId: "district@nlams.demo",
      remarks: idx >= 10 ? "Physical possession handed over to NHAI executing agency." : undefined,
    };
  });

  // External System Mappings
  const externalMappings: ExternalMapping[] = [
    {
      id: uid(),
      externalSystem: "BhoomiRashi",
      externalId: "BR-PROJ-DEMO-001",
      localId: projectId,
      entityType: "PROJECT",
      lastSyncedAt: now(),
      syncStatus: "SYNCHRONIZED",
    },
    ...parcels.map((p, i) => ({
      id: uid(),
      externalSystem: "BhoomiRashi",
      externalId: p.externalId,
      localId: p.parcelId,
      entityType: "PARCEL" as const,
      lastSyncedAt: now(),
      syncStatus: "SYNCHRONIZED",
    })),
    ...cases.map((c, i) => ({
      id: uid(),
      externalSystem: "BhoomiRashi",
      externalId: `BR-CASE-DEMO-${String(i + 1).padStart(3, "0")}`,
      localId: c.caseId,
      entityType: "CASE" as const,
      lastSyncedAt: now(),
      syncStatus: "SYNCHRONIZED",
    })),
  ];

  return {
    users: seededUsers,
    projects: [project],
    parcels,
    cases,
    stages,
    tasks,
    caseActivity,
    notifications: [
      {
        id: uid(),
        recipientId: "field@nlams.demo",
        type: "TASK_ASSIGNED",
        title: "Field Verification Task Assigned",
        message: "Conduct on-site inspection for parcel PCL-00128 (Survey 142/3) in Demo Village.",
        severity: "HIGH",
        projectId,
        caseId: "case-1",
        taskId: "task-1",
        createdAt: now(),
      },
      {
        id: uid(),
        recipientId: "national@nlams.demo",
        type: "PROJECT_SYNCED",
        title: "BhoomiRashi Sync Successful",
        message: "Imported 42 projects and 1,284 cadastral parcel references from BhoomiRashi MOCK.",
        severity: "INFO",
        projectId,
        createdAt: now(),
      },
    ],
    audits: [
      {
        id: uid(),
        actorId: "seed",
        action: "DEMO_SYSTEM_INITIALIZED",
        entityType: "SYSTEM",
        entityId: projectId,
        metadata: {
          project: "NH-44 Corridor Expansion — Demo Section",
          goldenCase: "NLA-C-00231",
          assignedOfficer: "FO-AMB-01",
        },
        createdAt: now(),
      },
    ],
    compensations,
    rr,
    possessions,
    externalMappings,
    syncLogs: [
      {
        id: uid(),
        system: "bhoomirashi",
        status: "MOCK CONNECTED",
        records: 42,
        message: "BhoomiRashi national project catalog synchronized successfully.",
        syncedAt: now(),
      },
      {
        id: uid(),
        system: "pfms",
        status: "MOCK CONNECTED",
        records: 12,
        message: "PFMS mock direct benefit transfer gateway connected.",
        syncedAt: now(),
      },
    ],
  };
}

export function loadState(): State {
  if (!existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true });
    const value = seed();
    writeFileSync(path, JSON.stringify(value, null, 2));
    return value;
  }
  try {
    const value = JSON.parse(readFileSync(path, "utf8")) as State;
    // ensure users retain passwords
    value.users = seededUsers.map((su) => {
      const existing = value.users?.find((u) => u.email === su.email);
      return existing ? { ...su, ...existing, password: su.password } : su;
    });
    if (!value.caseActivity) value.caseActivity = [];
    if (!value.externalMappings) value.externalMappings = [];
    return value;
  } catch {
    const value = seed();
    writeFileSync(path, JSON.stringify(value, null, 2));
    return value;
  }
}

export function saveState(value: State) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2));
}

export function resetState(): State {
  mkdirSync(dirname(path), { recursive: true });
  const value = seed();
  writeFileSync(path, JSON.stringify(value, null, 2));
  return value;
}

export function audit(
  state: State,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | undefined,
  metadata: Record<string, unknown> = {},
) {
  state.audits.unshift({
    id: uid(),
    actorId,
    action,
    entityType,
    entityId,
    metadata,
    createdAt: now(),
  });
}

export function addCaseActivity(
  state: State,
  caseId: string,
  actorId: string,
  eventType: string,
  message: string,
  metadata: Record<string, unknown> = {},
) {
  const actor = state.users.find((u) => u.id === actorId);
  state.caseActivity.unshift({
    id: uid(),
    caseId,
    actorId,
    actorRole: actor?.role || "SYSTEM",
    actorName: actor?.displayName || "System Automator",
    eventType,
    message,
    metadata,
    createdAt: now(),
  });
}

export function notify(
  state: State,
  input: Omit<Notification, "id" | "createdAt">,
) {
  state.notifications.unshift({ ...input, id: uid(), createdAt: now() });
}

export const dbPath = path;
