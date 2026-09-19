import type { Case, DocumentRecord, Project, TimelineEvent, WorkflowStage } from '../types';

export const projects: Project[] = [
  { id: 'p1', projectId: 'NLP-PB-RLY-014', name: 'Ludhiana–Delhi Freight Corridor', department: 'Ministry of Railways', type: 'Railway', state: 'Punjab', district: 'Ludhiana', status: 'In Progress', progress: 68, cases: 8, targetDate: '30 Nov 2026', description: 'Strategic freight corridor alignment with multi-state parcel acquisition monitoring.', alignment: [[30.901, 75.857], [31.18, 76.02], [31.52, 76.28]] },
  { id: 'p2', projectId: 'NHAI-MH-EXP-027', name: 'Mumbai–Nagpur Expressway Extension', department: 'Ministry of Road Transport', type: 'Highway', state: 'Maharashtra', district: 'Nashik', status: 'At Risk', progress: 44, cases: 5, targetDate: '15 Oct 2026', description: 'Land coordination layer for the eastern connector package.', alignment: [[19.997, 73.79], [20.3, 74.1], [20.65, 74.35]] },
  { id: 'p3', projectId: 'CWC-OD-IRR-006', name: 'Mahanadi Basin Irrigation', department: 'Water Resources', type: 'Irrigation', state: 'Odisha', district: 'Cuttack', status: 'In Progress', progress: 72, cases: 4, targetDate: '08 Dec 2026', description: 'Integrated monitoring for canal modernization and affected parcels.', alignment: [[20.46, 85.88], [20.62, 86.01], [20.82, 86.22]] },
  { id: 'p4', projectId: 'PGCIL-KA-TRN-011', name: 'Bengaluru Transmission Grid', department: 'Power Grid Corporation', type: 'Power', state: 'Karnataka', district: 'Bengaluru Rural', status: 'Under Review', progress: 56, cases: 2, targetDate: '22 Jan 2027', description: 'Right-of-way and parcel status tracking for the southern grid upgrade.', alignment: [[12.97, 77.59], [13.18, 77.72], [13.4, 77.85]] },
  { id: 'p5', projectId: 'NHAI-RJ-HWY-033', name: 'Jaipur–Kishangarh Safety Works', department: 'Ministry of Road Transport', type: 'Highway', state: 'Rajasthan', district: 'Jaipur', status: 'Completed', progress: 100, cases: 1, targetDate: '30 Jun 2026', description: 'Completed safety and junction improvement package.', alignment: [[26.91, 75.79], [27.0, 75.94], [27.14, 76.1]] },
];

export const cases: Case[] = [
  { id: 'c1', caseId: 'NLA-PB-RLY-2026-000123', projectId: 'p1', projectName: projects[0].name, parcelId: 'PL-PB-LDH-00421', state: 'Punjab', district: 'Ludhiana', tehsil: 'Samrala', village: 'Kaddon', surveyNumber: '118/2A', totalArea: 5.0, requiredArea: 1.7, status: 'In Progress', risk: 'Medium', currentStage: '3A_GAZETTE', progress: 62, officer: 'A. Sharma', dueDate: '12 Sep 2026', externalRefs: [{ system: 'Bhoomi Rashi', id: 'BR-123456' }, { system: 'State Land Records', id: 'LR-987654' }] },
  { id: 'c2', caseId: 'NLA-MH-NHA-2026-000084', projectId: 'p2', projectName: projects[1].name, parcelId: 'PL-MH-NSK-00987', state: 'Maharashtra', district: 'Nashik', tehsil: 'Sinnar', village: 'Shivde', surveyNumber: '44/3', totalArea: 3.2, requiredArea: 2.1, status: 'Delayed', risk: 'High', currentStage: '3G_COMPENSATION_DETERMINATION', progress: 38, officer: 'R. Patil', dueDate: '05 Sep 2026', externalRefs: [{ system: 'PFMS', id: 'PF-55021' }] },
  { id: 'c3', caseId: 'NLA-OD-CWC-2026-000031', projectId: 'p3', projectName: projects[2].name, parcelId: 'PL-OD-CTK-00118', state: 'Odisha', district: 'Cuttack', tehsil: 'Banki', village: 'Nuagaon', surveyNumber: '209/1', totalArea: 8.7, requiredArea: 3.0, status: 'Under Review', risk: 'Low', currentStage: 'REVIEW_AND_APPROVAL', progress: 53, officer: 'P. Nayak', dueDate: '18 Sep 2026', externalRefs: [{ system: 'Odisha Land Records', id: 'OLR-8831' }] },
  { id: 'c4', caseId: 'NLA-KA-PGC-2026-000009', projectId: 'p4', projectName: projects[3].name, parcelId: 'PL-KA-BLR-00209', state: 'Karnataka', district: 'Bengaluru Rural', tehsil: 'Devanahalli', village: 'Budigere', surveyNumber: '77/5', totalArea: 2.6, requiredArea: 0.9, status: 'At Risk', risk: 'High', currentStage: 'FIELD_VERIFICATION', progress: 29, officer: 'S. Rao', dueDate: '02 Sep 2026', externalRefs: [{ system: 'Bhoomi', id: 'BHM-77102' }] },
  { id: 'c5', caseId: 'NLA-RJ-NHA-2026-000002', projectId: 'p5', projectName: projects[4].name, parcelId: 'PL-RJ-JPR-00041', state: 'Rajasthan', district: 'Jaipur', tehsil: 'Amer', village: 'Kukas', surveyNumber: '12/7', totalArea: 1.4, requiredArea: 1.4, status: 'Completed', risk: 'Low', currentStage: 'POSSESSION_AND_CLOSURE', progress: 100, officer: 'M. Singh', dueDate: '30 Jun 2026', externalRefs: [{ system: 'Bhoomi Rashi', id: 'BR-40441' }] },
];

export const workflow: WorkflowStage[] = [
  { id: 'w1', name: 'Project Proposal', sequence: 1, responsibleRole: 'DEPARTMENT_ADMIN', requiredDocuments: [], slaDays: 7, approvalRequired: true },
  { id: 'w2', name: 'Land Identification', sequence: 2, responsibleRole: 'PROJECT_OFFICER', requiredDocuments: [], slaDays: 14, approvalRequired: true },
  { id: 'w3', name: 'Field Verification', sequence: 3, responsibleRole: 'FIELD_OFFICER', requiredDocuments: [], slaDays: 21, approvalRequired: true },
  { id: 'w4', name: 'Document Verification', sequence: 4, responsibleRole: 'DISTRICT_OFFICER', requiredDocuments: [], slaDays: 14, approvalRequired: true },
  { id: 'w5', name: 'Review & Approval', sequence: 5, responsibleRole: 'REVIEWER', requiredDocuments: [], slaDays: 10, approvalRequired: true },
  { id: 'w6', name: 'Compensation', sequence: 6, responsibleRole: 'COMPENSATION_OFFICER', requiredDocuments: [], slaDays: 30, approvalRequired: true },
  { id: 'w7', name: 'Possession', sequence: 7, responsibleRole: 'DISTRICT_OFFICER', requiredDocuments: [], slaDays: 15, approvalRequired: true },
  { id: 'w8', name: 'R&R and Closure', sequence: 8, responsibleRole: 'RR_OFFICER', requiredDocuments: [], slaDays: 30, approvalRequired: true },
];

export const timeline: TimelineEvent[] = [
  { id: 'e1', actorId: 'usr-1', actorRole: 'SYSTEM', actorName: 'System', eventType: 'CASE_CREATED', message: 'NLA-PB-RLY-2026-000123 created from project intake.', createdAt: new Date().toISOString() },
  { id: 'e2', actorId: 'usr-2', actorRole: 'FIELD_OFFICER', actorName: 'V. Kumar', eventType: 'FIELD_VERIFIED', message: 'GPS boundary and affected area confirmed.', createdAt: new Date().toISOString() },
  { id: 'e3', actorId: 'usr-3', actorRole: 'PROJECT_OFFICER', actorName: 'A. Sharma', eventType: 'DOCUMENTS_UPLOADED', message: 'Survey report and ownership reference added.', createdAt: new Date().toISOString() },
  { id: 'e4', actorId: 'usr-3', actorRole: 'PROJECT_OFFICER', actorName: 'A. Sharma', eventType: 'SUBMITTED_FOR_REVIEW', message: 'Case moved to Document Verification.', createdAt: new Date().toISOString() },
  { id: 'e5', actorId: 'usr-4', actorRole: 'REVIEWER', actorName: 'N. Verma', eventType: 'CORRECTION_REQUESTED', message: 'Upload certified village map before approval.', createdAt: new Date().toISOString() },
];

export const documents: DocumentRecord[] = [
  { id: 'd1', documentId: 'DOC-001', documentType: 'LAND_RECORD', documentCategory: 'STATUTORY', title: 'Land Record Kaddon', fileName: 'Land_Record_Kaddon.pdf', fileSize: '2.4 MB', mimeType: 'application/pdf', storageUrl: '/docs/d1.pdf', checksum: 'sha256:84b1e2c9', version: 1, mandatory: true, approvalRequired: true, status: 'APPROVED', uploadedBy: 'usr-3', uploadedByName: 'A. Sharma', uploadedAt: new Date().toISOString() },
  { id: 'd2', documentId: 'DOC-002', documentType: 'FIELD_REPORT', documentCategory: 'INSPECTION', title: 'Field Inspection Report', fileName: 'Field_Inspection_Report.pdf', fileSize: '4.8 MB', mimeType: 'application/pdf', storageUrl: '/docs/d2.pdf', checksum: 'sha256:2bf8a110', version: 1, mandatory: true, approvalRequired: true, status: 'APPROVED', uploadedBy: 'usr-2', uploadedByName: 'V. Kumar', uploadedAt: new Date().toISOString() },
];
