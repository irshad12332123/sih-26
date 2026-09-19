import { Router } from "express";
import { z } from "zod";
import { requireRoles } from "../middleware/auth.js";
import { createStorage } from "../storage/index.js";
import {
  MockAcquisitionAdapter,
  MockBhoomiRashiAdapter,
  MockLandRecordsAdapter,
  MockPfmsAdapter,
} from "../integrations/interfaces.js";
import {
  addCaseActivity,
  audit,
  findResponsibleOfficer,
  loadState,
  notify,
  resetState,
  saveState,
  uid,
  type DemoRole,
  type FieldEvidence,
  type Parcel,
  type Task,
} from "../repositories/local.repository.js";

export const api = Router();
const roles = (...items: DemoRole[]) => requireRoles(...items);

const projectSchema = z.object({
  projectId: z.string().optional(),
  name: z.string().min(3),
  department: z.string().min(2),
  state: z.string().min(2),
  district: z.string().min(2),
  type: z.string().min(2),
  authority: z.string().optional(),
  tehsil: z.string().optional(),
  village: z.string().optional(),
  targetDate: z.string().optional(),
  description: z.string().optional(),
  alignment: z.array(z.array(z.number())).optional(),
  bufferMeters: z.number().optional(),
});

// Health check
api.get("/health", (_req, res) =>
  res.json({
    data: {
      service: "n-lams-api",
      status: "ok",
      demoMode: true,
      persistence: "local-json",
      timestamp: new Date().toISOString(),
    },
  }),
);

// Demo State Reset
api.post("/demo/reset", (_req, res) => {
  const fresh = resetState();
  res.json({
    data: {
      message: "N-LAMS demonstration environment reset to golden baseline.",
      projects: fresh.projects.length,
      cases: fresh.cases.length,
      parcels: fresh.parcels.length,
      tasks: fresh.tasks.length,
    },
  });
});

// Auth / Login
api.post("/auth/login", (req, res) => {
  const input = z
    .object({ email: z.string().email(), password: z.string().min(1) })
    .parse(req.body);
  const user = loadState().users.find(
    (item) => item.email === input.email && item.password === input.password,
  );
  if (!user)
    return res.status(401).json({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid demo credentials.",
      },
    });
  return res.json({
    data: {
      token: user.id,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        department: user.department,
        district: user.district,
        state: user.state,
      },
    },
  });
});

// Current User profile
api.get("/me", (req, res) => {
  const state = loadState();
  const user = state.users.find((item) => item.id === req.auth?.userId);
  res.json({
    data: user
      ? {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          department: user.department,
          district: user.district,
          state: user.state,
          village: user.village,
          officerCode: user.officerCode,
        }
      : null,
  });
});

// National Dashboard Summary
api.get("/dashboard/summary", (_req, res) => {
  const state = loadState();
  const active = state.projects.filter((p) => p.status !== "Completed").length;
  const highRisk = state.cases.filter((c) =>
    ["High", "HIGH", "Critical", "CRITICAL"].includes(c.risk),
  ).length;

  res.json({
    data: {
      totalProjects: state.projects.length,
      activeProjects: active,
      totalCases: state.cases.length,
      totalParcels: state.parcels.length,
      candidateParcels: state.parcels.length,
      acquiredParcels: state.parcels.filter((p) =>
        ["ACQUIRED", "POSSESSION_COMPLETED"].includes(p.acquisitionStatus),
      ).length,
      landRequiredHa: state.projects.reduce(
        (sum, p) => sum + (p.landRequiredHa || 248.6),
        0,
      ),
      landAcquiredHa: state.projects.reduce(
        (sum, p) => sum + (p.landAcquiredHa || 137.4),
        0,
      ),
      inProgress: state.cases.filter((c) => c.status === "In Progress" || c.status === "Under Review").length,
      completed: state.cases.filter((c) => c.status === "Completed" || c.status === "Approved").length,
      delayed: state.tasks.filter((t) => t.status === "OVERDUE").length,
      atRisk: highRisk,
      pendingApprovals: state.tasks.filter((t) => t.status === "PENDING" || t.status === "IN_PROGRESS").length,
      pendingFieldVerifications: state.tasks.filter(
        (t) =>
          state.stages.find((s) => s.id === t.stageId)?.name === "Field Verification" &&
          t.status === "IN_PROGRESS",
      ).length,
      pendingReviews: state.tasks.filter(
        (t) =>
          state.stages.find((s) => s.id === t.stageId)?.name === "Review & Approval" &&
          (t.status === "PENDING" || t.status === "IN_PROGRESS"),
      ).length,
      compensationAssessed: state.compensations.reduce(
        (sum, item) => sum + item.assessedAmount,
        0,
      ),
      compensationApproved: state.compensations.reduce(
        (sum, item) => sum + item.approvedAmount,
        0,
      ),
      compensationPaid: state.compensations.reduce(
        (sum, item) => sum + item.paidAmount,
        0,
      ),
      compensationPending: state.compensations.filter(
        (c) => c.status !== "PAID",
      ).length,
      affectedFamilies: state.rr.reduce(
        (sum, item) => sum + item.affectedFamilies,
        0,
      ),
      eligibleFamilies: state.rr.reduce(
        (sum, item) => sum + item.eligibleFamilies,
        0,
      ),
      benefitsDelivered: state.rr.reduce(
        (sum, item) => sum + item.benefitsDelivered,
        0,
      ),
      rrPending: state.rr.filter((r) => r.status !== "COMPLETED").length,
      possessionCompleted: state.possessions.filter(
        (p) => p.status === "POSSESSION_COMPLETED",
      ).length,
    },
  });
});

// Projects API
api.get("/projects", (_req, res) => {
  const state = loadState();
  res.json({
    data: state.projects.map((p) => ({
      ...p,
      cases: state.cases.filter((c) => c.projectId === p.id).length,
      parcelsCount: state.parcels.filter((pc) => pc.projectId === p.id).length,
    })),
    meta: { demo: true, persistent: true },
  });
});

api.get("/projects/:id", (req, res) => {
  const state = loadState();
  const project = state.projects.find(
    (item) => item.id === req.params.id || item.projectId === req.params.id,
  );
  return project
    ? res.json({
        data: {
          ...project,
          parcels: state.parcels.filter((p) => p.projectId === project.id),
          cases: state.cases.filter((c) => c.projectId === project.id),
        },
      })
    : res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "Project not found." } });
});

api.post(
  "/projects",
  roles("SUPER_ADMIN", "NATIONAL_ADMIN", "DEPARTMENT_ADMIN", "PROJECT_OFFICER"),
  (req, res) => {
    const input = projectSchema.parse(req.body);
    const state = loadState();
    const projectId = `prj-${Date.now()}`;
    const project = {
      id: projectId,
      projectId: input.projectId || `NLA-P-${String(state.projects.length + 42).padStart(5, "0")}`,
      name: input.name,
      department: input.department,
      authority: input.authority || `${input.district} Project Authority (DEMO)`,
      type: input.type,
      state: input.state,
      district: input.district,
      tehsil: input.tehsil || "Ambala",
      village: input.village || "Demo Village",
      status: "In Progress",
      progress: 10,
      targetDate: input.targetDate || "2027-12-31",
      description: input.description || "Infrastructure acquisition corridor.",
      alignment: (input.alignment && input.alignment.length >= 2
        ? input.alignment
        : [
            [30.362, 76.776],
            [30.380, 76.812],
            [30.395, 76.850],
            [30.407, 76.873],
          ]) as [number, number][],
      bufferMeters: input.bufferMeters || 100,
      workflowTemplateId: "HIGHWAY_DEMO_WORKFLOW",
      sourceSystem: "BhoomiRashi MOCK",
      externalProjectId: `BR-PROJ-DEMO-${String(state.projects.length + 1).padStart(3, "0")}`,
      landRequiredHa: 248.6,
      landAcquiredHa: 0,
      affectedParcelsCount: 0,
      createdAt: new Date().toISOString(),
    };

    state.projects.unshift(project);
    audit(state, req.auth!.userId, "PROJECT_CREATED", "PROJECT", project.id, {
      name: project.name,
      projectId: project.projectId,
    });
    notify(state, {
      recipientId: req.auth!.userId,
      type: "PROJECT_CREATED",
      title: "Project Registered",
      message: `${project.name} registered. Ready for alignment and candidate parcel discovery.`,
      severity: "INFO",
      projectId: project.id,
    });
    saveState(state);
    res.status(201).json({ data: project });
  },
);

// Save / Update Project Alignment
api.post(
  "/projects/:id/alignment",
  roles("SUPER_ADMIN", "NATIONAL_ADMIN", "DEPARTMENT_ADMIN", "PROJECT_OFFICER"),
  (req, res) => {
    const state = loadState();
    const project = state.projects.find(
      (p) => p.id === req.params.id || p.projectId === req.params.id,
    );
    if (!project)
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found." } });

    const input = z
      .object({
        alignment: z.array(z.array(z.number())).min(2),
        bufferMeters: z.number().optional(),
      })
      .parse(req.body);

    project.alignment = input.alignment as [number, number][];
    if (input.bufferMeters) project.bufferMeters = input.bufferMeters;

    audit(state, req.auth!.userId, "ALIGNMENT_SAVED", "PROJECT", project.id, {
      points: project.alignment.length,
      bufferMeters: project.bufferMeters || 100,
    });
    notify(state, {
      recipientId: req.auth!.userId,
      type: "ALIGNMENT_SAVED",
      title: "Alignment Corridor Saved",
      message: `Alignment corridor updated for ${project.name} (${project.bufferMeters || 100}m buffer).`,
      severity: "INFO",
      projectId: project.id,
    });
    saveState(state);
    res.json({ data: project });
  },
);

// Discover Affected Parcels Along Corridor
api.post(
  "/projects/:id/discover-parcels",
  roles("SUPER_ADMIN", "NATIONAL_ADMIN", "DEPARTMENT_ADMIN", "PROJECT_OFFICER"),
  async (req, res) => {
    const state = loadState();
    const project = state.projects.find(
      (p) => p.id === req.params.id || p.projectId === req.params.id,
    );
    if (!project)
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found." } });

    const bufferMeters = req.body.bufferMeters || project.bufferMeters || 100;
    project.bufferMeters = bufferMeters;

    // Fetch candidate parcels from mock BhoomiRashi adapter
    const adapter = new MockBhoomiRashiAdapter();
    const externalParcels = await adapter.getProjectParcels(project.externalProjectId || "BR-PROJ-DEMO-001");

    let newParcelsCount = 0;
    let existingParcelsCount = 0;
    let casesCreatedCount = 0;
    let workflowsStartedCount = 0;

    for (let i = 0; i < externalParcels.length; i++) {
      const ext = externalParcels[i];
      let parcel = state.parcels.find((p) => p.externalId === ext.externalParcelId);

      if (!parcel) {
        const parcelId = `PCL-${String(127 + state.parcels.length + 1).padStart(5, "0")}`;
        parcel = {
          id: `parcel-${Date.now()}-${i}`,
          parcelId,
          externalId: ext.externalParcelId,
          projectId: project.id,
          state: ext.state,
          district: ext.district,
          tehsil: ext.tehsil,
          village: ext.village,
          surveyNumber: ext.surveyNumber,
          ownerReference: ext.ownerReference,
          totalArea: ext.totalAreaHa,
          requiredArea: ext.requiredAreaHa,
          geometry: ext.coordinates,
          sourceSystem: "BhoomiRashi MOCK / State Land Records",
          sourceReference: ext.externalParcelId,
          acquisitionStatus: i === 0 ? "FIELD_VERIFICATION_PENDING" : "3A_NOTIFIED",
          discoveryMethod: `ALIGNMENT_CORRIDOR_${bufferMeters}M`,
          discoveredAt: new Date().toISOString(),
        };
        state.parcels.push(parcel);
        newParcelsCount++;
      } else {
        existingParcelsCount++;
      }

      // Check or create acquisition case
      let acCase = state.cases.find((c) => c.parcelId === parcel!.id);
      if (!acCase) {
        const caseSeq = state.cases.length + 1;
        const caseId = caseSeq === 1 ? "NLA-C-00231" : `NLA-C-${String(230 + caseSeq).padStart(5, "0")}`;
        const responsibleOfficer = findResponsibleOfficer(state, {
          requiredRole: "FIELD_OFFICER",
          projectId: project.id,
          stateName: parcel.state,
          districtName: parcel.district,
          villageName: parcel.village,
        });

        acCase = {
          id: `case-${Date.now()}-${i}`,
          caseId,
          projectId: project.id,
          parcelId: parcel.id,
          status: "Under Review",
          risk: i === 3 ? "High" : "Low",
          priority: "MEDIUM",
          currentStage: "Field Verification",
          progress: 30,
          assignedOfficerId: responsibleOfficer.id,
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
          externalRefs: [
            { system: "BhoomiRashi MOCK", id: `BR-CASE-DEMO-${String(caseSeq).padStart(3, "0")}` },
            { system: "State Land Records", id: parcel.sourceReference },
          ],
          acquisitionPurpose: `${project.name} acquisition corridor`,
          createdAt: new Date().toISOString(),
        };
        state.cases.push(acCase);
        parcel.caseId = acCase.id;
        casesCreatedCount++;

        // Start workflow task for Field Verification
        const verifStage = state.stages.find((s) => s.name === "Field Verification") || state.stages[2];
        const task: Task = {
          id: `task-${Date.now()}-${i}`,
          caseId: acCase.id,
          stageId: verifStage.id,
          status: "IN_PROGRESS",
          assignedUserId: responsibleOfficer.id,
          dueAt: new Date(Date.now() + verifStage.slaDays * 86400000).toISOString(),
          remarks: `Verify boundary and physical features along ${bufferMeters}m corridor for ${parcel.surveyNumber}.`,
        };
        state.tasks.push(task);
        workflowsStartedCount++;

        // Add timeline activity
        addCaseActivity(
          state,
          acCase.id,
          req.auth!.userId,
          "PARCEL_DISCOVERED",
          `Candidate parcel ${parcel.parcelId} discovered along ${bufferMeters}m corridor.`,
          { bufferMeters, surveyNumber: parcel.surveyNumber },
        );

        // Compensation record
        if (!state.compensations.some((comp) => comp.caseId === acCase!.id)) {
          state.compensations.push({
            id: `comp-${Date.now()}-${i}`,
            caseId: acCase.id,
            caseReference: acCase.caseId,
            parcelId: parcel.parcelId,
            village: parcel.village,
            assessedAmount: 1000000 + i * 125000,
            approvedAmount: 0,
            paidAmount: 0,
            status: "ASSESSED",
            sourceSystem: "PFMS (DEMO)",
            lastSyncedAt: new Date().toISOString(),
          });
        }

        // R&R record
        if (!state.rr.some((r) => r.caseId === acCase!.id)) {
          state.rr.push({
            id: `rr-${Date.now()}-${i}`,
            caseId: acCase.id,
            caseReference: acCase.caseId,
            parcelId: parcel.parcelId,
            village: parcel.village,
            affectedFamilies: 5 + i,
            displacedFamilies: i % 2,
            eligibleFamilies: 4 + i,
            benefitsDelivered: 0,
            status: "IDENTIFIED",
            sourceSystem: "N-LAMS DEMO R&R",
          });
        }

        // Possession record
        if (!state.possessions.some((pos) => pos.caseId === acCase!.id)) {
          state.possessions.push({
            id: `pos-${Date.now()}-${i}`,
            caseId: acCase.id,
            caseReference: acCase.caseId,
            parcelId: parcel.parcelId,
            village: parcel.village,
            status: "NOT_READY",
          });
        }
      }
    }

    project.affectedParcelsCount = state.parcels.filter((p) => p.projectId === project.id).length;

    audit(state, req.auth!.userId, "PARCEL_DISCOVERY", "PROJECT", project.id, {
      bufferMeters,
      candidateParcels: externalParcels.length,
      newParcelsCount,
      casesCreatedCount,
    });

    notify(state, {
      recipientId: req.auth!.userId,
      type: "PARCEL_DISCOVERED",
      title: "Candidate Parcels Identified",
      message: `${externalParcels.length} candidate parcels identified from alignment corridor (${bufferMeters}m buffer). Workflows initiated.`,
      severity: "INFO",
      projectId: project.id,
    });

    saveState(state);

    res.json({
      data: {
        candidateParcels: externalParcels.length,
        newParcelsImported: newParcelsCount,
        existingParcels: existingParcelsCount,
        casesCreated: casesCreatedCount,
        workflowsStarted: workflowsStartedCount,
        parcels: state.parcels.filter((p) => p.projectId === project.id),
      },
    });
  },
);

// Cases API
api.get("/cases", (_req, res) => {
  const state = loadState();
  res.json({
    data: state.cases.map((c) => {
      const parcel = state.parcels.find((p) => p.id === c.parcelId);
      const project = state.projects.find((p) => p.id === c.projectId);
      const officer = state.users.find((u) => u.id === c.assignedOfficerId);
      return {
        ...c,
        projectName: project?.name || "",
        parcelId: parcel?.parcelId || parcel?.externalId || "",
        externalParcelId: parcel?.externalId || "",
        surveyNumber: parcel?.surveyNumber || "",
        village: parcel?.village || "",
        state: parcel?.state || project?.state || "Haryana",
        district: parcel?.district || project?.district || "Ambala",
        stage: c.currentStage,
        officer: officer?.displayName || "Assigned by jurisdiction",
      };
    }),
    meta: { total: state.cases.length, persistent: true },
  });
});

api.get("/cases/:id", (req, res) => {
  const state = loadState();
  const item = state.cases.find(
    (c) => c.id === req.params.id || c.caseId === req.params.id,
  );
  if (!item)
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Case not found." } });

  const parcel = state.parcels.find((p) => p.id === item.parcelId);
  const project = state.projects.find((p) => p.id === item.projectId);
  const tasks = state.tasks
    .filter((t) => t.caseId === item.id)
    .map((t) => ({
      ...t,
      stage: state.stages.find((s) => s.id === t.stageId),
      assignedUser: state.users.find((u) => u.id === t.assignedUserId),
    }));
  const activity = state.caseActivity.filter((a) => a.caseId === item.id);
  const compensation = state.compensations.find((c) => c.caseId === item.id);
  const possession = state.possessions.find((p) => p.caseId === item.id);
  const rr = state.rr.find((r) => r.caseId === item.id);
  const assignedOfficer = state.users.find((u) => u.id === item.assignedOfficerId);

  res.json({
    data: {
      ...item,
      project,
      parcel,
      tasks,
      activity,
      compensation,
      possession,
      rr,
      assignedOfficer: assignedOfficer
        ? {
            id: assignedOfficer.id,
            displayName: assignedOfficer.displayName,
            role: assignedOfficer.role,
            officerCode: assignedOfficer.officerCode,
          }
        : null,
    },
  });
});

api.get("/cases/:id/timeline", (req, res) => {
  const state = loadState();
  const item = state.cases.find(
    (c) => c.id === req.params.id || c.caseId === req.params.id,
  );
  if (!item)
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Case not found." } });

  const activities = state.caseActivity.filter((a) => a.caseId === item.id);
  res.json({ data: activities });
});

// Role-Specific Task Queues (e.g. Field Officer, Reviewer)
api.get("/tasks/my", (req, res) => {
  const state = loadState();
  const userId = req.auth?.userId;
  const userRole = req.auth?.roles?.[0];

  let filtered = state.tasks;

  if (userRole === "FIELD_OFFICER") {
    filtered = state.tasks.filter((t) => {
      const stage = state.stages.find((s) => s.id === t.stageId);
      return (
        t.assignedUserId === userId ||
        stage?.responsibleRole === "FIELD_OFFICER"
      );
    });
  } else if (userRole === "REVIEWER") {
    filtered = state.tasks.filter((t) => {
      const stage = state.stages.find((s) => s.id === t.stageId);
      return (
        t.assignedUserId === userId ||
        stage?.responsibleRole === "REVIEWER"
      );
    });
  } else if (userRole === "DISTRICT_OFFICER") {
    filtered = state.tasks.filter((t) => {
      const stage = state.stages.find((s) => s.id === t.stageId);
      return (
        t.assignedUserId === userId ||
        stage?.responsibleRole === "DISTRICT_OFFICER"
      );
    });
  } else if (userRole === "PROJECT_OFFICER") {
    filtered = state.tasks.filter((t) => {
      const stage = state.stages.find((s) => s.id === t.stageId);
      return (
        t.assignedUserId === userId ||
        stage?.responsibleRole === "PROJECT_OFFICER"
      );
    });
  }

  const enriched = filtered.map((task) => {
    const c = state.cases.find((cs) => cs.id === task.caseId);
    const parcel = c ? state.parcels.find((p) => p.id === c.parcelId) : null;
    const project = c ? state.projects.find((p) => p.id === c.projectId) : null;
    const stage = state.stages.find((s) => s.id === task.stageId);
    return {
      ...task,
      stage,
      case: c,
      parcel,
      project,
    };
  });

  res.json({ data: enriched });
});

// Field Verification Submission (Hero Golden Path Step!)
api.post(
  "/tasks/:id/field-verification",
  roles("SUPER_ADMIN", "NATIONAL_ADMIN", "FIELD_OFFICER", "PROJECT_OFFICER"),
  (req, res) => {
    const state = loadState();
    const task = state.tasks.find((t) => t.id === req.params.id);
    if (!task)
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Task not found." } });

    // Authorization check: task must be assigned or caller is supervisor
    const isOwner = task.assignedUserId === req.auth?.userId;
    const isSupervisor = req.auth?.roles.some((r) =>
      ["SUPER_ADMIN", "NATIONAL_ADMIN", "PROJECT_OFFICER", "FIELD_OFFICER"].includes(r),
    );
    if (!isOwner && !isSupervisor) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "You are not authorized to submit verification for this task." },
      });
    }

    const input = z
      .object({
        physicallyIdentified: z.boolean(),
        boundaryVerified: z.boolean(),
        landUseVerified: z.boolean(),
        structureAffected: z.boolean(),
        encroachmentObserved: z.boolean(),
        remarks: z.string().min(3),
        latitude: z.number(),
        longitude: z.number(),
        isDemoGps: z.boolean().default(true),
        photoUrls: z.array(z.string()).default([]),
      })
      .parse(req.body);

    const acCase = state.cases.find((c) => c.id === task.caseId)!;
    const parcel = state.parcels.find((p) => p.id === acCase.parcelId)!;

    const evidence: FieldEvidence = {
      id: `ev-${Date.now()}`,
      projectId: acCase.projectId,
      parcelId: parcel.id,
      caseId: acCase.id,
      taskId: task.id,
      uploadedBy: req.auth!.userId,
      uploadedByName: state.users.find((u) => u.id === req.auth?.userId)?.displayName || "Field Officer",
      uploadedAt: new Date().toISOString(),
      evidenceType: "Geo-tagged Site Photographs & Boundary Inspection",
      latitude: input.latitude,
      longitude: input.longitude,
      isDemoGps: input.isDemoGps,
      captureTimestamp: new Date().toISOString(),
      remarks: input.remarks,
      checklist: {
        physicallyIdentified: input.physicallyIdentified,
        boundaryVerified: input.boundaryVerified,
        landUseVerified: input.landUseVerified,
        structureAffected: input.structureAffected,
        encroachmentObserved: input.encroachmentObserved,
      },
      photoUrls: input.photoUrls.length > 0 ? input.photoUrls : ["/assets/demo-field-inspection.jpg"],
      status: "PENDING_REVIEW",
    };

    // Mark current field task as COMPLETED
    task.status = "COMPLETED";
    task.remarks = input.remarks;
    task.completedAt = new Date().toISOString();
    task.evidence = evidence;

    // Advance Case & Parcel status
    parcel.acquisitionStatus = "FIELD_VERIFICATION_SUBMITTED";
    acCase.currentStage = "Review & Approval";
    acCase.status = "Under Review";
    acCase.progress = 45;

    // Find Reviewer
    const reviewer = findResponsibleOfficer(state, {
      requiredRole: "REVIEWER",
      projectId: acCase.projectId,
      districtName: parcel.district,
    });

    // Create next task: Review & Approval
    const reviewStage = state.stages.find((s) => s.name === "Review & Approval") || state.stages[3];
    const reviewTask: Task = {
      id: `task-rev-${Date.now()}`,
      caseId: acCase.id,
      stageId: reviewStage.id,
      status: "IN_PROGRESS",
      assignedUserId: reviewer.id,
      dueAt: new Date(Date.now() + reviewStage.slaDays * 86400000).toISOString(),
      remarks: `Review field verification evidence submitted by ${evidence.uploadedByName} for parcel ${parcel.surveyNumber}.`,
      evidence,
    };
    state.tasks.push(reviewTask);
    acCase.assignedOfficerId = reviewer.id;

    // Case Activity Timeline
    addCaseActivity(
      state,
      acCase.id,
      req.auth!.userId,
      "FIELD_VERIFICATION_SUBMITTED",
      `Field verification and geo-tagged photographic evidence submitted for ${parcel.parcelId}.`,
      {
        coordinates: `${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)}`,
        isDemoGps: input.isDemoGps,
        boundaryVerified: input.boundaryVerified,
        evidenceId: evidence.id,
      },
    );

    // Notifications & Audits
    notify(state, {
      recipientId: reviewer.id,
      type: "FIELD_VERIFICATION_SUBMITTED",
      title: "Field Verification Pending Review",
      message: `Inspection evidence submitted for parcel ${parcel.parcelId} (${parcel.village}). Please review and approve.`,
      severity: "HIGH",
      caseId: acCase.id,
      taskId: reviewTask.id,
      projectId: acCase.projectId,
    });

    audit(state, req.auth!.userId, "FIELD_VERIFICATION_SUBMITTED", "CASE", acCase.id, {
      parcelId: parcel.parcelId,
      surveyNumber: parcel.surveyNumber,
      isDemoGps: input.isDemoGps,
    });

    saveState(state);

    res.json({
      data: {
        task,
        reviewTask,
        evidence,
        case: acCase,
      },
    });
  },
);

// Reviewer Approval Action (Hero Golden Path Step!)
api.post(
  "/tasks/:id/approve",
  roles("SUPER_ADMIN", "NATIONAL_ADMIN", "DEPARTMENT_ADMIN", "REVIEWER", "DISTRICT_OFFICER"),
  (req, res) => {
    const state = loadState();
    const task = state.tasks.find((t) => t.id === req.params.id);
    if (!task)
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Task not found." } });

    const currentStage = state.stages.find((s) => s.id === task.stageId)!;
    const acCase = state.cases.find((c) => c.id === task.caseId)!;
    const parcel = state.parcels.find((p) => p.id === acCase.parcelId)!;

    task.status = "COMPLETED";
    task.completedAt = new Date().toISOString();
    task.remarks = req.body.remarks || "Field verification inspection approved by competent reviewer.";
    if (task.evidence) task.evidence.status = "APPROVED";

    // Next stage: 3G Compensation Determination
    const compStage = state.stages.find((s) => s.sequence === 6) || state.stages[5];
    const compOfficer = findResponsibleOfficer(state, {
      requiredRole: compStage.responsibleRole,
      projectId: acCase.projectId,
      districtName: parcel.district,
    });

    acCase.currentStage = compStage.name;
    acCase.status = "In Progress";
    acCase.progress = 60;
    acCase.assignedOfficerId = compOfficer.id;
    parcel.acquisitionStatus = "REVIEWER_APPROVED";

    const nextTask: Task = {
      id: `task-comp-${Date.now()}`,
      caseId: acCase.id,
      stageId: compStage.id,
      status: "IN_PROGRESS",
      assignedUserId: compOfficer.id,
      dueAt: new Date(Date.now() + compStage.slaDays * 86400000).toISOString(),
      remarks: "Compute compensation assessment award under Section 3G.",
    };
    state.tasks.push(nextTask);

    addCaseActivity(
      state,
      acCase.id,
      req.auth!.userId,
      "TASK_APPROVED",
      `Field verification approved by ${req.auth?.userId}. Advanced to ${compStage.name}.`,
      { stage: currentStage.name, nextStage: compStage.name },
    );

    notify(state, {
      recipientId: compOfficer.id,
      type: "TASK_ASSIGNED",
      title: "Compensation Award Task Assigned",
      message: `${acCase.caseId} (${parcel.parcelId}) approved. Please determine Section 3G compensation award.`,
      severity: "HIGH",
      caseId: acCase.id,
      taskId: nextTask.id,
      projectId: acCase.projectId,
    });

    audit(state, req.auth!.userId, "TASK_APPROVED", "TASK", task.id, {
      caseId: acCase.caseId,
      parcelId: parcel.parcelId,
    });

    saveState(state);

    res.json({
      data: {
        task,
        nextTask,
        case: acCase,
      },
    });
  },
);

// Reviewer Reject
api.post(
  "/tasks/:id/reject",
  roles("SUPER_ADMIN", "NATIONAL_ADMIN", "DEPARTMENT_ADMIN", "REVIEWER", "DISTRICT_OFFICER"),
  (req, res) => {
    const state = loadState();
    const task = state.tasks.find((t) => t.id === req.params.id);
    if (!task)
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Task not found." } });

    const reason = req.body.reason || req.body.remarks || "Rejected during review.";
    task.status = "REJECTED";
    task.remarks = reason;
    if (task.evidence) task.evidence.status = "REJECTED";

    const acCase = state.cases.find((c) => c.id === task.caseId)!;
    acCase.status = "On Hold";

    addCaseActivity(
      state,
      acCase.id,
      req.auth!.userId,
      "TASK_REJECTED",
      `Review rejected: ${reason}`,
      { reason },
    );

    audit(state, req.auth!.userId, "TASK_REJECTED", "TASK", task.id, { reason });
    saveState(state);

    res.json({ data: task });
  },
);

// Reviewer Request Correction
api.post(
  "/tasks/:id/correction",
  roles("SUPER_ADMIN", "NATIONAL_ADMIN", "DEPARTMENT_ADMIN", "REVIEWER", "DISTRICT_OFFICER"),
  (req, res) => {
    const state = loadState();
    const task = state.tasks.find((t) => t.id === req.params.id);
    if (!task)
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Task not found." } });

    const reason = req.body.reason || req.body.remarks || "Please re-verify parcel boundaries and attach clearer site photo.";
    task.status = "CORRECTION_REQUESTED";
    task.remarks = reason;
    if (task.evidence) task.evidence.status = "CORRECTION_REQUESTED";

    const acCase = state.cases.find((c) => c.id === task.caseId)!;
    const parcel = state.parcels.find((p) => p.id === acCase.parcelId)!;

    // Return to Field Officer
    const fieldOfficer = findResponsibleOfficer(state, {
      requiredRole: "FIELD_OFFICER",
      projectId: acCase.projectId,
      districtName: parcel.district,
    });

    const corrTask: Task = {
      id: `task-corr-${Date.now()}`,
      caseId: acCase.id,
      stageId: state.stages.find((s) => s.name === "Field Verification")?.id || state.stages[2].id,
      status: "IN_PROGRESS",
      assignedUserId: fieldOfficer.id,
      dueAt: new Date(Date.now() + 3 * 86400000).toISOString(),
      remarks: `Correction requested: ${reason}`,
    };
    state.tasks.push(corrTask);
    acCase.assignedOfficerId = fieldOfficer.id;
    acCase.currentStage = "Field Verification";

    addCaseActivity(
      state,
      acCase.id,
      req.auth!.userId,
      "CORRECTION_REQUESTED",
      `Correction requested by Reviewer: ${reason}`,
      { reason },
    );

    notify(state, {
      recipientId: fieldOfficer.id,
      type: "CORRECTION_REQUESTED",
      title: "Field Verification Correction Requested",
      message: `Reviewer requested correction for ${parcel.parcelId}: ${reason}`,
      severity: "HIGH",
      caseId: acCase.id,
      taskId: corrTask.id,
      projectId: acCase.projectId,
    });

    audit(state, req.auth!.userId, "CORRECTION_REQUESTED", "TASK", task.id, { reason });
    saveState(state);

    res.json({ data: task, correctionTask: corrTask });
  },
);

// Generic Task Complete (with ownership security check)
api.post(
  "/tasks/:id/complete",
  roles(
    "SUPER_ADMIN",
    "NATIONAL_ADMIN",
    "DEPARTMENT_ADMIN",
    "PROJECT_OFFICER",
    "DISTRICT_OFFICER",
    "FIELD_OFFICER",
    "REVIEWER",
  ),
  (req, res) => {
    const state = loadState();
    const task = state.tasks.find((t) => t.id === req.params.id);
    if (!task)
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Task not found." } });

    const isOwner = task.assignedUserId === req.auth?.userId;
    const isSupervisor = req.auth?.roles.some((r) =>
      ["SUPER_ADMIN", "NATIONAL_ADMIN", "DEPARTMENT_ADMIN", "PROJECT_OFFICER", "DISTRICT_OFFICER"].includes(r),
    );
    if (!isOwner && !isSupervisor) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "You are not authorized to complete this task." },
      });
    }

    const item = state.cases.find((c) => c.id === task.caseId)!;
    const current = state.stages.find((s) => s.id === task.stageId)!;
    task.status = "COMPLETED";
    task.remarks = req.body.remarks || "Task completed.";
    task.completedAt = new Date().toISOString();

    const next = state.stages.find(
      (s) => s.templateId === current.templateId && s.sequence === current.sequence + 1,
    );

    if (next) {
      const nextOfficer = findResponsibleOfficer(state, {
        requiredRole: next.responsibleRole,
        projectId: item.projectId,
      });

      const nextTask: Task = {
        id: `task-${Date.now()}`,
        caseId: item.id,
        stageId: next.id,
        status: "IN_PROGRESS",
        assignedUserId: nextOfficer.id,
        dueAt: new Date(Date.now() + next.slaDays * 86400000).toISOString(),
        remarks: `Manage ${next.name} stage.`,
      };
      state.tasks.push(nextTask);
      item.currentStage = next.name;
      item.assignedOfficerId = nextOfficer.id;
      item.progress = Math.round(((next.sequence - 1) / state.stages.length) * 100);

      addCaseActivity(
        state,
        item.id,
        req.auth!.userId,
        "STAGE_COMPLETED",
        `${current.name} completed. Advanced to ${next.name}.`,
        { completedStage: current.name, nextStage: next.name },
      );

      notify(state, {
        recipientId: nextOfficer.id,
        type: "TASK_ASSIGNED",
        title: "Workflow Task Assigned",
        message: `${item.caseId} advanced to ${next.name}.`,
        severity: "INFO",
        caseId: item.id,
        taskId: nextTask.id,
        projectId: item.projectId,
      });
    } else {
      item.status = "Completed";
      item.progress = 100;
      addCaseActivity(
        state,
        item.id,
        req.auth!.userId,
        "WORKFLOW_COMPLETED",
        "All acquisition stages completed successfully.",
      );
    }

    audit(state, req.auth!.userId, "TASK_COMPLETED", "TASK", task.id, {
      legalSection: current.legalSection,
    });
    saveState(state);
    res.json({ data: task, nextStage: next?.name });
  },
);

// Compensation Management & Approval
api.get("/compensation", (_req, res) => {
  const state = loadState();
  res.json({ data: state.compensations });
});

api.patch(
  "/compensation/:id",
  roles("SUPER_ADMIN", "NATIONAL_ADMIN", "DEPARTMENT_ADMIN", "PROJECT_OFFICER", "DISTRICT_OFFICER"),
  (req, res) => {
    const state = loadState();
    const item = state.compensations.find((c) => c.id === req.params.id);
    if (!item)
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Compensation record not found." } });

    const input = z
      .object({
        assessedAmount: z.number().optional(),
        approvedAmount: z.number().optional(),
        paidAmount: z.number().optional(),
        status: z.enum(["ASSESSED", "UNDER_REVIEW", "APPROVED", "PAYMENT_PENDING", "PAID", "RECONCILIATION_REQUIRED"]).optional(),
        paymentReference: z.string().optional(),
      })
      .parse(req.body);

    Object.assign(item, input);

    const acCase = state.cases.find((c) => c.id === item.caseId);
    if (acCase && input.status === "APPROVED") {
      acCase.status = "Approved";
      acCase.progress = Math.max(acCase.progress, 70);
      addCaseActivity(
        state,
        acCase.id,
        req.auth!.userId,
        "COMPENSATION_UPDATED",
        `Section 3G compensation award of ₹${(item.approvedAmount || item.assessedAmount).toLocaleString("en-IN")} approved.`,
        { approvedAmount: item.approvedAmount || item.assessedAmount },
      );
    }

    audit(state, req.auth!.userId, "COMPENSATION_UPDATED", "COMPENSATION", item.id, input);
    notify(state, {
      type: "COMPENSATION_UPDATED",
      title: "Compensation Award Updated",
      message: `${item.caseReference} compensation updated to ${item.status}.`,
      severity: "INFO",
      caseId: item.caseId,
    });

    saveState(state);
    res.json({ data: item });
  },
);

// PFMS Mock Synchronization
api.post(
  "/compensation/:id/sync",
  roles("SUPER_ADMIN", "NATIONAL_ADMIN", "DEPARTMENT_ADMIN", "PROJECT_OFFICER", "DISTRICT_OFFICER"),
  async (req, res) => {
    const state = loadState();
    const item = state.compensations.find((c) => c.id === req.params.id);
    if (!item)
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Compensation record not found." } });

    const pfmsAdapter = new MockPfmsAdapter();
    const result = await pfmsAdapter.getPaymentStatus(item.caseId);

    item.paidAmount = item.approvedAmount > 0 ? item.approvedAmount : result.paidAmount;
    item.paymentReference = result.reference;
    item.status = result.status === "PAID" ? "PAID" : "RECONCILIATION_REQUIRED";
    item.externalReference = result.reference;
    item.paymentDate = new Date().toISOString();
    item.lastSyncedAt = new Date().toISOString();

    const acCase = state.cases.find((c) => c.id === item.caseId);
    if (acCase) {
      acCase.status = "Payment Completed";
      acCase.progress = Math.max(acCase.progress, 85);
      addCaseActivity(
        state,
        acCase.id,
        req.auth!.userId,
        "PAYMENT_SYNCED",
        `Direct benefit transfer payment synchronized via PFMS DEMO (${result.reference}).`,
        { status: result.status, paidAmount: item.paidAmount, reference: result.reference },
      );
    }

    audit(state, req.auth!.userId, "PAYMENT_SYNCED", "COMPENSATION", item.id, {
      sourceSystem: "PFMS (DEMO)",
      reference: result.reference,
      status: result.status,
    });

    notify(state, {
      type: "PAYMENT_SYNCED",
      title: "PFMS Payment Confirmed",
      message: `PFMS DEMO confirmed payment of ₹${item.paidAmount.toLocaleString("en-IN")} for ${item.caseReference} (${result.reference}).`,
      severity: "HIGH",
      caseId: item.caseId,
    });

    saveState(state);
    res.json({ data: item });
  },
);

// R&R API
api.get("/rr", (_req, res) => res.json({ data: loadState().rr }));

api.patch(
  "/rr/:id",
  roles("SUPER_ADMIN", "NATIONAL_ADMIN", "DEPARTMENT_ADMIN", "DISTRICT_OFFICER", "FIELD_OFFICER"),
  (req, res) => {
    const state = loadState();
    const item = state.rr.find((r) => r.id === req.params.id);
    if (!item)
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "R&R record not found." } });

    const input = z
      .object({
        benefitsDelivered: z.number().optional(),
        status: z.enum(["IDENTIFIED", "ELIGIBILITY_ASSESSED", "BENEFITS_PENDING", "PARTIALLY_DELIVERED", "COMPLETED"]).optional(),
      })
      .parse(req.body);

    Object.assign(item, input);

    const acCase = state.cases.find((c) => c.id === item.caseId);
    if (acCase && input.status === "COMPLETED") {
      addCaseActivity(
        state,
        acCase.id,
        req.auth!.userId,
        "RR_UPDATED",
        `Rehabilitation & Resettlement completed for ${item.eligibleFamilies} eligible families.`,
        { benefitsDelivered: item.benefitsDelivered },
      );
    }

    audit(state, req.auth!.userId, "R_AND_R_UPDATED", "RR", item.id, input);
    notify(state, {
      type: "RR_UPDATED",
      title: "R&R Status Updated",
      message: `${item.caseReference} R&R updated: ${item.status} (${item.benefitsDelivered}/${item.eligibleFamilies} delivered).`,
      severity: "INFO",
      caseId: item.caseId,
    });

    saveState(state);
    res.json({ data: item });
  },
);

// Possession API
api.get("/possession", (_req, res) => res.json({ data: loadState().possessions }));

api.patch(
  "/possession/:id",
  roles("SUPER_ADMIN", "NATIONAL_ADMIN", "DISTRICT_OFFICER", "FIELD_OFFICER"),
  (req, res) => {
    const state = loadState();
    const item = state.possessions.find((p) => p.id === req.params.id);
    if (!item)
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Possession record not found." } });

    const input = z
      .object({
        status: z.enum(["NOT_READY", "READY", "POSSESSION_PENDING", "POSSESSION_COMPLETED"]),
        remarks: z.string().optional(),
      })
      .parse(req.body);

    Object.assign(item, input, {
      officerId: req.auth!.userId,
      possessionDate: input.status === "POSSESSION_COMPLETED" ? new Date().toISOString() : item.possessionDate,
    });

    const acCase = state.cases.find((c) => c.id === item.caseId);
    if (acCase && input.status === "POSSESSION_COMPLETED") {
      acCase.status = "Possession Completed";
      const parcel = state.parcels.find((p) => p.id === acCase.parcelId);
      if (parcel) parcel.acquisitionStatus = "POSSESSION_COMPLETED";

      addCaseActivity(
        state,
        acCase.id,
        req.auth!.userId,
        "POSSESSION_UPDATED",
        "Physical site possession successfully acquired and transferred to executing agency.",
        { status: input.status },
      );
    }

    audit(state, req.auth!.userId, "POSSESSION_UPDATED", "POSSESSION", item.id, input);
    notify(state, {
      type: "POSSESSION_UPDATED",
      title: "Possession Status Updated",
      message: `${item.caseReference} possession marked ${item.status}.`,
      severity: "INFO",
      caseId: item.caseId,
    });

    saveState(state);
    res.json({ data: item });
  },
);

// GIS GeoJSON
api.get("/gis/projects/:id/parcels", (req, res) => {
  const state = loadState();
  const project = state.projects.find((p) => p.id === req.params.id || p.projectId === req.params.id);
  const parcels = state.parcels.filter((p) => p.projectId === req.params.id || (project && p.projectId === project.id));

  res.json({
    data: {
      type: "FeatureCollection",
      features: parcels.map((p) => ({
        type: "Feature",
        id: p.id,
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              ...p.geometry.map(([lat, lng]) => [lng, lat]),
              [p.geometry[0][1], p.geometry[0][0]],
            ],
          ],
        },
        properties: {
          ...p,
          demo: true,
          label: "Candidate Affected Parcel (Synthetic GIS Corridor)",
        },
      })),
    },
  });
});

// BhoomiRashi Integration Hero Sync
api.post(
  "/integrations/bhoomirashi/sync",
  roles("SUPER_ADMIN", "NATIONAL_ADMIN", "DEPARTMENT_ADMIN"),
  async (req, res) => {
    const state = loadState();
    const adapter = new MockBhoomiRashiAdapter();
    const result = await adapter.syncProjects();

    const log = {
      id: uid(),
      system: "bhoomirashi",
      status: "MOCK CONNECTED",
      records: result.projectsSynced,
      message: `Synchronized ${result.projectsSynced} national highway projects and ${result.parcelReferences} parcel references.`,
      syncedAt: new Date().toISOString(),
    };
    state.syncLogs.unshift(log);

    audit(state, req.auth!.userId, "PROJECT_SYNCED", "INTEGRATION", undefined, {
      system: "BhoomiRashi",
      projectsCount: result.projectsSynced,
      parcelCount: result.parcelReferences,
    });

    notify(state, {
      type: "PROJECT_SYNCED",
      title: "BhoomiRashi Projects Synchronized",
      message: `Synchronized ${result.projectsSynced} national projects and ${result.parcelReferences} parcel records from BhoomiRashi MOCK.`,
      severity: "INFO",
    });

    saveState(state);
    res.json({ data: { ...result, log } });
  },
);

api.get("/integrations/bhoomirashi/projects", async (_req, res) => {
  const adapter = new MockBhoomiRashiAdapter();
  const result = await adapter.syncProjects();
  res.json({ data: result.projects });
});

api.get("/integrations/mappings", (_req, res) => {
  const state = loadState();
  res.json({ data: state.externalMappings });
});

api.get("/integrations", (_req, res) => {
  const state = loadState();
  res.json({
    data: [
      {
        system: "BhoomiRashi",
        adapter: "MockBhoomiRashiAdapter",
        status: "MOCK CONNECTED",
        lastSyncedAt: state.syncLogs.find((s) => s.system === "bhoomirashi")?.syncedAt || new Date().toISOString(),
        records: 42,
        label: "DEMO / MOCK ADAPTER",
        description: "National Highway land acquisition portal adapter",
      },
      {
        system: "PFMS",
        adapter: "MockPfmsAdapter",
        status: "MOCK CONNECTED",
        lastSyncedAt: state.syncLogs.find((s) => s.system === "pfms")?.syncedAt || new Date().toISOString(),
        records: state.compensations.length,
        label: "DEMO / MOCK ADAPTER",
        description: "Public Financial Management System direct benefit transfer adapter",
      },
      {
        system: "State Land Records",
        adapter: "MockLandRecordsAdapter",
        status: "MOCK CONNECTED",
        lastSyncedAt: state.syncLogs.find((s) => s.system === "land-records")?.syncedAt || new Date().toISOString(),
        records: state.parcels.length,
        label: "DEMO / MOCK ADAPTER",
        description: "State cadastral revenue survey records adapter (Haryana)",
      },
    ],
  });
});

// Notifications API
api.get("/notifications", (req, res) => {
  const state = loadState();
  const userId = req.auth?.userId;
  res.json({
    data: state.notifications.filter(
      (n) => !n.recipientId || n.recipientId === userId,
    ),
  });
});

api.patch("/notifications/:id/read", (req, res) => {
  const state = loadState();
  const item = state.notifications.find((n) => n.id === req.params.id);
  if (!item)
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Notification not found." } });
  item.readAt = new Date().toISOString();
  saveState(state);
  res.json({ data: item });
});

api.patch("/notifications/read-all", (req, res) => {
  const state = loadState();
  const userId = req.auth?.userId;
  state.notifications
    .filter((n) => !n.recipientId || n.recipientId === userId)
    .forEach((n) => {
      n.readAt = new Date().toISOString();
    });
  saveState(state);
  res.json({ data: { count: state.notifications.length } });
});

// Audit API
api.get(
  "/audit",
  roles("SUPER_ADMIN", "NATIONAL_ADMIN", "DEPARTMENT_ADMIN", "REVIEWER", "PROJECT_OFFICER", "DISTRICT_OFFICER"),
  (_req, res) => res.json({ data: loadState().audits }),
);

// Reports Summary
api.get("/reports/summary", (_req, res) => {
  const state = loadState();
  res.json({
    data: state.projects.map((p) => {
      const pCases = state.cases.filter((c) => c.projectId === p.id);
      const pComp = state.compensations.filter((c) =>
        pCases.some((cs) => cs.id === c.caseId),
      );
      const pRR = state.rr.filter((r) =>
        pCases.some((cs) => cs.id === r.caseId),
      );
      return {
        project: p.name,
        projectId: p.projectId,
        state: p.state,
        district: p.district,
        cases: pCases.length,
        parcels: state.parcels.filter((x) => x.projectId === p.id).length,
        progress: p.progress,
        status: p.status,
        compensationAssessed: pComp.reduce((s, c) => s + c.assessedAmount, 0),
        compensationPaid: pComp.reduce((s, c) => s + c.paidAmount, 0),
        familiesAffected: pRR.reduce((s, r) => s + r.affectedFamilies, 0),
        benefitsDelivered: pRR.reduce((s, r) => s + r.benefitsDelivered, 0),
      };
    }),
  });
});

// Public Citizen Tracking (Privacy-Preserving Prototype)
api.get("/public/citizen-status", (req, res) => {
  const query = String(req.query.query || "").trim().toUpperCase();
  if (!query) {
    return res.status(400).json({
      error: { code: "QUERY_REQUIRED", message: "Please enter a citizen reference, parcel ID, survey number, or case ID." },
    });
  }

  const state = loadState();
  const matchedParcel = state.parcels.find(
    (p) =>
      p.ownerReference.toUpperCase() === query ||
      p.parcelId.toUpperCase() === query ||
      p.externalId.toUpperCase() === query ||
      p.surveyNumber.toUpperCase() === query,
  );

  const matchedCase = matchedParcel
    ? state.cases.find((c) => c.parcelId === matchedParcel.id)
    : state.cases.find((c) => c.caseId.toUpperCase() === query);

  if (!matchedCase) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "No acquisition record found for the provided identifier. Please check your reference ID.",
      },
    });
  }

  const parcel = state.parcels.find((p) => p.id === matchedCase.parcelId);
  const project = state.projects.find((p) => p.id === matchedCase.projectId);
  const comp = state.compensations.find((c) => c.caseId === matchedCase.id);

  // Return strictly sanitized non-sensitive public record
  res.json({
    data: {
      caseReference: matchedCase.caseId,
      projectName: project?.name || "Corridor Expansion Project",
      parcelReference: parcel?.parcelId || "Candidate Parcel",
      surveyNumber: parcel?.surveyNumber || "N/A",
      village: parcel?.village || "Ambala",
      district: parcel?.district || "Ambala",
      state: parcel?.state || "Haryana",
      acquisitionStage: matchedCase.currentStage,
      overallStatus: matchedCase.status,
      compensationAssessed: comp ? comp.assessedAmount : 0,
      compensationApproved: comp ? comp.approvedAmount : 0,
      amountPaid: comp ? comp.paidAmount : 0,
      paymentStatus: comp ? comp.status : "ASSESSED",
      lastUpdated: matchedCase.createdAt,
      disclaimer: "CITIZEN PORTAL — PROTOTYPE. Authoritative records remain under the jurisdiction of the Competent Authority for Land Acquisition (CALA).",
    },
  });
});
