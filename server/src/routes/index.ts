import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  addCaseActivity,
  audit,
  findResponsibleOfficer,
  loadState,
  notify,
  resetState,
  saveState,
  syncBhoomiRashi,
  uid,
  type DemoRole,
  type DocumentRecord,
  type FieldEvidence,
  type Parcel,
  type Task,
  type Project,
  type Case,
  type Compensation,
  type RR,
  type Possession,
  type WorkflowStage,
} from "../repositories/local.repository.js";

export const api = Router();

// ----------------------------------------------------------------------------
// Authentication & Role Authorization Middleware
// ----------------------------------------------------------------------------

export function getAuthUser(req: Request) {
  const token = req.headers.authorization?.replace("Bearer ", "") || (req.headers["x-user-id"] as string);
  const state = loadState();
  if (!token) return null;

  const normalized = token.trim().toLowerCase();
  const user = state.users.find(
    (u) =>
      u.id.toLowerCase() === normalized ||
      u.email.toLowerCase() === normalized ||
      u.officerId?.toLowerCase() === normalized,
  );
  return user || null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Authentication required for this operation." },
    });
  }
  (req as any).user = user;
  next();
}

export function requireRole(...allowedRoles: DemoRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Authentication required." },
      });
    }

    const hasRole =
      allowedRoles.includes(user.role) ||
      user.role === "SUPER_ADMIN" ||
      (allowedRoles.includes("PROJECT_OFFICER") && user.role === "PROJECT_AUTHORITY") ||
      (allowedRoles.includes("PROJECT_AUTHORITY") && user.role === "PROJECT_OFFICER") ||
      (allowedRoles.includes("COMPENSATION_REVIEWER") && user.role === "FINANCE_OFFICER") ||
      (allowedRoles.includes("FINANCE_OFFICER") && user.role === "COMPENSATION_REVIEWER");

    if (!hasRole) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: `Role ${user.role} is not permitted to perform this operation. Allowed: ${allowedRoles.join(", ")}`,
        },
      });
    }

    (req as any).user = user;
    next();
  };
}

// ----------------------------------------------------------------------------
// 1. Health & Demonstration Reset
// ----------------------------------------------------------------------------

api.get("/health", (_req, res) => {
  res.json({
    data: {
      service: "n-lams-api",
      status: "ok",
      demoMode: true,
      persistence: "local-json",
      version: "2.0-SIH-DEMO",
      timestamp: new Date().toISOString(),
    },
  });
});

api.post("/demo/reset", (_req, res) => {
  const fresh = resetState();
  res.json({
    data: {
      message: "N-LAMS demonstration environment reset to clean baseline. No external or native projects present.",
      projects: fresh.projects.length,
      cases: fresh.cases.length,
      parcels: fresh.parcels.length,
      tasks: fresh.tasks.length,
      officers: fresh.users.length,
      masterVillages: fresh.masterVillages.length,
    },
  });
});

// ----------------------------------------------------------------------------
// 2. Authentication & Profile
// ----------------------------------------------------------------------------

api.post("/auth/login", (req, res) => {
  const input = z.object({ email: z.string().min(1), password: z.string().min(1) }).parse(req.body);
  const state = loadState();
  const normalizedEmail = input.email.trim().toLowerCase();

  const user = state.users.find((u) => {
    const emailMatch = u.email.toLowerCase() === normalizedEmail || u.id.toLowerCase() === normalizedEmail;
    const passwordMatch = input.password === "Demo@123" || u.password === input.password || input.password === "Admin@123";
    return emailMatch && passwordMatch;
  });

  if (!user) {
    return res.status(401).json({
      error: { code: "INVALID_CREDENTIALS", message: "Invalid demo credentials. Use Demo@123 or select a 1-click role." },
    });
  }

  return res.json({
    data: {
      token: user.id,
      user: {
        id: user.id,
        officerId: user.officerId,
        employeeReference: user.employeeReference,
        email: user.email,
        displayName: user.displayName,
        designation: user.designation,
        role: user.role,
        department: user.department,
        organization: user.organization,
        district: user.district,
        state: user.state,
        tehsil: user.tehsil,
        village: user.village,
        jurisdictionType: user.jurisdictionType,
        source: user.source,
      },
    },
  });
});

api.get("/me", (req, res) => {
  const user = getAuthUser(req);
  res.json({
    data: user
      ? {
          id: user.id,
          officerId: user.officerId,
          employeeReference: user.employeeReference,
          email: user.email,
          displayName: user.displayName,
          designation: user.designation,
          role: user.role,
          department: user.department,
          organization: user.organization,
          district: user.district,
          state: user.state,
          tehsil: user.tehsil,
          village: user.village,
          jurisdictionType: user.jurisdictionType,
          source: user.source,
        }
      : null,
  });
});

// ----------------------------------------------------------------------------
// 3. Master Authority & Jurisdictions Registry
// ----------------------------------------------------------------------------

api.get("/master/departments", (_req, res) => {
  const state = loadState();
  res.json({ data: state.masterDepartments });
});

api.get("/master/organizations", (_req, res) => {
  const state = loadState();
  res.json({ data: state.masterOrganizations });
});

api.get("/master/jurisdictions", (_req, res) => {
  const state = loadState();
  res.json({
    data: {
      states: state.masterStates,
      districts: state.masterDistricts,
      tehsils: state.masterTehsils,
      villages: state.masterVillages,
    },
  });
});

api.get("/master/officers", (_req, res) => {
  const state = loadState();
  res.json({
    data: state.users.map((u) => ({
      id: u.id,
      officerId: u.officerId,
      employeeReference: u.employeeReference,
      displayName: u.displayName,
      designation: u.designation,
      role: u.role,
      department: u.department,
      organization: u.organization,
      state: u.state,
      district: u.district,
      tehsil: u.tehsil,
      village: u.village,
      jurisdictionType: u.jurisdictionType,
      email: u.email,
      active: u.active,
      source: u.source,
      sourceReference: u.sourceReference,
      verifiedAt: u.verifiedAt,
    })),
  });
});

api.get("/master/parcels", (_req, res) => {
  const state = loadState();
  res.json({ data: state.masterParcelsPool });
});

// ----------------------------------------------------------------------------
// 4. National Dashboard Aggregates
// ----------------------------------------------------------------------------

api.get("/dashboard/summary", (_req, res) => {
  const state = loadState();
  const projects = state.projects || [];
  const cases = state.cases || [];
  const parcels = state.parcels || [];
  const tasks = state.tasks || [];
  const compensation = state.compensation || [];
  const rr = state.rr || [];
  const possession = state.possession || [];

  const active = projects.filter((p) => p?.status !== "Completed").length;
  const highRisk = cases.filter((c) => ["High", "HIGH", "Critical"].includes(c?.risk || "")).length;

  res.json({
    data: {
      totalProjects: projects.length,
      activeProjects: active,
      totalCases: cases.length,
      totalParcels: parcels.length,
      acquiredParcels: parcels.filter((p) => ["POSSESSION_COMPLETED", "ACQUIRED"].includes(p?.acquisitionStatus || "")).length,
      landRequiredHa: Number(projects.reduce((sum, p) => sum + (Number(p?.landRequiredHa) || 0), 0).toFixed(2)),
      landAcquiredHa: Number(projects.reduce((sum, p) => sum + (Number(p?.landAcquiredHa) || 0), 0).toFixed(2)),
      inProgress: cases.filter((c) => ["In Progress", "Under Review", "Submitted"].includes(c?.status || "")).length,
      completed: cases.filter((c) => ["Completed", "Approved", "Possession Completed"].includes(c?.status || "")).length,
      atRisk: highRisk,
      pendingTasks: tasks.filter((t) => t?.status === "PENDING" || t?.status === "IN_PROGRESS").length,
      compensationAssessed: compensation.reduce((sum, item) => sum + (Number(item?.assessedAmount) || 0), 0),
      compensationApproved: compensation.reduce((sum, item) => sum + (Number(item?.approvedAmount) || 0), 0),
      compensationPaid: compensation.reduce((sum, item) => sum + (Number(item?.paidAmount) || 0), 0),
      rrFamiliesAffected: rr.reduce((sum, item) => sum + (Number(item?.affectedFamilies) || 0), 0),
      rrFamiliesDelivered: rr.reduce((sum, item) => sum + (Number(item?.benefitsDelivered) || 0), 0),
      possessionsCompleted: possession.filter((pr) => pr?.status === "POSSESSION_COMPLETED").length,
      externalProjectsCount: projects.filter((p) => p?.sourceType === "EXTERNAL").length,
      nativeProjectsCount: projects.filter((p) => p?.sourceType === "NATIVE").length,
    },
  });
});

// ----------------------------------------------------------------------------
// 5. Projects API (Native Creation & External Unified View)
// ----------------------------------------------------------------------------

api.get("/projects", (_req, res) => {
  const state = loadState();
  res.json({ data: state.projects });
});

api.get("/projects/:id", (req, res) => {
  const state = loadState();
  const project = state.projects.find((p) => p.id === req.params.id || p.projectId === req.params.id);
  if (!project) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found" } });
  }

  const projectParcels = state.parcels.filter((p) => p.projectId === project.id);
  const projectCases = state.cases.filter((c) => c.projectId === project.id);
  const syncHistory = state.syncOperations.filter((s) => s.localProjectId === project.projectId || s.externalProjectId === project.externalProjectId);

  res.json({
    data: {
      ...project,
      parcels: projectParcels,
      cases: projectCases,
      syncHistory,
    },
  });
});

api.post(
  "/projects",
  requireRole("PROJECT_OFFICER", "PROJECT_AUTHORITY", "NATIONAL_ADMIN", "SUPER_ADMIN"),
  (req, res) => {
    const input = z
      .object({
        projectId: z.string().optional(),
        name: z.string().min(3),
        department: z.string().min(2),
        authority: z.string().optional(),
        type: z.string().min(2),
        state: z.string().min(2),
        district: z.string().min(2),
        tehsil: z.string().optional(),
        village: z.string().optional(),
        targetDate: z.string().optional(),
        description: z.string().optional(),
        alignment: z.array(z.array(z.number())).optional(),
        bufferMeters: z.number().optional(),
        selectedParcelIds: z.array(z.string()).optional(),
        submitImmediately: z.boolean().optional(),
      })
      .parse(req.body);

    const state = loadState();
    const user = (req as any).user;
    const projectRecordId = `prj-native-${Date.now()}`;
    const projectCode = input.projectId || `HR-INFRA-2026-${String(state.projects.length + 1).padStart(3, "0")}`;

    const newProject: Project = {
      id: projectRecordId,
      projectId: projectCode,
      name: input.name,
      department: input.department,
      authority: input.authority || "State Infrastructure Authority (Haryana)",
      type: input.type,
      state: input.state,
      district: input.district,
      tehsil: input.tehsil || "Ambala",
      village: input.village || "Demo Kalan",
      status: input.submitImmediately ? "Submitted" : "Draft",
      progress: input.submitImmediately ? 10 : 0,
      targetDate: input.targetDate || "2027-12-31",
      description: input.description || "Native State Infrastructure Corridor Project.",
      alignment: input.alignment && input.alignment.length > 0 ? (input.alignment as [number, number][]) : [
        [30.368, 76.782],
        [30.380, 76.812],
        [30.395, 76.850],
      ],
      bufferMeters: input.bufferMeters || 100,
      workflowTemplateId: "HARYANA_NATIVE_DEMO_WORKFLOW",
      sourceType: "NATIVE",
      sourceSystem: "NLAMS",
      isNative: true,
      landRequiredHa: 0,
      landAcquiredHa: 0,
      affectedParcelsCount: 0,
      createdAt: new Date().toISOString(),
    };

    // Associate Master Cadastral Parcels
    const selectedIds = input.selectedParcelIds || ["pcl-hr-amb-001", "pcl-hr-amb-002", "pcl-hr-amb-003"];
    const associatedParcels: Parcel[] = [];

    for (const pid of selectedIds) {
      const masterP = state.masterParcelsPool.find((mp) => mp.id === pid || mp.parcelId === pid);
      if (masterP) {
        const assignedParcel: Parcel = {
          ...masterP,
          projectId: projectRecordId,
          acquisitionStatus: input.submitImmediately ? "ADMINISTRATIVE_REVIEW" : "IDENTIFIED",
        };
        state.parcels.push(assignedParcel);
        associatedParcels.push(assignedParcel);
      }
    }

    newProject.landRequiredHa = Number(associatedParcels.reduce((sum, p) => sum + p.requiredArea, 0).toFixed(2));
    newProject.affectedParcelsCount = associatedParcels.length;
    state.projects.unshift(newProject);

    audit(state, user.email, user.role, "PROJECT_CREATED", "PROJECT", projectCode, {
      name: newProject.name,
      parcelsCount: associatedParcels.length,
    });

    // If submitted immediately, execute submission workflow
    if (input.submitImmediately) {
      executeProjectSubmission(state, newProject, associatedParcels, user);
    }

    saveState();
    res.json({ data: newProject });
  },
);

api.post(
  "/projects/:id/submit",
  requireRole("PROJECT_OFFICER", "PROJECT_AUTHORITY", "NATIONAL_ADMIN", "SUPER_ADMIN"),
  (req, res) => {
    const state = loadState();
    const user = (req as any).user;
    const project = state.projects.find((p) => p.id === req.params.id || p.projectId === req.params.id);

    if (!project) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found" } });
    }

    project.status = "Submitted";
    project.progress = 10;
    const projectParcels = state.parcels.filter((p) => p.projectId === project.id);

    executeProjectSubmission(state, project, projectParcels, user);
    saveState();

    res.json({
      data: {
        message: `Project ${project.projectId} submitted for Administrative Review.`,
        project,
      },
    });
  },
);

function executeProjectSubmission(state: ReturnType<typeof loadState>, project: Project, parcels: Parcel[], user: any) {
  const adminStage = state.workflowStages.find((s) => s.id === "stage-admin-rev") || state.workflowStages[1];

  // Resolve responsible District Officer in Ambala
  const districtOfficer = findResponsibleOfficer(state, {
    requiredRole: "DISTRICT_OFFICER",
    districtName: project.district,
    stateName: project.state,
    projectId: project.id,
  });

  for (let i = 0; i < parcels.length; i++) {
    const p = parcels[i];
    const caseId = `case-${project.id}-${i + 1}`;
    const caseReference = `NLA-HR-2026-000${i + 1}`;

    const newCase: Case = {
      id: caseId,
      caseId: caseReference,
      projectId: project.id,
      parcelId: p.id,
      status: "Submitted",
      risk: i === 1 ? "Medium" : "Low",
      priority: "MEDIUM",
      currentStage: adminStage.name,
      progress: 10,
      assignedOfficerId: districtOfficer.email,
      dueDate: new Date(Date.now() + adminStage.slaDays * 86400000).toISOString(),
      externalRefs: [{ system: "State Land Records (Jamabandi)", id: p.sourceReference }],
      acquisitionPurpose: project.name,
      createdAt: new Date().toISOString(),
    };

    p.caseId = caseId;
    p.acquisitionStatus = "ADMINISTRATIVE_REVIEW";
    state.cases.push(newCase);

    // Initial Compensation Record
    state.compensation.push({
      id: `comp-${caseId}`,
      caseId: newCase.id,
      caseReference: newCase.caseId,
      parcelId: p.parcelId,
      village: p.village,
      assessedAmount: Math.round(p.requiredArea * 1250000 * 1.25 * 2), // Market rate * rural factor * solatium
      approvedAmount: 0,
      paidAmount: 0,
      status: "PENDING",
      sourceSystem: "PFMS (DEMO)",
    });

    // Initial R&R Record
    state.rr.push({
      id: `rr-${caseId}`,
      caseId: newCase.id,
      caseReference: newCase.caseId,
      parcelId: p.parcelId,
      village: p.village,
      affectedFamilies: 2 + i,
      displacedFamilies: 0,
      eligibleFamilies: 2 + i,
      benefitsDelivered: 0,
      status: "IDENTIFIED",
      sourceSystem: "N-LAMS DEMO R&R",
    });

    // Initial Possession Record
    state.possession.push({
      id: `pos-${caseId}`,
      caseId: newCase.id,
      caseReference: newCase.caseId,
      parcelId: p.parcelId,
      village: p.village,
      status: "NOT_READY",
    });

    addCaseActivity(
      state,
      newCase.id,
      user.email,
      user.role,
      user.displayName,
      "PROJECT_SUBMITTED",
      `Project ${project.projectId} submitted. Case initialized for parcel ${p.parcelId} (Survey ${p.surveyNumber}).`,
    );
  }

  // Create Administrative Review Task for District Officer
  const task: Task = {
    id: `task-admin-rev-${Date.now()}`,
    caseId: state.cases[state.cases.length - parcels.length]?.id || project.id,
    stageId: adminStage.id,
    status: "IN_PROGRESS",
    assignedUserId: districtOfficer.email,
    dueAt: new Date(Date.now() + adminStage.slaDays * 86400000).toISOString(),
    remarks: `Administrative review and statutory sanction for ${project.name}.`,
  };
  state.tasks.unshift(task);

  notify(
    state,
    districtOfficer.email,
    "TASK_ASSIGNED",
    "Administrative Review Assigned",
    `Project ${project.projectId} submitted for administrative review in ${project.district}.`,
    "INFO",
    "TASK",
    task.id,
    project.id,
    task.caseId,
    task.id,
  );

  audit(state, user.email, user.role, "PROJECT_SUBMITTED", "PROJECT", project.projectId, {
    assignedTo: districtOfficer.email,
    casesCount: parcels.length,
  });
}

// ----------------------------------------------------------------------------
// 6. Cases API
// ----------------------------------------------------------------------------

api.get("/cases", (req, res) => {
  const state = loadState();
  const user = getAuthUser(req);
  const cases = state.cases || [];

  let filtered = cases;

  if (user) {
    const role = user.role;
    if (role === "NATIONAL_ADMIN" || role === "SUPER_ADMIN" || role === "VIEWER") {
      filtered = cases;
    } else if (role === "FIELD_OFFICER") {
      filtered = cases.filter((c) => {
        const p = state.parcels.find((item) => item.id === c.parcelId || item.parcelId === c.parcelId);
        if (c.assignedOfficerId === user.email || c.assignedOfficerId === user.id) return true;
        const hasTask = state.tasks.some(
          (t) => t.caseId === c.id && (t.assignedUserId === user.email || t.assignedUserId === user.id),
        );
        if (hasTask) return true;

        if (user.village && p?.village) {
          return user.village.toLowerCase() === p.village.toLowerCase();
        }
        if (user.tehsil && p?.tehsil) {
          return user.tehsil.toLowerCase() === p.tehsil.toLowerCase();
        }
        if (user.district && p?.district) {
          return user.district.toLowerCase() === p.district.toLowerCase();
        }
        return false;
      });
    } else if (role === "PROJECT_OFFICER" || role === "PROJECT_AUTHORITY") {
      filtered = cases.filter((c) => {
        const proj = state.projects.find((item) => item.id === c.projectId || item.projectId === c.projectId);
        if (c.assignedOfficerId === user.email || c.assignedOfficerId === user.id) return true;
        if (!proj) return true;
        if (user.district && user.district !== "All" && proj.district) {
          return user.district.toLowerCase() === proj.district.toLowerCase();
        }
        if (user.state && user.state !== "National" && proj.state) {
          return user.state.toLowerCase() === proj.state.toLowerCase();
        }
        return true;
      });
    } else if (role === "DISTRICT_OFFICER" || role === "REVIEWER") {
      filtered = cases.filter((c) => {
        const p = state.parcels.find((item) => item.id === c.parcelId || item.parcelId === c.parcelId);
        const proj = state.projects.find((item) => item.id === c.projectId || item.projectId === c.projectId);
        if (c.assignedOfficerId === user.email || c.assignedOfficerId === user.id) return true;
        if (user.district === "All" || !user.district) return true;
        return (
          p?.district?.toLowerCase() === user.district.toLowerCase() ||
          proj?.district?.toLowerCase() === user.district.toLowerCase()
        );
      });
    } else if (role === "COMPENSATION_OFFICER" || role === "COMPENSATION_REVIEWER" || role === "FINANCE_OFFICER") {
      filtered = cases.filter((c) => {
        const p = state.parcels.find((item) => item.id === c.parcelId || item.parcelId === c.parcelId);
        if (c.assignedOfficerId === user.email || c.assignedOfficerId === user.id) return true;
        if (user.district === "All" || !user.district) return true;
        return p?.district?.toLowerCase() === user.district.toLowerCase();
      });
    } else if (role === "RR_OFFICER" || role === "RR_REVIEWER") {
      filtered = cases.filter((c) => {
        const p = state.parcels.find((item) => item.id === c.parcelId || item.parcelId === c.parcelId);
        if (c.assignedOfficerId === user.email || c.assignedOfficerId === user.id) return true;
        if (user.district === "All" || !user.district) return true;
        return p?.district?.toLowerCase() === user.district.toLowerCase();
      });
    }
  }

  // Hydrate all case properties for frontend list views
  const hydrated = filtered.map((c) => {
    const p = state.parcels.find((item) => item.id === c.parcelId || item.parcelId === c.parcelId);
    const proj = state.projects.find((item) => item.id === c.projectId || item.projectId === c.projectId);
    const assignedOfficer = state.users.find((u) => u.email === c.assignedOfficerId || u.id === c.assignedOfficerId);

    return {
      ...c,
      projectName: proj?.name || c.acquisitionPurpose || "Infrastructure Corridor",
      village: p?.village || proj?.village || "",
      tehsil: p?.tehsil || proj?.tehsil || "",
      district: p?.district || proj?.district || "",
      state: p?.state || proj?.state || "",
      surveyNumber: p?.surveyNumber || "",
      parcelNumber: p?.parcelId || c.parcelId,
      officer: assignedOfficer?.displayName || c.assignedOfficerId || "Assigned by jurisdiction",
      project: proj,
      parcel: p,
    };
  });

  res.json({ data: hydrated });
});

api.get("/cases/:id", (req, res) => {
  const state = loadState();
  const c = state.cases.find((item) => item.id === req.params.id || item.caseId === req.params.id);
  if (!c) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Case not found" } });
  }

  const project = state.projects.find((p) => p.id === c.projectId || p.projectId === c.projectId);
  const parcel = state.parcels.find((p) => p.id === c.parcelId || p.parcelId === c.parcelId);
  const rawTasks = state.tasks.filter((t) => t.caseId === c.id);
  const tasks = rawTasks.map((t) => {
    const stage = state.workflowStages.find((s) => s.id === t.stageId);
    const assignedUser = state.users.find((u) => u.email === t.assignedUserId || u.id === t.assignedUserId);
    return {
      ...t,
      stage,
      assignedUser,
    };
  });
  const documents = state.documents.filter((d) => d.caseId === c.id || d.projectId === c.projectId);
  const comp = state.compensation.find((cr) => cr.caseId === c.id);
  const rrRec = state.rr.find((r) => r.caseId === c.id);
  const posRec = state.possession.find((p) => p.caseId === c.id);
  const assignedOfficer = state.users.find((u) => u.email === c.assignedOfficerId || u.id === c.assignedOfficerId);

  res.json({
    data: {
      ...c,
      projectName: project?.name || c.acquisitionPurpose,
      village: parcel?.village || project?.village,
      district: parcel?.district || project?.district,
      state: parcel?.state || project?.state,
      surveyNumber: parcel?.surveyNumber,
      parcelNumber: parcel?.parcelId || c.parcelId,
      officer: assignedOfficer?.displayName || c.assignedOfficerId || "Assigned by jurisdiction",
      assignedOfficer,
      project,
      parcel,
      tasks,
      documents,
      compensation: comp,
      rr: rrRec,
      possession: posRec,
    },
  });
});

api.get("/cases/:id/timeline", (req, res) => {
  const state = loadState();
  const activities = state.caseActivities.filter((a) => a.caseId === req.params.id);
  res.json({ data: activities });
});

// ----------------------------------------------------------------------------
// 7. Scoped Tasks API & Role-Based Action Authorization
// ----------------------------------------------------------------------------

api.get("/tasks/my", requireAuth, (req, res) => {
  const state = loadState();
  const user = (req as any).user;

  // Filter tasks strictly by assigned officer OR user's role and jurisdictional scope
  const filtered = state.tasks.filter((t) => {
    if (t.status === "COMPLETED") return false;

    // Direct assignment match
    if (t.assignedUserId === user.id || t.assignedUserId === user.email) return true;

    const taskCase = state.cases.find((c) => c.id === t.caseId);
    const taskParcel = taskCase ? state.parcels.find((p) => p.id === taskCase.parcelId) : null;
    const taskStage = state.workflowStages.find((s) => s.id === t.stageId);

    if (!taskStage) return false;

    // Field Officer Queue: Must match FIELD_OFFICER role + Tehsil/Village jurisdiction
    if (user.role === "FIELD_OFFICER" && taskStage.responsibleRole === "FIELD_OFFICER") {
      if (user.village && taskParcel?.village) {
        return user.village.toLowerCase() === taskParcel.village.toLowerCase();
      }
      if (user.tehsil && taskParcel?.tehsil) {
        return user.tehsil.toLowerCase() === taskParcel.tehsil.toLowerCase();
      }
      return user.district?.toLowerCase() === taskParcel?.district?.toLowerCase();
    }

    // Reviewer Queue: Must match REVIEWER role + District/Tehsil
    if (user.role === "REVIEWER" && taskStage.responsibleRole === "REVIEWER") {
      return !taskParcel || user.district?.toLowerCase() === taskParcel.district?.toLowerCase() || user.district === "All";
    }

    // District Officer Queue: Must match DISTRICT_OFFICER role + District
    if (user.role === "DISTRICT_OFFICER" && taskStage.responsibleRole === "DISTRICT_OFFICER") {
      return !taskParcel || user.district?.toLowerCase() === taskParcel.district?.toLowerCase() || user.district === "All";
    }

    // Compensation Officer Queue
    if (user.role === "COMPENSATION_OFFICER" && taskStage.responsibleRole === "COMPENSATION_OFFICER") {
      return true;
    }

    // Compensation Reviewer Queue
    if (user.role === "COMPENSATION_REVIEWER" && taskStage.responsibleRole === "COMPENSATION_REVIEWER") {
      return true;
    }

    // R&R Officer Queue
    if (user.role === "RR_OFFICER" && taskStage.responsibleRole === "RR_OFFICER") {
      return true;
    }

    // R&R Reviewer Queue
    if (user.role === "RR_REVIEWER" && taskStage.responsibleRole === "RR_REVIEWER") {
      return true;
    }

    // National Admin can oversee
    if (user.role === "NATIONAL_ADMIN" || user.role === "SUPER_ADMIN") {
      return true;
    }

    return false;
  });

  const hydrated = filtered.map((t) => {
    const c = state.cases.find((item) => item.id === t.caseId);
    const p = c ? state.parcels.find((item) => item.id === c.parcelId) : null;
    const proj = c ? state.projects.find((item) => item.id === c.projectId) : null;
    const stage = state.workflowStages.find((s) => s.id === t.stageId);
    return {
      ...t,
      case: c,
      parcel: p,
      project: proj,
      stage,
    };
  });

  res.json({ data: hydrated });
});

// Centralized Workflow Stage Advancement Function
export function executeStageAdvancement(
  state: ReturnType<typeof loadState>,
  targetCase: Case,
  currentTask: Task | undefined,
  currentStage: WorkflowStage,
  user: any,
  customRemarks?: string,
) {
  const remarks = customRemarks || `Stage ${currentStage.name} completed and verified by ${user.displayName || user.email} (${user.role || "OFFICER"}).`;

  if (currentTask) {
    currentTask.status = "COMPLETED";
    currentTask.completedAt = new Date().toISOString();
    currentTask.remarks = remarks;
  }

  const relatedParcel = state.parcels.find((p) => p.id === targetCase.parcelId || p.parcelId === targetCase.parcelId);
  const relatedProject = state.projects.find((p) => p.id === targetCase.projectId || p.projectId === targetCase.projectId);

  // Auto-Attach Required Synthetic Document upon stage approval
  const docType = currentStage.mandatoryDocumentType || "OTHER";
  const docId = `doc-${Date.now()}`;
  const docRecord: DocumentRecord = {
    id: docId,
    documentId: `DOC-${Date.now().toString().slice(-6)}`,
    projectId: targetCase.projectId,
    caseId: targetCase.id,
    parcelId: relatedParcel?.parcelId,
    workflowStage: currentStage.name,
    documentType: docType,
    documentCategory: "STATUTORY",
    title: `${currentStage.name} Sanction Document`,
    fileName: `${currentStage.name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}.pdf`,
    fileSize: "1.4 MB",
    mimeType: "application/pdf",
    storageUrl: `/documents/mock/${docId}.pdf`,
    checksum: `sha256:d8a1f${Date.now().toString(16)}`,
    version: 1,
    mandatory: true,
    approvalRequired: true,
    status: "APPROVED",
    uploadedBy: user.id || user.email || "SYSTEM",
    uploadedByName: user.displayName || user.email || "System Authority",
    uploadedAt: new Date().toISOString(),
    remarks: "DEMO / SYNTHETIC DOCUMENT — NOT A LEGAL GOVERNMENT NOTIFICATION",
  };
  state.documents.unshift(docRecord);
  if (currentTask) {
    currentTask.attachedDocumentId = docId;
  }

  // Update Auxiliary Records depending on stage completed
  const compItem = state.compensation.find((cr) => cr.caseId === targetCase.id);
  const rrItem = state.rr.find((r) => r.caseId === targetCase.id);
  const posItem = state.possession.find((pr) => pr.caseId === targetCase.id);

  if (currentStage.id === "stage-admin-rev" || currentStage.sequence === 2) {
    if (relatedParcel) relatedParcel.acquisitionStatus = "FIELD_VERIFICATION_PENDING";
  } else if (currentStage.id === "stage-field-ver" || currentStage.sequence === 3) {
    if (relatedParcel) relatedParcel.acquisitionStatus = "FIELD_VERIFIED";
  } else if (currentStage.id === "stage-comp-assess" || currentStage.sequence === 5) {
    if (compItem && compItem.status === "PENDING") {
      compItem.status = "ASSESSED";
    }
  } else if (currentStage.id === "stage-comp-appr" || currentStage.sequence === 6) {
    if (compItem) {
      compItem.status = "APPROVED";
      compItem.approvedAmount = compItem.approvedAmount || compItem.assessedAmount;
    }
  } else if (currentStage.id === "stage-payment" || currentStage.sequence === 7) {
    if (compItem) {
      compItem.status = "PAID";
      compItem.paidAmount = compItem.approvedAmount || compItem.assessedAmount;
      compItem.paymentReference = compItem.paymentReference || `DEMO-PFMS-2026-${randomUUID().slice(0, 8).toUpperCase()}`;
      compItem.lastSyncedAt = new Date().toISOString();
    }
  } else if (currentStage.id === "stage-rr-assess" || currentStage.sequence === 8) {
    if (rrItem && rrItem.status === "IDENTIFIED") {
      rrItem.status = "ASSESSED";
    }
  } else if (currentStage.id === "stage-rr-appr" || currentStage.sequence === 9) {
    if (rrItem) {
      rrItem.status = "COMPLETED";
      rrItem.benefitsDelivered = rrItem.eligibleFamilies;
    }
  } else if (currentStage.id === "stage-possession" || currentStage.sequence === 10) {
    if (posItem) {
      posItem.status = "POSSESSION_COMPLETED";
      posItem.possessionDate = new Date().toISOString();
      posItem.officerId = user.email;
    }
    if (relatedParcel) {
      relatedParcel.acquisitionStatus = "POSSESSION_COMPLETED";
    }
    targetCase.status = "Completed";
    targetCase.progress = 100;
  }

  // Determine Next Generic Workflow Stage
  const currentSeq = currentStage.sequence;
  const nextStage = state.workflowStages.find((s) => s.sequence === currentSeq + 1);

  let nextTask: Task | undefined;

  if (nextStage) {
    targetCase.currentStage = nextStage.name;
    targetCase.progress = Math.min(100, Math.round((nextStage.sequence / state.workflowStages.length) * 100));

    // Resolve next responsible officer
    const nextOfficer = findResponsibleOfficer(state, {
      requiredRole: nextStage.responsibleRole,
      stateName: relatedParcel?.state || relatedProject?.state,
      districtName: relatedParcel?.district || relatedProject?.district,
      tehsilName: relatedParcel?.tehsil || relatedProject?.tehsil,
      villageName: relatedParcel?.village || relatedProject?.village,
      projectId: relatedProject?.id,
    });

    targetCase.assignedOfficerId = nextOfficer.email;

    nextTask = {
      id: `task-${nextStage.id}-${Date.now()}`,
      caseId: targetCase.id,
      stageId: nextStage.id,
      status: "IN_PROGRESS",
      assignedUserId: nextOfficer.email,
      dueAt: new Date(Date.now() + nextStage.slaDays * 86400000).toISOString(),
      remarks: `Manage ${nextStage.name} for ${targetCase.caseId}.`,
    };
    state.tasks.unshift(nextTask);

    notify(
      state,
      nextOfficer.email,
      "TASK_ASSIGNED",
      `${nextStage.name} Assigned`,
      `Case ${targetCase.caseId} advanced to ${nextStage.name}.`,
      "INFO",
      "TASK",
      nextTask.id,
      targetCase.projectId,
      targetCase.id,
      nextTask.id,
    );
  } else {
    targetCase.currentStage = "Project Completion & Cadastral Handover";
    targetCase.status = "Completed";
    targetCase.progress = 100;
    if (relatedParcel) {
      relatedParcel.acquisitionStatus = "POSSESSION_COMPLETED";
    }
  }

  // Update Project progress
  if (relatedProject) {
    const projectCases = state.cases.filter((cas) => cas.projectId === relatedProject.id);
    const avgProgress = Math.round(projectCases.reduce((sum, cas) => sum + cas.progress, 0) / (projectCases.length || 1));
    relatedProject.progress = avgProgress;
    if (projectCases.length > 0 && projectCases.every((cas) => cas.status === "Completed")) {
      relatedProject.status = "Completed";
    } else if (relatedProject.status === "Draft") {
      relatedProject.status = "In Progress";
    }
  }

  addCaseActivity(
    state,
    targetCase.id,
    user.email,
    user.role,
    user.displayName,
    "STAGE_APPROVED",
    `${currentStage.name} verified and approved. Routed to ${nextStage?.name || "Completion"}. Attached ${docRecord.title}.`,
    { stage: currentStage.name, documentId: docId },
  );

  audit(state, user.email, user.role, "TASK_APPROVED", "TASK", currentTask?.id || targetCase.id, {
    stage: currentStage.name,
    caseId: targetCase.id,
  });

  return {
    case: targetCase,
    task: currentTask,
    nextTask,
    completedStage: currentStage.name,
    nextStage: nextStage?.name,
    document: docRecord,
  };
}

// Dynamic Workflow Advance / Task Approval & Completion Handler
function handleTaskApproveOrComplete(req: Request, res: Response) {
  const state = loadState();
  const user = (req as any).user;
  const task = state.tasks.find((t) => t.id === req.params.id);

  if (!task) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Task not found" } });
  }

  const stage = state.workflowStages.find((s) => s.id === task.stageId);
  if (!stage) {
    return res.status(400).json({ error: { code: "INVALID_STAGE", message: "Workflow stage undefined" } });
  }

  // Server-Side Role Verification
  const isAuthorizedRole =
    user.role === stage.responsibleRole ||
    user.role === "SUPER_ADMIN" ||
    user.role === "NATIONAL_ADMIN" ||
    (stage.responsibleRole === "PROJECT_OFFICER" && user.role === "PROJECT_AUTHORITY") ||
    (stage.responsibleRole === "COMPENSATION_REVIEWER" && user.role === "FINANCE_OFFICER");

  if (!isAuthorizedRole && task.assignedUserId !== user.email && task.assignedUserId !== user.id) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: `Your role (${user.role}) is not authorized to approve ${stage.name}. Responsible role: ${stage.responsibleRole}.`,
      },
    });
  }

  const relatedCase = state.cases.find((c) => c.id === task.caseId);
  if (!relatedCase) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Associated case not found" } });
  }

  const result = executeStageAdvancement(state, relatedCase, task, stage, user, req.body?.remarks);
  saveState();

  res.json({
    data: {
      message: `${stage.name} approved successfully. Routed to ${result.nextStage || "Completion"}.`,
      task: result.task,
      nextStage: result.nextStage,
      document: result.document,
    },
  });
}

api.post("/tasks/:id/approve", requireAuth, handleTaskApproveOrComplete);
api.post("/tasks/:id/complete", requireAuth, handleTaskApproveOrComplete);

// Direct Case Stage Advancement (Complete Current Stage on Case)
function handleCaseAdvance(req: Request, res: Response) {
  const state = loadState();
  const user = (req as any).user;
  const targetCase = state.cases.find((c) => c.id === req.params.id || c.caseId === req.params.id);

  if (!targetCase) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Case not found" } });
  }

  // Find active task or match stage by case's currentStage
  const activeTask = state.tasks.find((t) => t.caseId === targetCase.id && ["PENDING", "IN_PROGRESS", "OVERDUE"].includes(t.status));
  const currentStage = activeTask
    ? state.workflowStages.find((s) => s.id === activeTask.stageId)
    : state.workflowStages.find((s) => s.name.toLowerCase() === targetCase.currentStage?.toLowerCase()) || state.workflowStages[1];

  if (!currentStage) {
    return res.status(400).json({ error: { code: "INVALID_STAGE", message: "Workflow stage undefined" } });
  }

  // Server-Side Role Verification
  const isAuthorizedRole =
    user.role === currentStage.responsibleRole ||
    user.role === "SUPER_ADMIN" ||
    user.role === "NATIONAL_ADMIN" ||
    (currentStage.responsibleRole === "PROJECT_OFFICER" && user.role === "PROJECT_AUTHORITY") ||
    (currentStage.responsibleRole === "COMPENSATION_REVIEWER" && user.role === "FINANCE_OFFICER");

  if (!isAuthorizedRole && activeTask && activeTask.assignedUserId !== user.email && activeTask.assignedUserId !== user.id) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: `Your role (${user.role}) is not authorized to approve ${currentStage.name}. Responsible role: ${currentStage.responsibleRole}.`,
      },
    });
  }

  const result = executeStageAdvancement(state, targetCase, activeTask, currentStage, user, req.body?.remarks);
  saveState();

  res.json({
    data: {
      message: `${currentStage.name} completed successfully. Routed to ${result.nextStage || "Completion"}.`,
      case: result.case,
      nextStage: result.nextStage,
      document: result.document,
    },
  });
}

api.post("/cases/:id/advance", requireAuth, handleCaseAdvance);
api.post("/cases/:id/complete-stage", requireAuth, handleCaseAdvance);

// Field Verification Submission
api.post(
  "/tasks/:id/field-verification",
  requireRole("FIELD_OFFICER", "SUPER_ADMIN"),
  (req, res) => {
    const state = loadState();
    const user = (req as any).user;
    const task = state.tasks.find((t) => t.id === req.params.id);

    if (!task) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Task not found" } });
    }

    const input = req.body || {};
    const relatedCase = state.cases.find((c) => c.id === task.caseId);
    const relatedParcel = relatedCase ? state.parcels.find((p) => p.id === relatedCase.parcelId) : null;
    const relatedProject = relatedCase ? state.projects.find((p) => p.id === relatedCase.projectId) : null;

    const evidence: FieldEvidence = {
      id: `ev-${Date.now()}`,
      projectId: relatedCase?.projectId || "",
      parcelId: relatedParcel?.parcelId || "",
      caseId: task.caseId,
      taskId: task.id,
      uploadedBy: user.email,
      uploadedByName: user.displayName,
      uploadedAt: new Date().toISOString(),
      evidenceType: "CADASTRAL_GROUND_SURVEY",
      latitude: Number(input.latitude || 30.368),
      longitude: Number(input.longitude || 76.786),
      isDemoGps: Boolean(input.isDemoGps ?? true),
      captureTimestamp: new Date().toISOString(),
      remarks: input.remarks || "Physical boundary verified on site. Land under agricultural use.",
      checklist: {
        physicallyIdentified: Boolean(input.physicallyIdentified ?? true),
        boundaryVerified: Boolean(input.boundaryVerified ?? true),
        landUseVerified: Boolean(input.landUseVerified ?? true),
        structureAffected: Boolean(input.structureAffected ?? false),
        encroachmentObserved: Boolean(input.encroachmentObserved ?? false),
      },
      photoUrls: input.photoUrls || [
        "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80",
      ],
      status: "APPROVED",
    };

    task.status = "COMPLETED";
    task.completedAt = new Date().toISOString();
    task.evidence = evidence;

    if (relatedParcel) {
      relatedParcel.acquisitionStatus = "FIELD_VERIFIED";
    }

    // Auto-generate Field Verification Report Document
    const docId = `doc-field-${Date.now()}`;
    const docRecord: DocumentRecord = {
      id: docId,
      documentId: `DOC-FLD-${Date.now().toString().slice(-6)}`,
      projectId: relatedCase?.projectId,
      caseId: relatedCase?.id,
      parcelId: relatedParcel?.parcelId,
      workflowStage: "Field Verification",
      documentType: "FIELD_VERIFICATION_REPORT",
      documentCategory: "EVIDENCE",
      title: `Field Ground Inspection & Evidence Report (${relatedParcel?.parcelId || "Parcel"})`,
      fileName: `field_verification_report_${Date.now()}.pdf`,
      fileSize: "2.8 MB",
      mimeType: "application/pdf",
      storageUrl: `/documents/mock/${docId}.pdf`,
      checksum: `sha256:f1e7d${Date.now().toString(16)}`,
      version: 1,
      mandatory: true,
      approvalRequired: true,
      status: "APPROVED",
      uploadedBy: user.id,
      uploadedByName: user.displayName,
      uploadedAt: new Date().toISOString(),
      remarks: "DEMO / SYNTHETIC DOCUMENT — NOT A LEGAL GOVERNMENT NOTIFICATION",
    };
    state.documents.unshift(docRecord);
    task.attachedDocumentId = docId;

    // Advance to Evidence Review & Scrutiny
    const reviewStage = state.workflowStages.find((s) => s.id === "stage-evidence-rev") || state.workflowStages[3];
    const reviewer = findResponsibleOfficer(state, {
      requiredRole: "REVIEWER",
      districtName: relatedParcel?.district || relatedProject?.district,
      stateName: relatedParcel?.state || relatedProject?.state,
    });

    if (relatedCase) {
      relatedCase.currentStage = reviewStage.name;
      relatedCase.progress = 40;

      const reviewTask: Task = {
        id: `task-rev-${Date.now()}`,
        caseId: relatedCase.id,
        stageId: reviewStage.id,
        status: "IN_PROGRESS",
        assignedUserId: reviewer.email,
        dueAt: new Date(Date.now() + reviewStage.slaDays * 86400000).toISOString(),
        remarks: `Review field evidence and cadastral boundary report for ${relatedCase.caseId}.`,
        evidence,
      };
      state.tasks.unshift(reviewTask);

      notify(
        state,
        reviewer.email,
        "TASK_ASSIGNED",
        "Evidence Review Assigned",
        `Field Officer submitted verification for ${relatedParcel?.parcelId || "Parcel"}. Scrutiny required.`,
        "INFO",
        "TASK",
        reviewTask.id,
        relatedCase.projectId,
        relatedCase.id,
        reviewTask.id,
      );

      addCaseActivity(
        state,
        relatedCase.id,
        user.email,
        user.role,
        user.displayName,
        "FIELD_VERIFIED",
        `Field verification completed with geo-tagged photo evidence (${evidence.latitude.toFixed(4)}, ${evidence.longitude.toFixed(4)}).`,
        { evidenceId: evidence.id },
      );
    }

    audit(state, user.email, user.role, "FIELD_VERIFIED", "CASE", relatedCase?.id, {
      parcelId: relatedParcel?.parcelId,
      latitude: evidence.latitude,
      longitude: evidence.longitude,
    });

    saveState();
    res.json({
      data: {
        message: "Field verification submitted successfully. Transferred to Reviewer.",
        evidence,
      },
    });
  },
);

// Reject / Request Correction
api.post("/tasks/:id/reject", requireAuth, (req, res) => {
  const state = loadState();
  const user = (req as any).user;
  const task = state.tasks.find((t) => t.id === req.params.id);

  if (!task) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Task not found" } });

  task.status = "REJECTED";
  task.remarks = req.body?.reason || "Rejected by reviewing authority.";

  const relatedCase = state.cases.find((c) => c.id === task.caseId);
  if (relatedCase) {
    relatedCase.status = "On Hold";
    addCaseActivity(state, relatedCase.id, user.email, user.role, user.displayName, "TASK_REJECTED", task.remarks || "Rejected by reviewing authority.");
  }

  saveState();
  res.json({ data: { message: "Task rejected. Case put on hold.", task } });
});

api.post("/tasks/:id/correction", requireAuth, (req, res) => {
  const state = loadState();
  const user = (req as any).user;
  const task = state.tasks.find((t) => t.id === req.params.id);

  if (!task) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Task not found" } });

  task.status = "CORRECTION_REQUESTED";
  task.remarks = req.body?.reason || "Correction requested.";

  const relatedCase = state.cases.find((c) => c.id === task.caseId);
  const relatedParcel = relatedCase ? state.parcels.find((p) => p.id === relatedCase.parcelId) : null;

  // Dispatch correction task back to field officer
  const fieldOfficer = findResponsibleOfficer(state, {
    requiredRole: "FIELD_OFFICER",
    tehsilName: relatedParcel?.tehsil,
    villageName: relatedParcel?.village,
  });

  const correctionTask: Task = {
    id: `task-corr-${Date.now()}`,
    caseId: task.caseId,
    stageId: "stage-field-ver",
    status: "IN_PROGRESS",
    assignedUserId: fieldOfficer.email,
    dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    remarks: `CORRECTION REQUIRED: ${task.remarks}`,
  };
  state.tasks.unshift(correctionTask);

  notify(
    state,
    fieldOfficer.email,
    "TASK_ASSIGNED",
    "Correction Requested",
    `Reviewer requested correction on ${relatedCase?.caseId || "Case"}: ${task.remarks}`,
    "WARNING",
    "TASK",
    correctionTask.id,
  );

  saveState();
  res.json({ data: { message: "Correction task dispatched to Field Officer.", task: correctionTask } });
});

// ----------------------------------------------------------------------------
// 8. Financials: Compensation & PFMS Direct Benefit Transfer (DBT)
// ----------------------------------------------------------------------------

api.get("/compensation", (_req, res) => {
  const state = loadState();
  res.json({ data: state.compensation });
});

api.patch(
  "/compensation/:id",
  requireRole("COMPENSATION_OFFICER", "COMPENSATION_REVIEWER", "FINANCE_OFFICER", "DISTRICT_OFFICER", "SUPER_ADMIN"),
  (req, res) => {
    const state = loadState();
    const user = (req as any).user;
    const item = state.compensation.find((cr) => cr.id === req.params.id || cr.caseId === req.params.id);

    if (!item) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Compensation record not found" } });
    }

    const { assessedAmount, approvedAmount, status } = req.body;

    if (assessedAmount !== undefined) {
      item.assessedAmount = Number(assessedAmount);
      item.status = "ASSESSED";
    }

    if (status === "APPROVED" || approvedAmount !== undefined) {
      item.status = "APPROVED";
      item.approvedAmount = Number(approvedAmount || item.assessedAmount);

      // Attach Statutory Compensation Award Document
      const docId = `doc-award-${Date.now()}`;
      const docRecord: DocumentRecord = {
        id: docId,
        documentId: `DOC-AWD-${Date.now().toString().slice(-6)}`,
        caseId: item.caseId,
        parcelId: item.parcelId,
        workflowStage: "Compensation Award Approval",
        documentType: "COMPENSATION_AWARD",
        documentCategory: "STATUTORY",
        title: `Statutory Compensation Award Declaration (${item.caseReference})`,
        fileName: `compensation_award_${Date.now()}.pdf`,
        fileSize: "1.6 MB",
        mimeType: "application/pdf",
        storageUrl: `/documents/mock/${docId}.pdf`,
        checksum: `sha256:a9d3e${Date.now().toString(16)}`,
        version: 1,
        mandatory: true,
        approvalRequired: true,
        status: "APPROVED",
        uploadedBy: user.id,
        uploadedByName: user.displayName,
        uploadedAt: new Date().toISOString(),
        remarks: "DEMO / SYNTHETIC DOCUMENT — NOT A LEGAL GOVERNMENT NOTIFICATION",
      };
      state.documents.unshift(docRecord);

      // AUTOMATIC PFMS DBT DISBURSEMENT UPON APPROVAL
      const paymentRef = `DEMO-PFMS-2026-${randomUUID().slice(0, 8).toUpperCase()}`;
      item.paidAmount = item.approvedAmount;
      item.paymentReference = paymentRef;
      item.status = "PAID";
      item.lastSyncedAt = new Date().toISOString();

      const relatedCase = state.cases.find((c) => c.id === item.caseId);
      if (relatedCase) {
        relatedCase.progress = 75;
        relatedCase.status = "In Progress";

        // Advance to R&R Assessment
        const rrStage = state.workflowStages.find((s) => s.id === "stage-rr-assess") || state.workflowStages[7];
        const rrOfficer = findResponsibleOfficer(state, { requiredRole: "RR_OFFICER" });
        relatedCase.currentStage = rrStage.name;

        const rrTask: Task = {
          id: `task-rr-${Date.now()}`,
          caseId: relatedCase.id,
          stageId: rrStage.id,
          status: "IN_PROGRESS",
          assignedUserId: rrOfficer.email,
          dueAt: new Date(Date.now() + rrStage.slaDays * 86400000).toISOString(),
          remarks: `R&R entitlement package delivery for ${relatedCase.caseId}.`,
        };
        state.tasks.unshift(rrTask);

        addCaseActivity(
          state,
          relatedCase.id,
          user.email,
          user.role,
          user.displayName,
          "COMPENSATION_PAID",
          `Compensation award of ₹${item.approvedAmount.toLocaleString("en-IN")} approved and disbursed via PFMS DBT (${paymentRef}).`,
        );
      }

      audit(state, user.email, user.role, "COMPENSATION_PAID", "COMPENSATION", item.id, {
        amount: item.approvedAmount,
        paymentReference: paymentRef,
      });
    }

    saveState();
    res.json({ data: item });
  },
);

api.post("/compensation/:id/sync", requireAuth, (req, res) => {
  const state = loadState();
  const user = (req as any).user;
  const item = state.compensation.find((cr) => cr.id === req.params.id);

  if (!item) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Compensation record not found" } });
  }

  const paymentRef = `DEMO-PFMS-2026-${randomUUID().slice(0, 8).toUpperCase()}`;
  item.status = "PAID";
  item.paidAmount = item.approvedAmount || item.assessedAmount;
  item.paymentReference = paymentRef;
  item.lastSyncedAt = new Date().toISOString();

  audit(state, user?.email || "SYSTEM", "FINANCE_OFFICER", "PFMS_DBT_SYNC", "COMPENSATION", item.id, {
    paymentReference: paymentRef,
    paidAmount: item.paidAmount,
  });

  saveState();
  res.json({ data: item });
});

// ----------------------------------------------------------------------------
// 9. R&R Entitlements API
// ----------------------------------------------------------------------------

api.get("/rr", (_req, res) => {
  const state = loadState();
  res.json({ data: state.rr });
});

api.patch(
  "/rr/:id",
  requireRole("RR_OFFICER", "RR_REVIEWER", "DISTRICT_OFFICER", "SUPER_ADMIN"),
  (req, res) => {
    const state = loadState();
    const user = (req as any).user;
    const item = state.rr.find((r) => r.id === req.params.id || r.caseId === req.params.id);

    if (!item) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "R&R record not found" } });
    }

    const { affectedFamilies, displacedFamilies, eligibleFamilies, benefitsDelivered, status } = req.body;

    if (affectedFamilies !== undefined) item.affectedFamilies = Number(affectedFamilies);
    if (displacedFamilies !== undefined) item.displacedFamilies = Number(displacedFamilies);
    if (eligibleFamilies !== undefined) item.eligibleFamilies = Number(eligibleFamilies);
    if (benefitsDelivered !== undefined) item.benefitsDelivered = Number(benefitsDelivered);

    if (status === "COMPLETED" || (benefitsDelivered && benefitsDelivered >= item.eligibleFamilies)) {
      item.status = "COMPLETED";
      item.benefitsDelivered = item.eligibleFamilies;

      // Attach R&R Approval Document
      const docId = `doc-rr-${Date.now()}`;
      const docRecord: DocumentRecord = {
        id: docId,
        documentId: `DOC-RR-${Date.now().toString().slice(-6)}`,
        caseId: item.caseId,
        parcelId: item.parcelId,
        workflowStage: "R&R Package Approval & Delivery",
        documentType: "RR_APPROVAL",
        documentCategory: "STATUTORY",
        title: `R&R Entitlement Package Delivery Sanction (${item.caseReference})`,
        fileName: `rr_delivery_sanction_${Date.now()}.pdf`,
        fileSize: "1.5 MB",
        mimeType: "application/pdf",
        storageUrl: `/documents/mock/${docId}.pdf`,
        checksum: `sha256:b8c2d${Date.now().toString(16)}`,
        version: 1,
        mandatory: true,
        approvalRequired: true,
        status: "APPROVED",
        uploadedBy: user.id,
        uploadedByName: user.displayName,
        uploadedAt: new Date().toISOString(),
        remarks: "DEMO / SYNTHETIC DOCUMENT — NOT A LEGAL GOVERNMENT NOTIFICATION",
      };
      state.documents.unshift(docRecord);

      // Advance to Possession Stage
      const relatedCase = state.cases.find((c) => c.id === item.caseId);
      if (relatedCase) {
        const possStage = state.workflowStages.find((s) => s.id === "stage-possession") || state.workflowStages[9];
        const possOfficer = findResponsibleOfficer(state, { requiredRole: "DISTRICT_OFFICER" });
        relatedCase.currentStage = possStage.name;
        relatedCase.progress = 90;

        const possTask: Task = {
          id: `task-pos-${Date.now()}`,
          caseId: relatedCase.id,
          stageId: possStage.id,
          status: "IN_PROGRESS",
          assignedUserId: possOfficer.email,
          dueAt: new Date(Date.now() + possStage.slaDays * 86400000).toISOString(),
          remarks: `Form 3E Site Possession and Handover for ${relatedCase.caseId}.`,
        };
        state.tasks.unshift(possTask);

        addCaseActivity(
          state,
          relatedCase.id,
          user.email,
          user.role,
          user.displayName,
          "RR_COMPLETED",
          `R&R benefits delivered to all ${item.eligibleFamilies} eligible families. Handover initiated.`,
        );
      }

      audit(state, user.email, user.role, "RR_COMPLETED", "RR", item.id, {
        eligibleFamilies: item.eligibleFamilies,
      });
    }

    saveState();
    res.json({ data: item });
  },
);

// ----------------------------------------------------------------------------
// 10. Site Possession API
// ----------------------------------------------------------------------------

api.get("/possession", (_req, res) => {
  const state = loadState();
  res.json({ data: state.possession });
});

api.patch(
  "/possession/:id",
  requireRole("DISTRICT_OFFICER", "SUPER_ADMIN"),
  (req, res) => {
    const state = loadState();
    const user = (req as any).user;
    const item = state.possession.find((p) => p.id === req.params.id || p.caseId === req.params.id);

    if (!item) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Possession record not found" } });
    }

    item.status = "POSSESSION_COMPLETED";
    item.possessionDate = new Date().toISOString();
    item.officerId = user.email;
    item.remarks = req.body?.remarks || "Site possession completed under statutory Form 3E protocol.";

    const relatedCase = state.cases.find((c) => c.id === item.caseId);
    const relatedParcel = relatedCase ? state.parcels.find((p) => p.id === relatedCase.parcelId) : null;

    if (relatedParcel) {
      relatedParcel.acquisitionStatus = "POSSESSION_COMPLETED";
    }

    // Attach Statutory Form 3E Possession Certificate Document
    const docId = `doc-pos-${Date.now()}`;
    const docRecord: DocumentRecord = {
      id: docId,
      documentId: `DOC-POS-${Date.now().toString().slice(-6)}`,
      caseId: item.caseId,
      parcelId: item.parcelId,
      workflowStage: "Site Possession & Handover",
      documentType: "POSSESSION_RECORD",
      documentCategory: "STATUTORY",
      title: `Form 3E Site Possession & Handover Certificate (${item.caseReference})`,
      fileName: `possession_certificate_form_3e_${Date.now()}.pdf`,
      fileSize: "1.9 MB",
      mimeType: "application/pdf",
      storageUrl: `/documents/mock/${docId}.pdf`,
      checksum: `sha256:c7f1a${Date.now().toString(16)}`,
      version: 1,
      mandatory: true,
      approvalRequired: true,
      status: "APPROVED",
      uploadedBy: user.id,
      uploadedByName: user.displayName,
      uploadedAt: new Date().toISOString(),
      remarks: "DEMO / SYNTHETIC DOCUMENT — NOT A LEGAL GOVERNMENT NOTIFICATION",
    };
    state.documents.unshift(docRecord);

    if (relatedCase) {
      relatedCase.status = "Completed";
      relatedCase.progress = 100;
      relatedCase.currentStage = "Project Completion & Cadastral Handover";

      addCaseActivity(
        state,
        relatedCase.id,
        user.email,
        user.role,
        user.displayName,
        "POSSESSION_COMPLETED",
        `Site possession completed for ${item.parcelId}. Form 3E Certificate attached.`,
      );
    }

    audit(state, user.email, user.role, "POSSESSION_COMPLETED", "POSSESSION", item.id, {
      parcelId: item.parcelId,
    });

    saveState();
    res.json({ data: item });
  },
);

// ----------------------------------------------------------------------------
// 11. Documents & Statutory Gazette Registry
// ----------------------------------------------------------------------------

api.get("/documents", (_req, res) => {
  const state = loadState();
  res.json({ data: state.documents });
});

api.get("/documents/types", (_req, res) => {
  res.json({
    data: [
      { type: "PROJECT_APPROVAL", label: "Administrative Sanction / Project Approval" },
      { type: "PRELIMINARY_NOTIFICATION", label: "Preliminary Land Acquisition Notification" },
      { type: "GAZETTE_NOTIFICATION", label: "Statutory Gazette Notification" },
      { type: "FIELD_VERIFICATION_REPORT", label: "Field Ground Inspection & Evidence Report" },
      { type: "SURVEY_REPORT", label: "Revenue Scrutiny Note & Cadastral Report" },
      { type: "COMPENSATION_AWARD", label: "Statutory Compensation Award Declaration" },
      { type: "PAYMENT_PROOF", label: "PFMS Direct Benefit Transfer Advice" },
      { type: "RR_APPROVAL", label: "R&R Package Delivery Sanction Order" },
      { type: "POSSESSION_RECORD", label: "Form 3E Site Possession & Handover Certificate" },
      { type: "COMPLETION_CERTIFICATE", label: "Project Completion & Cadastral Handover Certificate" },
    ],
  });
});

function handleDocumentUpload(req: Request, res: Response) {
  const state = loadState();
  const user = (req as any).user;
  const input = req.body || {};

  const docId = `doc-${Date.now()}`;
  const docRecord: DocumentRecord = {
    id: docId,
    documentId: `DOC-${Date.now().toString().slice(-6)}`,
    projectId: input.projectId,
    caseId: input.caseId,
    parcelId: input.parcelId,
    workflowStage: input.stage || input.workflowStage || "General",
    documentType: input.documentType || "OTHER",
    documentCategory: "STATUTORY",
    title: input.title || "Statutory Document",
    fileName: input.fileName || `document_${Date.now()}.pdf`,
    fileSize: input.fileSize || "1.4 MB",
    mimeType: input.mimeType || "application/pdf",
    storageUrl: `/documents/mock/${docId}.pdf`,
    checksum: `sha256:e4c8b${Date.now().toString(16)}`,
    version: 1,
    mandatory: true,
    approvalRequired: true,
    status: "APPROVED",
    uploadedBy: user.id || user.email || "SYSTEM",
    uploadedByName: user.displayName || user.email || "Officer",
    uploadedAt: new Date().toISOString(),
    remarks: "DEMO / SYNTHETIC DOCUMENT — NOT A LEGAL GOVERNMENT NOTIFICATION",
  };

  state.documents.unshift(docRecord);
  audit(state, user.email, user.role, "DOCUMENT_UPLOADED", "DOCUMENT", docId, {
    title: docRecord.title,
    type: docRecord.documentType,
  });

  saveState();
  res.json({ data: docRecord });
}

api.post("/documents/upload", requireAuth, handleDocumentUpload);
api.post("/documents", requireAuth, handleDocumentUpload);

// ----------------------------------------------------------------------------
// 12. GIS GeoJSON Spatial Endpoint
// ----------------------------------------------------------------------------

api.get("/gis/projects/:id/parcels", (req, res) => {
  const state = loadState();
  const project = state.projects.find((p) => p.id === req.params.id || p.projectId === req.params.id);

  if (!project) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found" } });
  }

  const projectParcels = state.parcels.filter((p) => p.projectId === project.id);

  const featureCollection = {
    type: "FeatureCollection",
    features: projectParcels.map((p) => ({
      type: "Feature",
      id: p.id,
      geometry: {
        type: "Polygon",
        coordinates: [p.geometry.map(([lat, lng]) => [lng, lat])],
      },
      properties: {
        id: p.id,
        parcelId: p.parcelId,
        externalId: p.externalId || p.parcelId,
        surveyNumber: p.surveyNumber,
        village: p.village,
        tehsil: p.tehsil,
        district: p.district,
        totalArea: p.totalArea,
        requiredArea: p.requiredArea,
        landStatus: p.landStatus,
        acquisitionStatus: p.acquisitionStatus,
        sourceSystem: p.sourceSystem,
        ownerReference: p.ownerReference,
      },
    })),
  };

  res.json({ data: featureCollection });
});

// ----------------------------------------------------------------------------
// 13. Integration Center & BhoomiRashi Sync
// ----------------------------------------------------------------------------

api.get("/integrations", (_req, res) => {
  const state = loadState();
  const projects = state.projects || [];
  const compensation = state.compensation || [];

  res.json({
    data: [
      {
        system: "BhoomiRashi",
        label: "MOCK CONNECTED",
        description: "National Highway acquisition and statutory stages adapter.",
        status: "HEALTHY",
        lastSyncedAt: projects.find((p) => p?.sourceSystem === "BHOOMIRASHI")?.lastSyncedAt || null,
        isExternalAuthority: true,
      },
      {
        system: "PFMS",
        label: "MOCK CONNECTED",
        description: "Public Financial Management System for direct benefit transfers.",
        status: "HEALTHY",
        lastSyncedAt: compensation.find((c) => c?.status === "PAID")?.lastSyncedAt || null,
        isExternalAuthority: true,
      },
      {
        system: "State Land Records (Jamabandi)",
        label: "MOCK CONNECTED",
        description: "Haryana revenue cadastral survey and title records pool.",
        status: "HEALTHY",
        lastSyncedAt: new Date().toISOString(),
        isExternalAuthority: true,
      },
    ],
  });
});

api.get("/integrations/mappings", (_req, res) => {
  const state = loadState();
  const projects = state.projects || [];
  const parcels = state.parcels || [];

  const mappings = projects
    .filter((p) => p?.sourceType === "EXTERNAL" || p?.externalProjectId)
    .map((p) => ({
      id: `map-prj-${p.id}`,
      externalSystem: p.sourceSystem || "BHOOMIRASHI",
      externalId: p.externalProjectId || "BR-NH-2026-0042",
      localId: p.projectId,
      entityType: "PROJECT",
      syncStatus: "SYNCHRONIZED",
      lastSyncedAt: p.lastSyncedAt || new Date().toISOString(),
    }));

  for (const pr of parcels.filter((p) => p?.externalId)) {
    mappings.push({
      id: `map-pcl-${pr.id}`,
      externalSystem: pr.sourceSystem || "BHOOMIRASHI",
      externalId: pr.externalId || "",
      localId: pr.parcelId,
      entityType: "PARCEL",
      syncStatus: "SYNCHRONIZED",
      lastSyncedAt: new Date().toISOString(),
    });
  }

  res.json({ data: mappings });
});

api.post(
  "/integrations/bhoomirashi/sync",
  (req, res) => {
    const state = loadState();
    const user = getAuthUser(req);
    const actorEmail = user?.email || "national.admin@demo.nlams.gov";

    const result = syncBhoomiRashi(state, actorEmail);
    saveState();

    res.json({
      data: {
        success: true,
        project: result.project,
        projectsSynced: 1,
        parcelReferences: result.parcelsCount,
        statusUpdates: 6,
        isNew: result.isNew,
        message: "BhoomiRashi external project and cadastral parcels synchronized successfully.",
      },
    });
  },
);

api.post("/integrations/:system/sync", (req, res) => {
  const state = loadState();
  const user = getAuthUser(req);
  const sys = String(req.params.system);

  audit(state, user?.email || "SYSTEM", user?.role || "SYSTEM", "EXTERNAL_SYNC_TEST", "INTEGRATION", sys);
  saveState();

  res.json({
    data: {
      success: true,
      system: sys,
      message: `${sys} mock adapter synchronization confirmed.`,
    },
  });
});

// ----------------------------------------------------------------------------
// 14. Scoped Notifications API
// ----------------------------------------------------------------------------

api.get("/notifications", requireAuth, (req, res) => {
  const state = loadState();
  const user = (req as any).user;

  // Filter strictly by recipient ID or email (or national admin overview)
  const scoped = state.notifications.filter(
    (n) =>
      n.recipientId === user.id ||
      n.recipientId === user.email ||
      user.role === "NATIONAL_ADMIN" ||
      user.role === "SUPER_ADMIN",
  );

  res.json({ data: scoped });
});

api.patch("/notifications/:id/read", requireAuth, (req, res) => {
  const state = loadState();
  const notif = state.notifications.find((n) => n.id === req.params.id);
  if (notif) {
    notif.readAt = new Date().toISOString();
    saveState();
  }
  res.json({ data: notif });
});

api.patch("/notifications/read-all", requireAuth, (req, res) => {
  const state = loadState();
  const user = (req as any).user;
  for (const n of state.notifications) {
    if (n.recipientId === user.id || n.recipientId === user.email) {
      n.readAt = new Date().toISOString();
    }
  }
  saveState();
  res.json({ data: { success: true } });
});

// ----------------------------------------------------------------------------
// 15. Immutable Audit Logs & Reports
// ----------------------------------------------------------------------------

api.get("/audit", (_req, res) => {
  const state = loadState();
  res.json({ data: state.audit });
});

api.get("/reports/summary", (_req, res) => {
  const state = loadState();
  const summary = state.projects.map((p) => {
    const projectCases = state.cases.filter((c) => c.projectId === p.id);
    const projectParcels = state.parcels.filter((par) => par.projectId === p.id);
    const compRecords = state.compensation.filter((cr) => projectCases.some((c) => c.id === cr.caseId));

    return {
      projectId: p.projectId,
      project: p.name,
      state: p.state,
      district: p.district,
      cases: projectCases.length,
      parcels: projectParcels.length,
      progress: p.progress,
      sourceType: p.sourceType || "NATIVE",
      sourceSystem: p.sourceSystem || "NLAMS",
      compensationAssessed: compRecords.reduce((sum, item) => sum + item.assessedAmount, 0),
      compensationPaid: compRecords.reduce((sum, item) => sum + item.paidAmount, 0),
    };
  });

  res.json({ data: summary });
});
