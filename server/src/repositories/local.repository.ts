import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { Role } from "../types.js";

export type DemoRole = Role;

export interface MasterDepartment {
  id: string;
  code: string;
  name: string;
  state: string;
  source: string;
}

export interface MasterOrganization {
  id: string;
  code: string;
  name: string;
  type: string;
  state: string;
  district?: string;
  source: string;
}

export interface MasterState {
  id: string;
  name: string;
  code: string;
}

export interface MasterDistrict {
  id: string;
  stateId: string;
  stateName: string;
  name: string;
  code: string;
}

export interface MasterTehsil {
  id: string;
  districtId: string;
  districtName: string;
  name: string;
  code: string;
}

export interface MasterVillage {
  id: string;
  tehsilId: string;
  tehsilName: string;
  districtName: string;
  stateName: string;
  name: string;
  code: string;
  pincode: string;
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  officerId: string;
  employeeReference: string;
  displayName: string;
  designation: string;
  role: DemoRole;
  department: string;
  organization: string;
  state: string;
  district: string;
  tehsil?: string;
  village?: string;
  jurisdictionType: "NATIONAL" | "STATE" | "DISTRICT" | "TEHSIL" | "VILLAGE";
  jurisdictionId: string;
  email: string;
  active: boolean;
  source: string;
  sourceReference: string;
  verifiedAt: string;
  assignedProjects?: string[];
  password: string;
  officerCode?: string;
}

export interface DocumentRecord {
  id: string;
  documentId: string;
  projectId?: string;
  caseId?: string;
  parcelId?: string;
  workflowStage?: string;
  documentType:
    | "PROJECT_APPROVAL"
    | "PRELIMINARY_NOTIFICATION"
    | "GAZETTE_NOTIFICATION"
    | "FIELD_VERIFICATION_REPORT"
    | "SURVEY_REPORT"
    | "OBJECTION_HEARING_RECORD"
    | "COMPENSATION_AWARD"
    | "PAYMENT_PROOF"
    | "RR_APPROVAL"
    | "POSSESSION_RECORD"
    | "COMPLETION_CERTIFICATE"
    | "OTHER";
  documentCategory: string;
  title: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  storageUrl: string;
  checksum: string;
  version: number;
  mandatory: boolean;
  approvalRequired: boolean;
  status: "UPLOADED" | "VALIDATED" | "APPROVED" | "REJECTED" | "SUPERSEDED";
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
  remarks?: string;
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
  sourceType?: "NATIVE" | "EXTERNAL";
  sourceSystem?: string;
  externalProjectId?: string;
  lastSyncedAt?: string;
  syncStatus?: "SUCCESS" | "PENDING" | "FAILED" | "NOT_SYNCED";
  landRequiredHa?: number;
  landAcquiredHa?: number;
  affectedParcelsCount?: number;
  isNative?: boolean;
  externalStage?: string;
  bhoomiRashiStats?: {
    externalStage: string;
    totalParcels: number;
    verifiedParcels: number;
    compensationApproved: number;
    possessionCompleted: number;
  };
  createdAt: string;
}

export interface Parcel {
  id: string;
  parcelId: string;
  externalId?: string;
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
  landStatus?: "AGRICULTURAL" | "COMMERCIAL" | "RESIDENTIAL" | "GOVERNMENT";
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
  requiredDepartment?: string;
  requiredDocuments: string[];
  mandatoryDocumentType?: DocumentRecord["documentType"];
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
  attachedDocumentId?: string;
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
  category?: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  entityType?: "PROJECT" | "CASE" | "TASK" | "PARCEL" | "DOCUMENT" | "COMPENSATION" | "RR" | "POSSESSION" | "INTEGRATION";
  entityId?: string;
  projectId?: string;
  caseId?: string;
  taskId?: string;
  readAt?: string;
  createdAt: string;
}

export interface Audit {
  id: string;
  actorId: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  remarks?: string;
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
  status: "PENDING" | "ASSESSED" | "APPROVED" | "PAID";
  paymentReference?: string;
  sourceSystem: string;
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
  status: "IDENTIFIED" | "ASSESSED" | "APPROVED" | "COMPLETED";
  sourceSystem: string;
}

export interface Possession {
  id: string;
  caseId: string;
  caseReference: string;
  parcelId: string;
  village: string;
  status: "NOT_READY" | "NOTICE_ISSUED" | "POSSESSION_COMPLETED";
  noticeDate?: string;
  possessionDate?: string;
  officerId?: string;
  remarks?: string;
}

export interface SyncOperation {
  id: string;
  externalSystem: string;
  externalProjectId: string;
  localProjectId: string;
  status: "SUCCESS" | "FAILED";
  projectsSynced: number;
  parcelsSynced: number;
  timestamp: string;
  details: string;
}

export interface State {
  masterDepartments: MasterDepartment[];
  masterOrganizations: MasterOrganization[];
  masterStates: MasterState[];
  masterDistricts: MasterDistrict[];
  masterTehsils: MasterTehsil[];
  masterVillages: MasterVillage[];
  masterParcelsPool: Parcel[];
  workflowStages: WorkflowStage[];
  users: User[];
  projects: Project[];
  parcels: Parcel[];
  cases: Case[];
  tasks: Task[];
  caseActivities: CaseActivity[];
  documents: DocumentRecord[];
  compensation: Compensation[];
  rr: RR[];
  possession: Possession[];
  notifications: Notification[];
  audit: Audit[];
  syncOperations: SyncOperation[];
}

export const uid = () => randomUUID();
export const now = () => new Date().toISOString();

// ============================================================================
// MASTER AUTHORITY REFERENCE DATASETS
// ============================================================================

export const masterDepartments: MasterDepartment[] = [
  {
    id: "dep-gov-morth",
    code: "MORTH",
    name: "Ministry of Road Transport and Highways (MoRTH)",
    state: "National",
    source: "SYNTHETIC DEMO MASTER DATA — https://morth.nic.in",
  },
  {
    id: "dep-hr-infra",
    code: "HR_INFRA",
    name: "Haryana State Infrastructure Authority / Irrigation & Water Resources",
    state: "Haryana",
    source: "SYNTHETIC DEMO MASTER DATA — https://haryana.gov.in",
  },
  {
    id: "dep-hr-revenue",
    code: "HR_REV",
    name: "Department of Revenue & Disaster Management, Haryana",
    state: "Haryana",
    source: "SYNTHETIC DEMO MASTER DATA — https://revenueharyana.gov.in",
  },
  {
    id: "dep-hr-pwd",
    code: "HR_PWD",
    name: "Public Works Department (B&R), Haryana",
    state: "Haryana",
    source: "SYNTHETIC DEMO MASTER DATA — https://haryanapwd.gov.in",
  },
];

export const masterOrganizations: MasterOrganization[] = [
  {
    id: "org-nhai",
    code: "NHAI",
    name: "National Highways Authority of India",
    type: "PSU / Autonomous Authority",
    state: "National",
    source: "SYNTHETIC DEMO MASTER DATA — https://nhai.gov.in",
  },
  {
    id: "org-hsiidc",
    code: "HSIIDC",
    name: "Haryana State Infrastructure & Industrial Development Corporation",
    type: "State Corporation",
    state: "Haryana",
    source: "SYNTHETIC DEMO MASTER DATA — https://hsiidc.org.in",
  },
  {
    id: "org-cala-ambala",
    code: "CALA_AMB",
    name: "Competent Authority for Land Acquisition, Ambala Sub-Division",
    type: "District Statutory Authority",
    state: "Haryana",
    district: "Ambala",
    source: "SYNTHETIC DEMO MASTER DATA — Ambala District Administration",
  },
];

export const masterStates: MasterState[] = [
  { id: "st-hr", name: "Haryana", code: "HR" },
  { id: "st-pb", name: "Punjab", code: "PB" },
  { id: "st-rj", name: "Rajasthan", code: "RJ" },
  { id: "st-up", name: "Uttar Pradesh", code: "UP" },
];

export const masterDistricts: MasterDistrict[] = [
  {
    id: "dist-ambala",
    stateId: "st-hr",
    stateName: "Haryana",
    name: "Ambala",
    code: "HR-AMB",
  },
  {
    id: "dist-karnal",
    stateId: "st-hr",
    stateName: "Haryana",
    name: "Karnal",
    code: "HR-KAR",
  },
  {
    id: "dist-panipat",
    stateId: "st-hr",
    stateName: "Haryana",
    name: "Panipat",
    code: "HR-PAN",
  },
  {
    id: "dist-kurukshetra",
    stateId: "st-hr",
    stateName: "Haryana",
    name: "Kurukshetra",
    code: "HR-KUR",
  },
];

export const masterTehsils: MasterTehsil[] = [
  {
    id: "teh-amb",
    districtId: "dist-ambala",
    districtName: "Ambala",
    name: "Ambala",
    code: "HR-AMB-T01",
  },
  {
    id: "teh-saha",
    districtId: "dist-ambala",
    districtName: "Ambala",
    name: "Saha",
    code: "HR-AMB-T02",
  },
  {
    id: "teh-bar",
    districtId: "dist-ambala",
    districtName: "Ambala",
    name: "Barara",
    code: "HR-AMB-T03",
  },
  {
    id: "teh-nar",
    districtId: "dist-ambala",
    districtName: "Ambala",
    name: "Naraingarh",
    code: "HR-AMB-T04",
  },
];

export const masterVillages: MasterVillage[] = [
  {
    id: "vil-demo-kalan",
    tehsilId: "teh-amb",
    tehsilName: "Ambala",
    districtName: "Ambala",
    stateName: "Haryana",
    name: "Demo Kalan",
    code: "HR-AMB-V01",
    pincode: "134003",
    lat: 30.368,
    lng: 76.786,
  },
  {
    id: "vil-demo-khurd",
    tehsilId: "teh-amb",
    tehsilName: "Ambala",
    districtName: "Ambala",
    stateName: "Haryana",
    name: "Demo Khurd",
    code: "HR-AMB-V02",
    pincode: "134003",
    lat: 30.376,
    lng: 76.804,
  },
  {
    id: "vil-rampur-demo",
    tehsilId: "teh-amb",
    tehsilName: "Ambala",
    districtName: "Ambala",
    stateName: "Haryana",
    name: "Rampur Demo",
    code: "HR-AMB-V03",
    pincode: "134004",
    lat: 30.384,
    lng: 76.820,
  },
  {
    id: "vil-chandpur-demo",
    tehsilId: "teh-saha",
    tehsilName: "Saha",
    districtName: "Ambala",
    stateName: "Haryana",
    name: "Chandpur Demo",
    code: "HR-AMB-V04",
    pincode: "133104",
    lat: 30.392,
    lng: 76.838,
  },
  {
    id: "vil-lakhanpur-demo",
    tehsilId: "teh-bar",
    tehsilName: "Barara",
    districtName: "Ambala",
    stateName: "Haryana",
    name: "Lakhanpur Demo",
    code: "HR-AMB-V05",
    pincode: "133201",
    lat: 30.402,
    lng: 76.860,
  },
];

// Pre-seeded Synthetic Master Parcels in Haryana / Ambala
export const masterParcelsPool: Parcel[] = [
  {
    id: "pcl-hr-amb-001",
    parcelId: "PCL-HR-AMB-001",
    externalId: "SLR-HR-AMB-145-2",
    projectId: "",
    state: "Haryana",
    district: "Ambala",
    tehsil: "Ambala",
    village: "Demo Kalan",
    surveyNumber: "145/2",
    ownerReference: "CITIZEN-HR-0091",
    totalArea: 3.20,
    requiredArea: 1.45,
    landStatus: "AGRICULTURAL",
    geometry: [
      [30.368, 76.782],
      [30.371, 76.786],
      [30.369, 76.790],
      [30.366, 76.785],
    ],
    sourceSystem: "Haryana Jamabandi / Cadastral Revenue Database (SYNTHETIC)",
    sourceReference: "Khasra-145/2-Demo-Kalan",
    acquisitionStatus: "AVAILABLE",
  },
  {
    id: "pcl-hr-amb-002",
    parcelId: "PCL-HR-AMB-002",
    externalId: "SLR-HR-AMB-146-1",
    projectId: "",
    state: "Haryana",
    district: "Ambala",
    tehsil: "Ambala",
    village: "Demo Kalan",
    surveyNumber: "146/1",
    ownerReference: "CITIZEN-HR-0092",
    totalArea: 2.80,
    requiredArea: 1.10,
    landStatus: "AGRICULTURAL",
    geometry: [
      [30.372, 76.790],
      [30.375, 76.795],
      [30.373, 76.799],
      [30.370, 76.794],
    ],
    sourceSystem: "Haryana Jamabandi / Cadastral Revenue Database (SYNTHETIC)",
    sourceReference: "Khasra-146/1-Demo-Kalan",
    acquisitionStatus: "AVAILABLE",
  },
  {
    id: "pcl-hr-amb-003",
    parcelId: "PCL-HR-AMB-003",
    externalId: "SLR-HR-AMB-88-4",
    projectId: "",
    state: "Haryana",
    district: "Ambala",
    tehsil: "Ambala",
    village: "Demo Khurd",
    surveyNumber: "88/4",
    ownerReference: "CITIZEN-HR-0093",
    totalArea: 4.10,
    requiredArea: 1.80,
    landStatus: "AGRICULTURAL",
    geometry: [
      [30.376, 76.802],
      [30.380, 76.808],
      [30.377, 76.812],
      [30.374, 76.806],
    ],
    sourceSystem: "Haryana Jamabandi / Cadastral Revenue Database (SYNTHETIC)",
    sourceReference: "Khasra-88/4-Demo-Khurd",
    acquisitionStatus: "AVAILABLE",
  },
  {
    id: "pcl-hr-amb-004",
    parcelId: "PCL-HR-AMB-004",
    externalId: "SLR-HR-AMB-102-1",
    projectId: "",
    state: "Haryana",
    district: "Ambala",
    tehsil: "Ambala",
    village: "Rampur Demo",
    surveyNumber: "102/1",
    ownerReference: "CITIZEN-HR-0094",
    totalArea: 2.50,
    requiredArea: 0.95,
    landStatus: "AGRICULTURAL",
    geometry: [
      [30.384, 76.818],
      [30.388, 76.824],
      [30.385, 76.828],
      [30.381, 76.822],
    ],
    sourceSystem: "Haryana Jamabandi / Cadastral Revenue Database (SYNTHETIC)",
    sourceReference: "Khasra-102/1-Rampur-Demo",
    acquisitionStatus: "AVAILABLE",
  },
  {
    id: "pcl-hr-amb-005",
    parcelId: "PCL-HR-AMB-005",
    externalId: "SLR-HR-AMB-64-3",
    projectId: "",
    state: "Haryana",
    district: "Ambala",
    tehsil: "Saha",
    village: "Chandpur Demo",
    surveyNumber: "64/3",
    ownerReference: "CITIZEN-HR-0095",
    totalArea: 3.60,
    requiredArea: 1.50,
    landStatus: "AGRICULTURAL",
    geometry: [
      [30.392, 76.835],
      [30.396, 76.841],
      [30.393, 76.846],
      [30.389, 76.840],
    ],
    sourceSystem: "Haryana Jamabandi / Cadastral Revenue Database (SYNTHETIC)",
    sourceReference: "Khasra-64/3-Chandpur-Demo",
    acquisitionStatus: "AVAILABLE",
  },
  {
    id: "pcl-hr-amb-006",
    parcelId: "PCL-HR-AMB-006",
    externalId: "SLR-HR-AMB-19-2",
    projectId: "",
    state: "Haryana",
    district: "Ambala",
    tehsil: "Barara",
    village: "Lakhanpur Demo",
    surveyNumber: "19/2",
    ownerReference: "CITIZEN-HR-0096",
    totalArea: 5.00,
    requiredArea: 2.10,
    landStatus: "AGRICULTURAL",
    geometry: [
      [30.402, 76.858],
      [30.406, 76.864],
      [30.403, 76.869],
      [30.399, 76.863],
    ],
    sourceSystem: "Haryana Jamabandi / Cadastral Revenue Database (SYNTHETIC)",
    sourceReference: "Khasra-19/2-Lakhanpur-Demo",
    acquisitionStatus: "AVAILABLE",
  },
];

// SYNTHETIC DEMO OFFICER MASTER DATABASE
export const seededUsers: User[] = [
  {
    id: "national.admin@demo.nlams.gov",
    officerId: "OFF-NAT-ADMIN-001",
    employeeReference: "EMP-GOI-MORTH-001",
    displayName: "National Administrator",
    designation: "Joint Secretary / National Director (Land Acquisition)",
    role: "NATIONAL_ADMIN",
    department: "Ministry of Road Transport & Highways — DEMO",
    organization: "Government of India",
    state: "National",
    district: "All",
    jurisdictionType: "NATIONAL",
    jurisdictionId: "IN",
    email: "national.admin@demo.nlams.gov",
    active: true,
    source: "SYNTHETIC DEMO MASTER DATA — administrative structure based on publicly documented hierarchy.",
    sourceReference: "https://morth.nic.in / Land Acquisition Cell",
    verifiedAt: "2026-01-15T00:00:00Z",
    password: "Demo@123",
  },
  {
    id: "project.authority@demo.nlams.gov",
    officerId: "OFF-HR-PROJ-AUTH-001",
    employeeReference: "EMP-HR-INFRA-102",
    displayName: "Project Authority (State Infrastructure)",
    designation: "Executive Engineer & Project Director (Infrastructure Planning)",
    role: "PROJECT_OFFICER",
    department: "Irrigation & Water Resources / State Infrastructure Authority",
    organization: "Government of Haryana",
    state: "Haryana",
    district: "Ambala",
    tehsil: "Ambala",
    jurisdictionType: "STATE",
    jurisdictionId: "HR",
    email: "project.authority@demo.nlams.gov",
    active: true,
    source: "SYNTHETIC DEMO MASTER DATA — administrative structure based on publicly documented hierarchy.",
    sourceReference: "https://haryana.gov.in / State Infrastructure Authority",
    verifiedAt: "2026-01-15T00:00:00Z",
    password: "Demo@123",
  },
  {
    id: "district.officer@demo.nlams.gov",
    officerId: "OFF-HR-AMB-DRO-001",
    employeeReference: "EMP-HR-REV-201",
    displayName: "District Officer (Ambala)",
    designation: "District Revenue Officer & Competent Authority for Land Acquisition",
    role: "DISTRICT_OFFICER",
    department: "Revenue & Disaster Management",
    organization: "Ambala District Administration & Revenue Authority",
    state: "Haryana",
    district: "Ambala",
    tehsil: "Ambala",
    jurisdictionType: "DISTRICT",
    jurisdictionId: "AMB",
    email: "district.officer@demo.nlams.gov",
    active: true,
    source: "SYNTHETIC DEMO MASTER DATA — administrative structure based on publicly documented Haryana government hierarchy.",
    sourceReference: "District Revenue Office Ambala",
    verifiedAt: "2026-01-15T00:00:00Z",
    password: "Demo@123",
  },
  {
    id: "field.ambala@demo.nlams.gov",
    officerId: "OFF-HR-AMB-PAT-001",
    employeeReference: "EMP-HR-REV-405",
    displayName: "Field Officer (Ambala Tehsil / Demo Kalan)",
    designation: "Halqa Patwari & Field Revenue Verification Officer",
    role: "FIELD_OFFICER",
    department: "Revenue & Disaster Management",
    organization: "Ambala District Administration & Revenue Authority",
    state: "Haryana",
    district: "Ambala",
    tehsil: "Ambala",
    village: "Demo Kalan",
    officerCode: "FO-AMB-01",
    jurisdictionType: "TEHSIL",
    jurisdictionId: "AMB-T01",
    email: "field.ambala@demo.nlams.gov",
    active: true,
    source: "SYNTHETIC DEMO MASTER DATA — administrative structure based on publicly documented Haryana government hierarchy.",
    sourceReference: "Haryana Land Records Manual",
    verifiedAt: "2026-01-15T00:00:00Z",
    password: "Demo@123",
  },
  {
    id: "field.saha@demo.nlams.gov",
    officerId: "OFF-HR-SAHA-PAT-002",
    employeeReference: "EMP-HR-REV-406",
    displayName: "Field Officer (Saha Tehsil / Chandpur Demo)",
    designation: "Halqa Patwari & Field Revenue Verification Officer",
    role: "FIELD_OFFICER",
    department: "Revenue & Disaster Management",
    organization: "Ambala District Administration & Revenue Authority",
    state: "Haryana",
    district: "Ambala",
    tehsil: "Saha",
    village: "Chandpur Demo",
    officerCode: "FO-SAHA-02",
    jurisdictionType: "TEHSIL",
    jurisdictionId: "SAHA-T02",
    email: "field.saha@demo.nlams.gov",
    active: true,
    source: "SYNTHETIC DEMO MASTER DATA — administrative structure based on publicly documented Haryana government hierarchy.",
    sourceReference: "Saha Tehsil Office Ambala",
    verifiedAt: "2026-01-15T00:00:00Z",
    password: "Demo@123",
  },
  {
    id: "reviewer.ambala@demo.nlams.gov",
    officerId: "OFF-HR-AMB-REV-001",
    employeeReference: "EMP-HR-REV-302",
    displayName: "Reviewer (Revenue Scrutiny Ambala)",
    designation: "Naib Tehsildar & Scrutiny Reviewing Officer",
    role: "REVIEWER",
    department: "Revenue & Disaster Management",
    organization: "Ambala District Administration & Revenue Authority",
    state: "Haryana",
    district: "Ambala",
    officerCode: "REV-AMB-01",
    jurisdictionType: "DISTRICT",
    jurisdictionId: "AMB",
    email: "reviewer.ambala@demo.nlams.gov",
    active: true,
    source: "SYNTHETIC DEMO MASTER DATA — administrative structure based on publicly documented Haryana government hierarchy.",
    sourceReference: "Revenue Sub-Division Ambala",
    verifiedAt: "2026-01-15T00:00:00Z",
    password: "Demo@123",
  },
  {
    id: "compensation.ambala@demo.nlams.gov",
    officerId: "OFF-HR-AMB-COMP-001",
    employeeReference: "EMP-HR-FIN-501",
    displayName: "Compensation Officer (Ambala)",
    designation: "Land Acquisition Compensation Determination Officer",
    role: "COMPENSATION_OFFICER",
    department: "Revenue & Disaster Management",
    organization: "Ambala District Administration & Revenue Authority",
    state: "Haryana",
    district: "Ambala",
    jurisdictionType: "DISTRICT",
    jurisdictionId: "AMB",
    email: "compensation.ambala@demo.nlams.gov",
    active: true,
    source: "SYNTHETIC DEMO MASTER DATA — administrative structure based on publicly documented Haryana government hierarchy.",
    sourceReference: "Finance & Accounts Wing Ambala",
    verifiedAt: "2026-01-15T00:00:00Z",
    password: "Demo@123",
  },
  {
    id: "compensation.review@demo.nlams.gov",
    officerId: "OFF-HR-AMB-COMPREV-001",
    employeeReference: "EMP-HR-FIN-502",
    displayName: "Compensation Reviewer / Finance Officer",
    designation: "Senior Accounts Officer & Award Scrutiny Reviewer",
    role: "COMPENSATION_REVIEWER",
    department: "Revenue & Disaster Management",
    organization: "Ambala District Administration & Revenue Authority",
    state: "Haryana",
    district: "Ambala",
    jurisdictionType: "DISTRICT",
    jurisdictionId: "AMB",
    email: "compensation.review@demo.nlams.gov",
    active: true,
    source: "SYNTHETIC DEMO MASTER DATA — administrative structure based on publicly documented Haryana government hierarchy.",
    sourceReference: "Treasury & Accounts Department Haryana",
    verifiedAt: "2026-01-15T00:00:00Z",
    password: "Demo@123",
  },
  {
    id: "rr.ambala@demo.nlams.gov",
    officerId: "OFF-HR-AMB-RR-001",
    employeeReference: "EMP-HR-SOC-601",
    displayName: "R&R Officer (Ambala)",
    designation: "Administrator for Rehabilitation & Resettlement (R&R)",
    role: "RR_OFFICER",
    department: "Revenue & Disaster Management",
    organization: "Ambala District Administration & Revenue Authority",
    state: "Haryana",
    district: "Ambala",
    jurisdictionType: "DISTRICT",
    jurisdictionId: "AMB",
    email: "rr.ambala@demo.nlams.gov",
    active: true,
    source: "SYNTHETIC DEMO MASTER DATA — administrative structure based on publicly documented Haryana government hierarchy.",
    sourceReference: "Social Justice & Empowerment / R&R Authority Haryana",
    verifiedAt: "2026-01-15T00:00:00Z",
    password: "Demo@123",
  },
  {
    id: "rr.review@demo.nlams.gov",
    officerId: "OFF-HR-AMB-RRREV-001",
    employeeReference: "EMP-HR-SOC-602",
    displayName: "R&R Reviewer (Ambala)",
    designation: "Sub-Divisional Magistrate & R&R Scrutiny Authority",
    role: "RR_REVIEWER",
    department: "Revenue & Disaster Management",
    organization: "Ambala District Administration & Revenue Authority",
    state: "Haryana",
    district: "Ambala",
    jurisdictionType: "DISTRICT",
    jurisdictionId: "AMB",
    email: "rr.review@demo.nlams.gov",
    active: true,
    source: "SYNTHETIC DEMO MASTER DATA — administrative structure based on publicly documented Haryana government hierarchy.",
    sourceReference: "SDM Office Ambala City",
    verifiedAt: "2026-01-15T00:00:00Z",
    password: "Demo@123",
  },
  {
    id: "possession.ambala@demo.nlams.gov",
    officerId: "OFF-HR-AMB-POSS-001",
    employeeReference: "EMP-HR-REV-701",
    displayName: "Possession Officer (Tehsildar Ambala)",
    designation: "Tehsildar Possession Authority & Executive Magistrate (Site Handover)",
    role: "DISTRICT_OFFICER",
    department: "Revenue & Disaster Management",
    organization: "Ambala District Administration & Revenue Authority",
    state: "Haryana",
    district: "Ambala",
    tehsil: "Ambala",
    jurisdictionType: "DISTRICT",
    jurisdictionId: "AMB",
    email: "possession.ambala@demo.nlams.gov",
    active: true,
    source: "SYNTHETIC DEMO MASTER DATA — administrative structure based on publicly documented Haryana government hierarchy.",
    sourceReference: "Revenue Department Haryana / Possession Directorate",
    verifiedAt: "2026-01-15T00:00:00Z",
    password: "Demo@123",
  },
  {
    id: "viewer@demo.nlams.gov",
    officerId: "OFF-VIEWER-001",
    employeeReference: "EMP-PUB-001",
    displayName: "Public / Ministry Observer",
    designation: "Monitoring Auditor / Public Observer",
    role: "VIEWER",
    department: "Public Information Cell",
    organization: "National Land Portal",
    state: "National",
    district: "All",
    jurisdictionType: "NATIONAL",
    jurisdictionId: "ALL",
    email: "viewer@demo.nlams.gov",
    active: true,
    source: "SYNTHETIC DEMO MASTER DATA — Read-only demonstration profile.",
    sourceReference: "N-LAMS Public Transparency Framework",
    verifiedAt: "2026-01-15T00:00:00Z",
    password: "Demo@123",
  },
  // Backward compatibility alias accounts
  {
    id: "national@nlams.demo",
    officerId: "OFF-NAT-ADMIN-001",
    employeeReference: "EMP-GOI-MORTH-001",
    displayName: "National Administrator",
    designation: "Joint Secretary / National Director (Land Acquisition)",
    role: "NATIONAL_ADMIN",
    department: "Ministry of Road Transport & Highways — DEMO",
    organization: "Government of India",
    state: "National",
    district: "All",
    jurisdictionType: "NATIONAL",
    jurisdictionId: "IN",
    email: "national@nlams.demo",
    active: true,
    source: "SYNTHETIC DEMO MASTER DATA",
    sourceReference: "MoRTH Land Acquisition Cell",
    verifiedAt: "2026-01-15T00:00:00Z",
    password: "Demo@123",
  },
  {
    id: "project@nlams.demo",
    officerId: "OFF-HR-PROJ-AUTH-001",
    employeeReference: "EMP-HR-INFRA-102",
    displayName: "Project Authority (State Infrastructure)",
    designation: "Executive Engineer & Project Director",
    role: "PROJECT_OFFICER",
    department: "Irrigation & Water Resources / State Infrastructure Authority",
    organization: "Government of Haryana",
    state: "Haryana",
    district: "Ambala",
    jurisdictionType: "STATE",
    jurisdictionId: "HR",
    email: "project@nlams.demo",
    active: true,
    source: "SYNTHETIC DEMO MASTER DATA",
    sourceReference: "Haryana State Infrastructure Authority",
    verifiedAt: "2026-01-15T00:00:00Z",
    password: "Demo@123",
  },
  {
    id: "district@nlams.demo",
    officerId: "OFF-HR-AMB-DRO-001",
    employeeReference: "EMP-HR-REV-201",
    displayName: "District Officer (Ambala)",
    designation: "District Revenue Officer",
    role: "DISTRICT_OFFICER",
    department: "Revenue & Disaster Management",
    organization: "Ambala District Administration & Revenue Authority",
    state: "Haryana",
    district: "Ambala",
    jurisdictionType: "DISTRICT",
    jurisdictionId: "AMB",
    email: "district@nlams.demo",
    active: true,
    source: "SYNTHETIC DEMO MASTER DATA",
    sourceReference: "District Revenue Office Ambala",
    verifiedAt: "2026-01-15T00:00:00Z",
    password: "Demo@123",
  },
  {
    id: "field@nlams.demo",
    officerId: "OFF-HR-AMB-PAT-001",
    employeeReference: "EMP-HR-REV-405",
    displayName: "Field Officer (Ambala Tehsil)",
    designation: "Halqa Patwari & Field Revenue Verification Officer",
    role: "FIELD_OFFICER",
    department: "Revenue & Disaster Management",
    organization: "Ambala District Administration & Revenue Authority",
    state: "Haryana",
    district: "Ambala",
    tehsil: "Ambala",
    village: "Demo Kalan",
    officerCode: "FO-AMB-01",
    jurisdictionType: "TEHSIL",
    jurisdictionId: "AMB-T01",
    email: "field@nlams.demo",
    active: true,
    source: "SYNTHETIC DEMO MASTER DATA",
    sourceReference: "Haryana Land Records Manual",
    verifiedAt: "2026-01-15T00:00:00Z",
    password: "Demo@123",
  },
  {
    id: "reviewer@nlams.demo",
    officerId: "OFF-HR-AMB-REV-001",
    employeeReference: "EMP-HR-REV-302",
    displayName: "Reviewer (Revenue Scrutiny Ambala)",
    designation: "Naib Tehsildar & Scrutiny Reviewing Officer",
    role: "REVIEWER",
    department: "Revenue & Disaster Management",
    organization: "Ambala District Administration & Revenue Authority",
    state: "Haryana",
    district: "Ambala",
    officerCode: "REV-AMB-01",
    jurisdictionType: "DISTRICT",
    jurisdictionId: "AMB",
    email: "reviewer@nlams.demo",
    active: true,
    source: "SYNTHETIC DEMO MASTER DATA",
    sourceReference: "Revenue Sub-Division Ambala",
    verifiedAt: "2026-01-15T00:00:00Z",
    password: "Demo@123",
  },
];

// JURISDICTION-AWARE OFFICER ROUTING ENGINE
export function findResponsibleOfficer(
  state: State,
  criteria: {
    requiredRole: DemoRole;
    department?: string;
    organization?: string;
    stateName?: string;
    districtName?: string;
    tehsilName?: string;
    villageName?: string;
    projectId?: string;
  },
): User {
  const activeOfficers = state.users.filter(
    (u) =>
      u.active &&
      (u.role === criteria.requiredRole ||
        (criteria.requiredRole === "PROJECT_AUTHORITY" && u.role === "PROJECT_OFFICER") ||
        (criteria.requiredRole === "PROJECT_OFFICER" && u.role === "PROJECT_AUTHORITY") ||
        (criteria.requiredRole === "FINANCE_OFFICER" && u.role === "COMPENSATION_REVIEWER") ||
        (u.role === "DISTRICT_OFFICER" && criteria.requiredRole === "PROJECT_OFFICER")),
  );

  if (activeOfficers.length === 0) {
    return state.users[0];
  }

  // Exact Role Matching subset
  const roleMatches = activeOfficers.filter(
    (u) =>
      u.role === criteria.requiredRole ||
      (criteria.requiredRole === "PROJECT_AUTHORITY" && u.role === "PROJECT_OFFICER") ||
      (criteria.requiredRole === "FINANCE_OFFICER" && u.role === "COMPENSATION_REVIEWER"),
  );
  const pool = roleMatches.length > 0 ? roleMatches : activeOfficers;

  // Score candidate officers based on jurisdictional match precision
  let bestOfficer = pool[0];
  let highestScore = -1;

  for (const officer of pool) {
    let score = 0;

    // 1. Village Match (highest weight)
    if (criteria.villageName && officer.village) {
      if (officer.village.toLowerCase() === criteria.villageName.toLowerCase()) {
        score += 50;
      }
    }

    // 2. Tehsil Match
    if (criteria.tehsilName && officer.tehsil) {
      if (officer.tehsil.toLowerCase() === criteria.tehsilName.toLowerCase()) {
        score += 30;
      }
    }

    // 3. District Match
    if (criteria.districtName && officer.district) {
      if (
        officer.district.toLowerCase() === criteria.districtName.toLowerCase() ||
        officer.district === "All"
      ) {
        score += 20;
      }
    }

    // 4. State Match
    if (criteria.stateName && officer.state) {
      if (
        officer.state.toLowerCase() === criteria.stateName.toLowerCase() ||
        officer.state === "National"
      ) {
        score += 10;
      }
    }

    // 5. Department Match
    if (criteria.department && officer.department) {
      if (officer.department.toLowerCase().includes(criteria.department.toLowerCase())) {
        score += 5;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestOfficer = officer;
    }
  }

  return bestOfficer;
}

// GENERIC N-LAMS WORKFLOW STAGES
export function getStandardWorkflowStages(templateId: string): WorkflowStage[] {
  return [
    {
      id: "stage-proj-sub",
      templateId,
      name: "Project Submission",
      sequence: 1,
      legalSection: "Project Initiation & Sponsoring Review",
      responsibleRole: "PROJECT_OFFICER",
      requiredDocuments: ["Project Feasibility and Corridor Alignment Plan"],
      mandatoryDocumentType: "PROJECT_APPROVAL",
      slaDays: 7,
      approvalRequired: true,
    },
    {
      id: "stage-admin-rev",
      templateId,
      name: "Administrative Review",
      sequence: 2,
      legalSection: "Administrative Sanction & Competent Review",
      responsibleRole: "DISTRICT_OFFICER",
      requiredDocuments: ["Administrative Sanction Order", "Preliminary Land Requirement Schedule"],
      mandatoryDocumentType: "PROJECT_APPROVAL",
      slaDays: 14,
      approvalRequired: true,
    },
    {
      id: "stage-field-ver",
      templateId,
      name: "Field Verification",
      sequence: 3,
      legalSection: "Cadastral Ground Inspection & Physical Boundary Verification",
      responsibleRole: "FIELD_OFFICER",
      requiredDocuments: ["Ground Inspection Report", "Geo-tagged Photo Evidence"],
      mandatoryDocumentType: "FIELD_VERIFICATION_REPORT",
      slaDays: 21,
      approvalRequired: true,
    },
    {
      id: "stage-evidence-rev",
      templateId,
      name: "Evidence Review & Scrutiny",
      sequence: 4,
      legalSection: "Competent Revenue Scrutiny Note",
      responsibleRole: "REVIEWER",
      requiredDocuments: ["Revenue Scrutiny Note", "Title & Cadastral Verification Dossier"],
      mandatoryDocumentType: "SURVEY_REPORT",
      slaDays: 10,
      approvalRequired: true,
    },
    {
      id: "stage-comp-assess",
      templateId,
      name: "Compensation Assessment",
      sequence: 5,
      legalSection: "Land Valuation & Statutory Solatium Assessment",
      responsibleRole: "COMPENSATION_OFFICER",
      requiredDocuments: ["Valuation Calculation Statement", "Circle Rate Reference Sheet"],
      mandatoryDocumentType: "COMPENSATION_AWARD",
      slaDays: 14,
      approvalRequired: false,
    },
    {
      id: "stage-comp-appr",
      templateId,
      name: "Compensation Award Approval",
      sequence: 6,
      legalSection: "Statutory Compensation Award Declaration",
      responsibleRole: "COMPENSATION_REVIEWER",
      requiredDocuments: ["Statutory Compensation Award Declaration"],
      mandatoryDocumentType: "COMPENSATION_AWARD",
      slaDays: 7,
      approvalRequired: true,
    },
    {
      id: "stage-payment",
      templateId,
      name: "Disbursement & PFMS Payment",
      sequence: 7,
      legalSection: "Direct Benefit Transfer (DBT)",
      responsibleRole: "COMPENSATION_REVIEWER",
      requiredDocuments: ["PFMS Direct Benefit Transfer Advice"],
      mandatoryDocumentType: "PAYMENT_PROOF",
      slaDays: 7,
      approvalRequired: false,
    },
    {
      id: "stage-rr-assess",
      templateId,
      name: "R&R Assessment & Social Entitlement",
      sequence: 8,
      legalSection: "Rehabilitation & Resettlement Entitlement Schedule",
      responsibleRole: "RR_OFFICER",
      requiredDocuments: ["Affected Families Enumeration Schedule", "Resettlement Plan"],
      mandatoryDocumentType: "RR_APPROVAL",
      slaDays: 14,
      approvalRequired: false,
    },
    {
      id: "stage-rr-appr",
      templateId,
      name: "R&R Package Approval & Delivery",
      sequence: 9,
      legalSection: "R&R Entitlement Delivery Sanction",
      responsibleRole: "RR_REVIEWER",
      requiredDocuments: ["R&R Entitlement Delivery Sanction Order"],
      mandatoryDocumentType: "RR_APPROVAL",
      slaDays: 10,
      approvalRequired: true,
    },
    {
      id: "stage-possession",
      templateId,
      name: "Site Possession & Handover",
      sequence: 10,
      legalSection: "Site Possession & Land Handover Certificate",
      responsibleRole: "DISTRICT_OFFICER",
      requiredDocuments: ["Site Possession Certificate", "Panchnama of Possession"],
      mandatoryDocumentType: "POSSESSION_RECORD",
      slaDays: 14,
      approvalRequired: true,
    },
    {
      id: "stage-complete",
      templateId,
      name: "Project Completion & Cadastral Handover",
      sequence: 11,
      legalSection: "Completion Sanction",
      responsibleRole: "NATIONAL_ADMIN",
      requiredDocuments: ["Corridor Handover Certificate"],
      mandatoryDocumentType: "COMPLETION_CERTIFICATE",
      slaDays: 30,
      approvalRequired: true,
    },
  ];
}

// SEED FUNCTION: Initializes clean baseline state
// IMPORTANT: Does NOT preload BhoomiRashi or Native operational project.
// Master reference data is preserved; operational projects appear only upon Sync or Creation.
export function seed(): State {
  const templateId = "HARYANA_NATIVE_DEMO_WORKFLOW";
  const stages = getStandardWorkflowStages(templateId);

  return {
    masterDepartments,
    masterOrganizations,
    masterStates,
    masterDistricts,
    masterTehsils,
    masterVillages,
    masterParcelsPool,
    workflowStages: stages,
    users: seededUsers,
    projects: [],
    parcels: [],
    cases: [],
    tasks: [],
    caseActivities: [],
    documents: [],
    compensation: [],
    rr: [],
    possession: [],
    notifications: [
      {
        id: "notif-system-init",
        recipientId: "national.admin@demo.nlams.gov",
        type: "SYSTEM_INITIALIZED",
        title: "N-LAMS Core Initialized",
        message: "National coordination layer online. Integration adapters ready for synchronization.",
        severity: "INFO",
        createdAt: now(),
      },
    ],
    audit: [
      {
        id: "audit-init-001",
        actorId: "SYSTEM",
        actorRole: "SYSTEM",
        action: "SYSTEM_INITIALIZED",
        entityType: "SYSTEM",
        metadata: { status: "CLEAN_BASELINE_READY" },
        createdAt: now(),
      },
    ],
    syncOperations: [],
  };
}

// IDEMPOTENT BHOOMIRASHI SYNCHRONIZATION FUNCTION
// Synchronizes external project metadata and parcels WITHOUT importing external officers or tasks.
export function syncBhoomiRashi(state: State, actorEmail: string = "national.admin@demo.nlams.gov"): {
  project: Project;
  parcelsCount: number;
  isNew: boolean;
} {
  const templateId = "HARYANA_NATIVE_DEMO_WORKFLOW";
  const externalSystem = "BHOOMIRASHI";
  const externalProjectId = "BR-NH-2026-0042";
  const localProjectCode = "NLAMS-EXT-00042";

  // Check if already synchronized (idempotency key: externalSystem + externalProjectId)
  let existingProject = state.projects.find(
    (p) => p.sourceSystem === externalSystem && p.externalProjectId === externalProjectId,
  );

  const isNew = !existingProject;
  const projectRecordId = existingProject ? existingProject.id : "prj-nh44-ext-0042";

  const syncedProject: Project = {
    id: projectRecordId,
    projectId: localProjectCode,
    name: "NH-44 Ambala Greenfield Corridor Package (BhoomiRashi Import)",
    department: "Ministry of Road Transport & Highways — DEMO",
    authority: "NHAI National Directorate",
    type: "National Highway",
    state: "Haryana",
    district: "Ambala",
    tehsil: "Ambala",
    village: "Demo Kalan",
    status: "In Progress",
    progress: 54,
    targetDate: "2027-06-30",
    description:
      "External highway corridor synchronized from BhoomiRashi mock integration adapter. Authoritative system of record remains BhoomiRashi.",
    alignment: [
      [30.362, 76.776],
      [30.380, 76.812],
      [30.395, 76.850],
      [30.407, 76.873],
    ],
    bufferMeters: 100,
    workflowTemplateId: templateId,
    sourceType: "EXTERNAL",
    sourceSystem: externalSystem,
    externalProjectId: externalProjectId,
    lastSyncedAt: now(),
    syncStatus: "SUCCESS",
    landRequiredHa: 312.4,
    landAcquiredHa: 168.8,
    affectedParcelsCount: 6,
    isNative: false,
    externalStage: "Compensation Processing",
    bhoomiRashiStats: {
      externalStage: "Section 3G Land Valuation",
      totalParcels: 6,
      verifiedParcels: 6,
      compensationApproved: 4,
      possessionCompleted: 2,
    },
    createdAt: existingProject?.createdAt || new Date(Date.now() - 14 * 86400000).toISOString(),
  };

  if (isNew) {
    state.projects.push(syncedProject);
  } else {
    const idx = state.projects.findIndex((p) => p.id === projectRecordId);
    if (idx >= 0) state.projects[idx] = syncedProject;
  }

  // Synchronize External Parcels
  const externalParcelsData = Array.from({ length: 6 }, (_, i) => {
    const idx = i + 1;
    const lat = 30.362 + i * 0.007;
    const lng = 76.776 + i * 0.016;
    const parcelId = `PCL-EXT-${String(100 + idx).padStart(4, "0")}`;
    const externalId = `BR-PARCEL-${400 + idx}`;
    return {
      id: `parcel-ext-${idx}`,
      parcelId,
      externalId,
      projectId: projectRecordId,
      state: "Haryana",
      district: "Ambala",
      tehsil: "Ambala",
      village: idx % 2 === 0 ? "Demo Khurd" : "Demo Kalan",
      surveyNumber: `${130 + idx}/${(idx % 3) + 1}`,
      ownerReference: `CITIZEN-EXT-${4000 + idx}`,
      totalArea: Number((2.8 + idx * 0.4).toFixed(2)),
      requiredArea: Number((1.2 + idx * 0.2).toFixed(2)),
      geometry: [
        [lat, lng],
        [lat + 0.004, lng + 0.005],
        [lat + 0.003, lng + 0.009],
        [lat - 0.002, lng + 0.006],
      ] as [number, number][],
      landStatus: "AGRICULTURAL" as const,
      sourceSystem: externalSystem,
      sourceReference: externalId,
      acquisitionStatus: idx > 4 ? "POSSESSION_COMPLETED" : idx > 2 ? "COMPENSATION_APPROVED" : "FIELD_VERIFIED",
      caseId: `case-ext-${idx}`,
      discoveryMethod: "EXTERNAL_INTEGRATION_SYNC",
      discoveredAt: now(),
    };
  });

  for (const ep of externalParcelsData) {
    const existingIdx = state.parcels.findIndex((p) => p.id === ep.id || (p.sourceSystem === externalSystem && p.externalId === ep.externalId));
    if (existingIdx >= 0) {
      state.parcels[existingIdx] = { ...state.parcels[existingIdx], ...ep };
    } else {
      state.parcels.push(ep);
    }
  }

  // Synchronize External Cases (Read-only monitoring views)
  const externalCasesData = externalParcelsData.map((p, i) => {
    const idx = i + 1;
    return {
      id: `case-ext-${idx}`,
      caseId: `NLA-EXT-00${String(100 + idx)}`,
      projectId: projectRecordId,
      parcelId: p.id,
      status: idx > 4 ? "Completed" : idx > 2 ? "In Progress" : "Under Review",
      risk: idx === 2 ? "High" : "Low",
      priority: "MEDIUM",
      currentStage: idx > 4 ? "Project Completion" : idx > 2 ? "Disbursement & PFMS Payment" : "Evidence Review & Scrutiny",
      progress: 40 + idx * 10,
      assignedOfficerId: undefined, // NO BhoomiRashi internal officers assigned in N-LAMS
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      externalRefs: [
        { system: externalSystem, id: `BR-CASE-${String(idx).padStart(3, "0")}` },
        { system: "State Land Records", id: p.sourceReference },
      ],
      acquisitionPurpose: "NH-44 Greenfield Corridor Expansion",
      createdAt: now(),
    };
  });

  for (const ec of externalCasesData) {
    const existingIdx = state.cases.findIndex((c) => c.id === ec.id || (c.projectId === projectRecordId && c.parcelId === ec.parcelId));
    if (existingIdx >= 0) {
      state.cases[existingIdx] = { ...state.cases[existingIdx], ...ec };
    } else {
      state.cases.push(ec);
    }
  }

  // Synchronize External Financial Records (Compensation)
  for (let i = 0; i < externalCasesData.length; i++) {
    const idx = i + 1;
    const c = externalCasesData[i];
    const p = externalParcelsData[i];
    const compRecord: Compensation = {
      id: `comp-ext-${idx}`,
      caseId: c.id,
      caseReference: c.caseId,
      parcelId: p.parcelId,
      village: p.village,
      assessedAmount: 1400000 + idx * 150000,
      approvedAmount: idx > 2 ? 1400000 + idx * 150000 : 0,
      paidAmount: idx > 4 ? 1400000 + idx * 150000 : 0,
      status: idx > 4 ? "PAID" : idx > 2 ? "APPROVED" : "ASSESSED",
      paymentReference: idx > 4 ? `DEMO-PFMS-2026-EXT-${idx}` : undefined,
      sourceSystem: "PFMS (DEMO)",
      lastSyncedAt: now(),
    };

    const existingIdx = state.compensation.findIndex((cr) => cr.id === compRecord.id);
    if (existingIdx >= 0) {
      state.compensation[existingIdx] = compRecord;
    } else {
      state.compensation.push(compRecord);
    }
  }

  // Synchronize External R&R Records
  for (let i = 0; i < externalCasesData.length; i++) {
    const idx = i + 1;
    const c = externalCasesData[i];
    const p = externalParcelsData[i];
    const rrRecord: RR = {
      id: `rr-ext-${idx}`,
      caseId: c.id,
      caseReference: c.caseId,
      parcelId: p.parcelId,
      village: p.village,
      affectedFamilies: 3 + idx,
      displacedFamilies: idx % 2,
      eligibleFamilies: 3 + idx,
      benefitsDelivered: idx > 3 ? 3 + idx : 0,
      status: idx > 3 ? "COMPLETED" : "IDENTIFIED",
      sourceSystem: "BHOOMIRASHI R&R (MOCK)",
    };

    const existingIdx = state.rr.findIndex((rr) => rr.id === rrRecord.id);
    if (existingIdx >= 0) {
      state.rr[existingIdx] = rrRecord;
    } else {
      state.rr.push(rrRecord);
    }
  }

  // Synchronize External Possession Records
  for (let i = 0; i < externalCasesData.length; i++) {
    const idx = i + 1;
    const c = externalCasesData[i];
    const p = externalParcelsData[i];
    const posRecord: Possession = {
      id: `pos-ext-${idx}`,
      caseId: c.id,
      caseReference: c.caseId,
      parcelId: p.parcelId,
      village: p.village,
      status: idx > 4 ? "POSSESSION_COMPLETED" : "NOT_READY",
      possessionDate: idx > 4 ? now() : undefined,
      remarks: idx > 4 ? "Form 3E Site Possession recorded in external system." : undefined,
    };

    const existingIdx = state.possession.findIndex((pr) => pr.id === posRecord.id);
    if (existingIdx >= 0) {
      state.possession[existingIdx] = posRecord;
    } else {
      state.possession.push(posRecord);
    }
  }

  // Record Sync Operation History
  const syncOp: SyncOperation = {
    id: `sync-op-${Date.now()}`,
    externalSystem,
    externalProjectId,
    localProjectId: localProjectCode,
    status: "SUCCESS",
    projectsSynced: 1,
    parcelsSynced: externalParcelsData.length,
    timestamp: now(),
    details: "BhoomiRashi external project and cadastral parcels synchronized into N-LAMS monitoring layer.",
  };
  state.syncOperations.unshift(syncOp);

  // Deliver Notification to National Admin
  state.notifications.unshift({
    id: `notif-sync-${Date.now()}`,
    recipientId: actorEmail,
    category: "INTEGRATION",
    type: "EXTERNAL_SYNC_COMPLETED",
    title: "BhoomiRashi Project Synchronized",
    message: `External project ${externalProjectId} (${localProjectCode}) synchronized successfully. 6 parcels updated.`,
    severity: "SUCCESS",
    entityType: "INTEGRATION",
    entityId: localProjectCode,
    projectId: projectRecordId,
    createdAt: now(),
  });

  // Audit Record
  state.audit.unshift({
    id: `audit-sync-${Date.now()}`,
    actorId: actorEmail,
    actorRole: "NATIONAL_ADMIN",
    action: "EXTERNAL_SYNC_COMPLETED",
    entityType: "INTEGRATION",
    entityId: externalProjectId,
    metadata: {
      externalSystem,
      externalProjectId,
      localProjectCode,
      parcelsSynced: externalParcelsData.length,
    },
    createdAt: now(),
  });

  return {
    project: syncedProject,
    parcelsCount: externalParcelsData.length,
    isNew,
  };
}

// PERSISTENCE WRAPPER
class LocalStateStore {
  private filePath: string;
  private state: State | null = null;

  constructor() {
    this.filePath = resolve(process.cwd(), ".data/nlams.json");
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private sanitizeState(st: State): State {
    if (!st || typeof st !== "object") st = seed();
    st.masterDepartments = masterDepartments;
    st.masterOrganizations = masterOrganizations;
    st.masterStates = masterStates;
    st.masterDistricts = masterDistricts;
    st.masterTehsils = masterTehsils;
    st.masterVillages = masterVillages;
    st.masterParcelsPool = masterParcelsPool;
    st.workflowStages = getStandardWorkflowStages("HARYANA_NATIVE_DEMO_WORKFLOW");
    st.users = Array.isArray(st.users) ? st.users : [];
    st.projects = Array.isArray(st.projects) ? st.projects : [];
    st.parcels = Array.isArray(st.parcels) ? st.parcels : [];
    st.cases = Array.isArray(st.cases) ? st.cases : [];
    st.tasks = Array.isArray(st.tasks) ? st.tasks : [];
    st.caseActivities = Array.isArray(st.caseActivities) ? st.caseActivities : [];
    st.documents = Array.isArray(st.documents) ? st.documents : [];
    st.compensation = Array.isArray(st.compensation) ? st.compensation : [];
    st.rr = Array.isArray(st.rr) ? st.rr : [];
    st.possession = Array.isArray(st.possession) ? st.possession : [];
    st.notifications = Array.isArray(st.notifications) ? st.notifications : [];
    st.audit = Array.isArray(st.audit) ? st.audit : [];
    st.syncOperations = Array.isArray(st.syncOperations) ? st.syncOperations : [];

    for (const su of seededUsers) {
      const existing = st.users.find((u) => u.email === su.email || u.id === su.id);
      if (!existing) {
        st.users.push(su);
      } else {
        Object.assign(existing, { ...existing, ...su, password: su.password });
      }
    }
    return st;
  }

  public get(): State {
    if (!this.state) {
      if (existsSync(this.filePath)) {
        try {
          const raw = readFileSync(this.filePath, "utf-8");
          const parsed = JSON.parse(raw);
          this.state = this.sanitizeState(parsed);
        } catch {
          this.state = seed();
          this.save();
        }
      } else {
        this.state = seed();
        this.save();
      }
    }
    return this.sanitizeState(this.state!);
  }

  public save(): void {
    if (this.state) {
      writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), "utf-8");
    }
  }

  public reset(): State {
    this.state = seed();
    this.save();
    return this.state;
  }
}

export const localStore = new LocalStateStore();

export const loadState = () => localStore.get();
export const saveState = (_s?: State) => localStore.save();
export const resetState = () => localStore.reset();

export function audit(
  state: State,
  actorId: string,
  actorRole: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata: Record<string, unknown> = {},
): Audit {
  const item: Audit = {
    id: `audit-${Date.now()}-${randomUUID().slice(0, 6)}`,
    actorId,
    actorRole,
    action,
    entityType,
    entityId,
    metadata,
    createdAt: now(),
  };
  state.audit.unshift(item);
  return item;
}

export function notify(
  state: State,
  recipientId: string,
  type: string,
  title: string,
  message: string,
  severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL" = "INFO",
  entityType?: Notification["entityType"],
  entityId?: string,
  projectId?: string,
  caseId?: string,
  taskId?: string,
): Notification {
  const item: Notification = {
    id: `notif-${Date.now()}-${randomUUID().slice(0, 6)}`,
    recipientId,
    type,
    title,
    message,
    severity,
    entityType,
    entityId,
    projectId,
    caseId,
    taskId,
    createdAt: now(),
  };
  state.notifications.unshift(item);
  return item;
}

export function addCaseActivity(
  state: State,
  caseId: string,
  actorId: string,
  actorRole: string,
  actorName: string,
  eventType: string,
  message: string,
  metadata: Record<string, unknown> = {},
): CaseActivity {
  const item: CaseActivity = {
    id: `act-${Date.now()}-${randomUUID().slice(0, 6)}`,
    caseId,
    actorId,
    actorRole,
    actorName,
    eventType,
    message,
    metadata,
    createdAt: now(),
  };
  state.caseActivities.unshift(item);
  return item;
}
