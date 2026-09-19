export type CaseStatus =
  | 'DRAFT'
  | 'Submitted'
  | 'SUBMITTED'
  | 'In Progress'
  | 'Under Review'
  | 'Approved'
  | 'Payment Completed'
  | 'Possession Ready'
  | 'Possession Completed'
  | 'Completed'
  | 'Delayed'
  | 'At Risk'
  | 'On Hold';

export type Risk = 'Low' | 'Medium' | 'High' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface Project {
  id: string;
  projectId: string;
  name: string;
  department: string;
  authority?: string;
  type: string;
  state: string;
  district: string;
  tehsil?: string;
  village?: string;
  status: string;
  progress: number;
  cases?: number | any[];
  parcelsCount?: number;
  parcels?: any[];
  targetDate: string;
  description: string;
  alignment: [number, number][];
  bufferMeters?: number;
  sourceSystem?: string;
  externalProjectId?: string;
  lastSyncedAt?: string;
  syncStatus?: string;
  landRequiredHa?: number;
  landAcquiredHa?: number;
  affectedParcelsCount?: number;
  isNative?: boolean;
  bhoomiRashiStats?: {
    section3A: string;
    section3CObjections: number;
    section3D: string;
    section3GCases: number;
    section3HPayments: number;
    section3EPossessions: number;
  };
  createdAt?: string;
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
  landStatus?: string;
  sourceSystem: string;
  sourceReference: string;
  acquisitionStatus: string;
  caseId?: string;
}

export interface Case {
  id: string;
  caseId: string;
  projectId: string;
  projectName?: string;
  parcelId: string;
  externalParcelId?: string;
  state: string;
  district: string;
  tehsil?: string;
  village: string;
  surveyNumber?: string;
  totalArea?: number;
  requiredArea?: number;
  status: CaseStatus;
  risk: Risk;
  stage?: string;
  currentStage: string;
  progress: number;
  officer?: string;
  assignedOfficerId?: string;
  dueDate?: string;
  externalRefs?: { system: string; id: string }[];
  acquisitionPurpose?: string;
  createdAt?: string;
}

export interface WorkflowStage {
  id: string;
  templateId?: string;
  name: string;
  sequence: number;
  legalSection?: string;
  responsibleRole: string;
  requiredDocuments: string[];
  mandatoryDocumentType?: string;
  slaDays: number;
  approvalRequired: boolean;
}

export interface TimelineEvent {
  id: string;
  caseId?: string;
  actorId: string;
  actorRole: string;
  actorName: string;
  eventType: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  documentId: string;
  projectId?: string;
  caseId?: string;
  parcelId?: string;
  workflowStage?: string;
  documentType: string;
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

export interface MasterOfficer {
  id: string;
  officerId: string;
  employeeReference: string;
  displayName: string;
  designation: string;
  role: string;
  department: string;
  organization: string;
  state: string;
  district: string;
  tehsil?: string;
  village?: string;
  jurisdictionType: string;
  email: string;
  active: boolean;
  source: string;
  sourceReference: string;
  verifiedAt: string;
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
  status: string;
  paymentReference?: string;
  paymentDate?: string;
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
  status: string;
  sourceSystem: string;
}

export interface Possession {
  id: string;
  caseId: string;
  caseReference: string;
  parcelId: string;
  village: string;
  status: string;
  noticeDate?: string;
  possessionDate?: string;
  officerId?: string;
  remarks?: string;
}
