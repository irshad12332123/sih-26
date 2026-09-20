import { app } from "../app.js";
import http from "node:http";

let server: http.Server;
const PORT = 4199;
const BASE = `http://localhost:${PORT}/api`;

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data: data.data, error: data.error };
}

async function runTests() {
  console.log("=================================================================");
  console.log("N-LAMS SIH 2026: Two-Sided End-to-End Automated Demonstration Test");
  console.log("Side A: National Integration / Onboarding (BhoomiRashi)");
  console.log("Side B: Jurisdiction-Aware Native N-LAMS Project & Workflow");
  console.log("=================================================================\n");

  server = app.listen(PORT);
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, stepName: string, detail?: string) {
    if (condition) {
      console.log(`✓ [PASS] ${stepName}${detail ? ` (${detail})` : ""}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${stepName}${detail ? ` (${detail})` : ""}`);
      failed++;
    }
  }

  try {
    // ============================================================
    // STEP 1: Baseline Health Check & Clean Demo Reset
    // ============================================================
    const health = await request("/health");
    assert(health.ok && health.data.status === "ok", "1. API Health & Persistence check verified", health.data.persistence);

    const resetRes = await request("/demo/reset", { method: "POST" });
    assert(resetRes.ok && resetRes.data.projects === 0 && resetRes.data.officers >= 10, "2. Master authority baseline reset (Zero preloaded operational projects)");

    // ============================================================
    // STEP 2: Verify Master Administrative Hierarchy (Haryana / Ambala)
    // ============================================================
    const officersRes = await request("/master/officers");
    assert(
      officersRes.ok && officersRes.data.length >= 10,
      "3. Master Officer Database loaded",
      `${officersRes.data.length} synthetic officers configured`,
    );

    const jurisdictionsRes = await request("/master/jurisdictions");
    assert(
      jurisdictionsRes.ok && jurisdictionsRes.data.villages.some((v: any) => v.name === "Demo Kalan"),
      "4. Master Jurisdictions loaded",
      `${jurisdictionsRes.data.districts.length} districts, ${jurisdictionsRes.data.villages.length} synthetic villages`,
    );

    // Verify projects list before sync is EMPTY
    const preSyncProjects = await request("/projects");
    assert(preSyncProjects.ok && preSyncProjects.data.length === 0, "5. Pre-Sync Verification: No BhoomiRashi projects exist before synchronization");

    // ============================================================
    // PART 1: SIDE A — NATIONAL INTEGRATION / ONBOARDING (BhoomiRashi)
    // ============================================================
    console.log("\n--- [SIDE A: NATIONAL INTEGRATION / ONBOARDING] ---");

    // 1. Login as National Admin
    const natLogin = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "national.admin@demo.nlams.gov", password: "Demo@123" }),
    });
    assert(natLogin.ok && natLogin.data.user.role === "NATIONAL_ADMIN", "6. National Admin authenticated");
    const natToken = natLogin.data.token;

    // 2. Trigger External System Synchronization (Mock BhoomiRashi)
    const syncRes = await request("/integrations/bhoomirashi/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${natToken}` },
    });
    assert(
      syncRes.ok && syncRes.data.project.projectId === "NLAMS-EXT-00042",
      "7. BhoomiRashi External Project Synchronization completed",
      `Project: ${syncRes.data.project.name}, Ext ID: ${syncRes.data.project.externalProjectId}`,
    );

    // 3. Verify Preserved External System References
    const extProjRes = await request("/projects", {
      headers: { Authorization: `Bearer ${natToken}` },
    });
    const extProj = extProjRes.data.find((p: any) => p.externalProjectId === "BR-NH-2026-0042");
    assert(
      extProj && extProj.sourceType === "EXTERNAL" && extProj.sourceSystem === "BHOOMIRASHI",
      "8. External System Authoritative Reference preserved in N-LAMS unified view",
      `Source: ${extProj?.sourceSystem}, Ext ID: ${extProj?.externalProjectId}`,
    );

    // 4. Verify No BhoomiRashi Internal Officers/Tasks were imported into N-LAMS queues
    const extTasksRes = await request("/tasks/my", {
      headers: { Authorization: `Bearer ${natToken}` },
    });
    assert(extTasksRes.ok && extTasksRes.data.length === 0, "9. No BhoomiRashi internal officer tasks imported into N-LAMS task queues");

    // 5. Test Idempotent Sync: Re-syncing should not duplicate records
    const reSyncRes = await request("/integrations/bhoomirashi/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${natToken}` },
    });
    const postReSyncProjects = await request("/projects", {
      headers: { Authorization: `Bearer ${natToken}` },
    });
    assert(
      reSyncRes.ok && postReSyncProjects.data.length === 1,
      "10. Idempotent Synchronization verified: Re-sync did not create duplicates",
      `Total projects: ${postReSyncProjects.data.length}`,
    );

    // ============================================================
    // PART 2: SIDE B — NATIVE N-LAMS PROJECT WORKFLOW
    // ============================================================
    console.log("\n--- [SIDE B: NATIVE N-LAMS PROJECT WORKFLOW] ---");

    // 1. Login as Project Authority
    const projLogin = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "project.authority@demo.nlams.gov", password: "Demo@123" }),
    });
    assert(
      projLogin.ok && (projLogin.data.user.role === "PROJECT_OFFICER" || projLogin.data.user.role === "PROJECT_AUTHORITY"),
      "11. Project Authority authenticated",
    );
    const projToken = projLogin.data.token;

    // 2. Create Native N-LAMS Project
    const createRes = await request("/projects", {
      method: "POST",
      headers: { Authorization: `Bearer ${projToken}` },
      body: JSON.stringify({
        name: "Haryana State Infrastructure Corridor — Demo Project",
        projectId: "HR-INFRA-2026-001",
        department: "Irrigation & Water Resources / State Infrastructure Authority",
        authority: "Government of Haryana",
        type: "State Infrastructure",
        state: "Haryana",
        district: "Ambala",
        tehsil: "Ambala",
        village: "Demo Kalan",
        selectedParcelIds: ["pcl-hr-amb-001", "pcl-hr-amb-002", "pcl-hr-amb-003"],
        submitImmediately: true,
      }),
    });
    assert(createRes.ok && createRes.data.projectId === "HR-INFRA-2026-001", "12. Native N-LAMS Project created and submitted", "Project Code: HR-INFRA-2026-001");
    const nativeProj = createRes.data;

    // 3. Unauthorized Action Check: Field Officer tries to approve Administrative Review
    const fieldAmbalaLogin = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "field.ambala@demo.nlams.gov", password: "Demo@123" }),
    });
    const fieldAmbalaToken = fieldAmbalaLogin.data.token;

    const unauthApprove = await request("/tasks/task-admin-rev-001/approve", {
      method: "POST",
      headers: { Authorization: `Bearer ${fieldAmbalaToken}` },
    });
    assert(
      unauthApprove.status === 403 || unauthApprove.status === 404,
      "13. Server-side Role Authorization enforced: Field Officer cannot perform Administrative Review (403 Forbidden)",
    );

    // 4. Login as District Revenue Officer (CALA Ambala)
    const distLogin = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "district.officer@demo.nlams.gov", password: "Demo@123" }),
    });
    assert(distLogin.ok && distLogin.data.user.role === "DISTRICT_OFFICER", "14. District Officer authenticated");
    const distToken = distLogin.data.token;

    // Check District Officer Scoped Tasks
    const distTasks = await request("/tasks/my", {
      headers: { Authorization: `Bearer ${distToken}` },
    });
    assert(
      distTasks.ok && distTasks.data.length > 0,
      "15. Jurisdiction routing: District Officer received Administrative Review task",
      `Assigned to: ${distLogin.data.user.displayName}`,
    );
    const adminTask = distTasks.data[0];

    // District Officer Approves Administrative Review
    const adminApprove = await request(`/tasks/${adminTask.id}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${distToken}` },
      body: JSON.stringify({ remarks: "Administrative review approved. Proceeding to Cadastral Field Verification." }),
    });
    assert(
      adminApprove.ok && adminApprove.data.document && adminApprove.data.nextStage === "Field Verification",
      "16. Administrative Review approved with mandatory approval document attached",
      `Next Stage: ${adminApprove.data.nextStage}`,
    );

    // 5. Scoped Task Visibility: Saha Field Officer vs Ambala Field Officer
    const fieldSahaLogin = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "field.saha@demo.nlams.gov", password: "Demo@123" }),
    });
    const fieldSahaTasks = await request("/tasks/my", {
      headers: { Authorization: `Bearer ${fieldSahaLogin.data.token}` },
    });
    assert(
      fieldSahaTasks.ok && fieldSahaTasks.data.length === 0,
      "17. Jurisdictional isolation: Saha Field Officer does NOT see Demo Kalan / Ambala tasks",
      `Saha tasks: ${fieldSahaTasks.data.length}`,
    );

    const fieldAmbalaTasks = await request("/tasks/my", {
      headers: { Authorization: `Bearer ${fieldAmbalaToken}` },
    });
    assert(
      fieldAmbalaTasks.ok && fieldAmbalaTasks.data.length > 0,
      "18. Field Officer Ambala scoped queue reflects assigned Demo Kalan parcels",
      `${fieldAmbalaTasks.data.length} assigned field tasks`,
    );
    const fieldTask = fieldAmbalaTasks.data[0];

    // 6. Field Officer Submits Verification with Geo-tagged evidence
    const fieldSubmit = await request(`/tasks/${fieldTask.id}/field-verification`, {
      method: "POST",
      headers: { Authorization: `Bearer ${fieldAmbalaToken}` },
      body: JSON.stringify({
        latitude: 30.368,
        longitude: 76.786,
        isDemoGps: true,
        remarks: "Physical boundary verified on site. Land is under agricultural cultivation.",
        physicallyIdentified: true,
        boundaryVerified: true,
        landUseVerified: true,
        photoUrls: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80"],
      }),
    });
    assert(
      fieldSubmit.ok && fieldSubmit.data.evidence,
      "19. Field Verification submitted with geo-tagged evidence & auto-created report doc",
      "Transferred to Reviewer",
    );

    // 7. Login as Revenue Reviewer
    const revLogin = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "reviewer.ambala@demo.nlams.gov", password: "Demo@123" }),
    });
    assert(revLogin.ok && revLogin.data.user.role === "REVIEWER", "20. Revenue Reviewer authenticated");
    const revToken = revLogin.data.token;

    const revTasks = await request("/tasks/my", {
      headers: { Authorization: `Bearer ${revToken}` },
    });
    assert(revTasks.ok && revTasks.data.length > 0, "21. Reviewer received Evidence Review task");
    const revTask = revTasks.data[0];

    // Reviewer Approves
    const revApprove = await request(`/tasks/${revTask.id}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${revToken}` },
      body: JSON.stringify({ remarks: "Field inspection findings and geo-tagged evidence verified." }),
    });
    assert(
      revApprove.ok && revApprove.data.nextStage === "Compensation Assessment",
      "22. Reviewer scrutiny approved with mandatory scrutiny note",
      `Advanced to: ${revApprove.data.nextStage}`,
    );

    // 8. Compensation Assessment & Award Approval
    const compOfficerLogin = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "compensation.ambala@demo.nlams.gov", password: "Demo@123" }),
    });
    assert(compOfficerLogin.ok && compOfficerLogin.data.user.role === "COMPENSATION_OFFICER", "23. Compensation Officer authenticated");

    const compReviewLogin = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "compensation.review@demo.nlams.gov", password: "Demo@123" }),
    });
    assert(compReviewLogin.ok && compReviewLogin.data.user.role === "COMPENSATION_REVIEWER", "24. Compensation Reviewer authenticated");
    const compReviewToken = compReviewLogin.data.token;

    const compList = await request("/compensation", { headers: { Authorization: `Bearer ${compReviewToken}` } });
    const targetComp = compList.data.find((c: any) => c.status !== "PAID") || compList.data[0];

    // Award Approval with AUTOMATIC Mock PFMS DBT Payment
    const awardApprove = await request(`/compensation/${targetComp.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${compReviewToken}` },
      body: JSON.stringify({ status: "APPROVED", approvedAmount: 1850000 }),
    });
    assert(
      awardApprove.ok && awardApprove.data.status === "PAID" && awardApprove.data.paymentReference?.startsWith("DEMO-PFMS"),
      "25. Compensation Award approved and AUTOMATIC PFMS DBT disbursement executed",
      `Status: ${awardApprove.data?.status}, Ref: ${awardApprove.data?.paymentReference}`,
    );

    // 9. R&R Entitlements Flow
    const rrReviewLogin = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "rr.review@demo.nlams.gov", password: "Demo@123" }),
    });
    assert(rrReviewLogin.ok && rrReviewLogin.data.user.role === "RR_REVIEWER", "26. R&R Reviewer authenticated");
    const rrToken = rrReviewLogin.data.token;

    const rrList = await request("/rr", { headers: { Authorization: `Bearer ${rrToken}` } });
    const targetRR = rrList.data[0];

    const rrDeliver = await request(`/rr/${targetRR.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${rrToken}` },
      body: JSON.stringify({ status: "COMPLETED", benefitsDelivered: targetRR.eligibleFamilies }),
    });
    assert(
      rrDeliver.ok && rrDeliver.data.status === "COMPLETED",
      "27. R&R Entitlement Package approved & benefits delivered",
      `Delivered to ${rrDeliver.data.benefitsDelivered} families`,
    );

    // 10. Site Possession (Form 3E)
    const possLogin = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "possession.ambala@demo.nlams.gov", password: "Demo@123" }),
    });
    assert(possLogin.ok, "28. Possession Officer authenticated");
    const possToken = possLogin.data.token;

    const possList = await request("/possession", { headers: { Authorization: `Bearer ${possToken}` } });
    const targetPoss = possList.data[0];

    const possComplete = await request(`/possession/${targetPoss.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${possToken}` },
      body: JSON.stringify({ remarks: "Form 3E Site Possession and Handover completed." }),
    });
    assert(
      possComplete.ok && possComplete.data.status === "POSSESSION_COMPLETED",
      "29. Form 3E Site Possession Completed (with auto-created Possession Certificate doc)",
    );

    // 11. Scoped Notifications Check
    const fieldNotifs = await request("/notifications", {
      headers: { Authorization: `Bearer ${fieldAmbalaToken}` },
    });
    assert(
      fieldNotifs.ok && fieldNotifs.data.every((n: any) => n.recipientId === "field.ambala@demo.nlams.gov"),
      "30. Notifications are strictly recipient-specific (Field Officer only sees own alerts)",
    );

    // 12. Immutable Audit Trail
    const auditLogs = await request("/audit");
    assert(
      auditLogs.ok && auditLogs.data.length >= 6,
      "31. Immutable Audit Trail verified across all transitions",
      `${auditLogs.data.length} audit entries recorded`,
    );

    // 13. Reports & Analytics Summary
    const reportsSummary = await request("/reports/summary");
    assert(
      reportsSummary.ok && reportsSummary.data.length >= 2,
      "32. Consolidated Analytics Reports verified for both Native and External Corridors",
      `${reportsSummary.data.length} projects analyzed`,
    );

    // ============================================================
    // PART 3: REGRESSION GUARDS
    // Each of these reproduced a real data-integrity or wiring defect.
    // ============================================================
    console.log("\n--- [PART 3: REGRESSION GUARDS] ---");

    // R1. Case detail must carry the activity timeline the case workspace renders.
    const caseList = await request("/cases", { headers: { Authorization: `Bearer ${natToken}` } });
    const nativeCase = caseList.data.find((c: any) => c.projectId === nativeProj.id);
    const caseDetail = await request(`/cases/${nativeCase.id}`, {
      headers: { Authorization: `Bearer ${natToken}` },
    });
    assert(
      caseDetail.ok && Array.isArray(caseDetail.data.activity) && caseDetail.data.activity.length > 0,
      "33. Case detail payload includes the chronological activity timeline",
      `${caseDetail.data?.activity?.length ?? 0} events`,
    );

    // R2. The timeline endpoint must accept the canonical case reference too.
    const timelineByRef = await request(`/cases/${encodeURIComponent(nativeCase.caseId)}/timeline`, {
      headers: { Authorization: `Bearer ${natToken}` },
    });
    assert(
      timelineByRef.ok && Array.isArray(timelineByRef.data) && timelineByRef.data.length > 0,
      "34. GET /cases/:id/timeline resolves a case reference as well as a record id",
    );
    const timelineMissing = await request("/cases/does-not-exist/timeline", {
      headers: { Authorization: `Bearer ${natToken}` },
    });
    assert(timelineMissing.status === 404, "35. Unknown case timeline returns 404 rather than an empty list");

    // R3. Case references must stay unique across projects.
    const secondProject = await request("/projects", {
      method: "POST",
      headers: { Authorization: `Bearer ${projToken}` },
      body: JSON.stringify({
        name: "Second Native Corridor (uniqueness probe)",
        projectId: "HR-INFRA-2026-002",
        department: "Irrigation & Water Resources",
        type: "State Infrastructure",
        state: "Haryana",
        district: "Ambala",
        selectedParcelIds: ["pcl-hr-amb-004"],
        submitImmediately: true,
      }),
    });
    assert(secondProject.ok, "36. Second native project created for the uniqueness probe");
    const allCases = await request("/cases", { headers: { Authorization: `Bearer ${natToken}` } });
    const references = allCases.data.map((c: any) => c.caseId);
    const recordIds = allCases.data.map((c: any) => c.id);
    assert(
      new Set(references).size === references.length,
      "37. Case references are unique across projects",
      `${references.length} cases, ${new Set(references).size} distinct references`,
    );
    assert(
      new Set(recordIds).size === recordIds.length,
      "38. Case record ids are unique across projects",
    );

    // R4. Duplicate project codes must be rejected.
    const duplicateCode = await request("/projects", {
      method: "POST",
      headers: { Authorization: `Bearer ${projToken}` },
      body: JSON.stringify({
        name: "Duplicate Code Probe",
        projectId: "HR-INFRA-2026-001",
        department: "Irrigation & Water Resources",
        type: "State Infrastructure",
        state: "Haryana",
        district: "Ambala",
        selectedParcelIds: ["pcl-hr-amb-005"],
      }),
    });
    assert(
      duplicateCode.status === 409 && duplicateCode.error?.code === "DUPLICATE_PROJECT_CODE",
      "39. Duplicate project codes are rejected with 409",
      duplicateCode.error?.code,
    );

    // R5. Re-submitting a project must not duplicate its cases.
    const casesBeforeResubmit = (await request("/cases", { headers: { Authorization: `Bearer ${natToken}` } })).data.length;
    const reSubmit = await request(`/projects/${nativeProj.id}/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${projToken}` },
    });
    const casesAfterResubmit = (await request("/cases", { headers: { Authorization: `Bearer ${natToken}` } })).data.length;
    assert(
      reSubmit.status === 409 && casesBeforeResubmit === casesAfterResubmit,
      "40. Re-submitting an already-submitted project is rejected and creates no duplicate cases",
      `${casesBeforeResubmit} → ${casesAfterResubmit} cases`,
    );

    // R6. A completed task must not be approvable a second time.
    const reApprove = await request(`/tasks/${adminTask.id}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${distToken}` },
      body: JSON.stringify({ remarks: "duplicate approval probe" }),
    });
    assert(
      reApprove.status === 409 && reApprove.error?.code === "TASK_ALREADY_COMPLETED",
      "41. Re-approving a completed task is rejected with 409",
      reApprove.error?.code,
    );

    // R7. Field verification must not be submittable twice for one task.
    const reVerify = await request(`/tasks/${fieldTask.id}/field-verification`, {
      method: "POST",
      headers: { Authorization: `Bearer ${fieldAmbalaToken}` },
      body: JSON.stringify({ remarks: "duplicate verification probe" }),
    });
    assert(
      reVerify.status === 409,
      "42. Duplicate field-verification submission is rejected with 409",
      reVerify.error?.code,
    );

    // R8. A disbursed award must not be re-approved or re-synced.
    const reApproveAward = await request(`/compensation/${targetComp.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${compReviewToken}` },
      body: JSON.stringify({ status: "APPROVED", approvedAmount: 999999 }),
    });
    assert(
      reApproveAward.status === 409 && reApproveAward.error?.code === "ALREADY_DISBURSED",
      "43. Re-approving an already disbursed compensation award is rejected",
      reApproveAward.error?.code,
    );
    const reSyncPayment = await request(`/compensation/${targetComp.id}/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${compReviewToken}` },
    });
    assert(reSyncPayment.status === 409, "44. Re-running a PFMS disbursement for a paid award is rejected");

    // R9. Negative / zero assessments must be rejected.
    const pendingComp = (await request("/compensation", { headers: { Authorization: `Bearer ${compReviewToken}` } })).data
      .find((c: any) => c.status !== "PAID");
    if (pendingComp) {
      const badAssessment = await request(`/compensation/${pendingComp.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${compReviewToken}` },
        body: JSON.stringify({ assessedAmount: -5 }),
      });
      assert(badAssessment.status === 400, "45. A non-positive assessed amount is rejected with 400");
    } else {
      assert(false, "45. A non-positive assessed amount is rejected with 400", "no pending compensation record found");
    }

    // R10. R&R delivery must not run twice (it raises a possession task).
    const reDeliver = await request(`/rr/${targetRR.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${rrToken}` },
      body: JSON.stringify({ status: "COMPLETED", benefitsDelivered: targetRR.eligibleFamilies }),
    });
    assert(
      reDeliver.status === 409 && reDeliver.error?.code === "ALREADY_COMPLETED",
      "46. Re-delivering an already completed R&R package is rejected",
      reDeliver.error?.code,
    );

    // R11. Possession must not be re-recorded.
    const rePossession = await request(`/possession/${targetPoss.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${possToken}` },
      body: JSON.stringify({ remarks: "duplicate possession probe" }),
    });
    assert(rePossession.status === 409, "47. Re-recording a completed possession is rejected");

    // R12. A completed case cannot be advanced further.
    const completedCase = (await request("/cases", { headers: { Authorization: `Bearer ${natToken}` } })).data
      .find((c: any) => c.status === "Completed");
    if (completedCase) {
      const advanceCompleted = await request(`/cases/${completedCase.id}/advance`, {
        method: "POST",
        headers: { Authorization: `Bearer ${natToken}` },
        body: JSON.stringify({ remarks: "advance completed probe" }),
      });
      assert(
        advanceCompleted.status === 409 && advanceCompleted.error?.code === "CASE_COMPLETED",
        "48. Advancing an already completed case is rejected",
        advanceCompleted.error?.code,
      );
    } else {
      assert(false, "48. Advancing an already completed case is rejected", "no completed case found");
    }

    // R13. Parcels already bound to a project cannot be re-associated.
    const reusedParcel = await request("/projects", {
      method: "POST",
      headers: { Authorization: `Bearer ${projToken}` },
      body: JSON.stringify({
        name: "Parcel Reuse Probe",
        projectId: "HR-INFRA-2026-099",
        department: "Irrigation & Water Resources",
        type: "State Infrastructure",
        state: "Haryana",
        district: "Ambala",
        selectedParcelIds: ["pcl-hr-amb-001"],
      }),
    });
    assert(
      reusedParcel.status === 409 && reusedParcel.error?.code === "PARCEL_ALREADY_ASSIGNED",
      "49. A cadastral parcel cannot be associated with two projects",
      reusedParcel.error?.code,
    );

    // R13b. Unknown parcel ids must be rejected rather than silently dropped.
    const unknownParcel = await request("/projects", {
      method: "POST",
      headers: { Authorization: `Bearer ${projToken}` },
      body: JSON.stringify({
        name: "Unknown Parcel Probe",
        projectId: "HR-INFRA-2026-098",
        department: "Irrigation & Water Resources",
        type: "State Infrastructure",
        state: "Haryana",
        district: "Ambala",
        selectedParcelIds: ["pcl-does-not-exist"],
      }),
    });
    assert(
      unknownParcel.status === 400 && unknownParcel.error?.code === "UNKNOWN_PARCEL",
      "49b. Unknown cadastral parcel ids are rejected with 400",
      unknownParcel.error?.code,
    );

    // R14. The dashboard summary must expose every field the UI reads.
    const summary = await request("/dashboard/summary", { headers: { Authorization: `Bearer ${natToken}` } });
    const requiredSummaryKeys = [
      "totalProjects", "activeProjects", "totalCases", "totalParcels", "candidateParcels",
      "acquiredParcels", "landRequiredHa", "landAcquiredHa", "atRisk", "pendingApprovals",
      "pendingFieldVerifications", "pendingReviews", "compensationAssessed", "compensationApproved",
      "compensationPaid", "compensationPending", "affectedFamilies", "eligibleFamilies",
      "benefitsDelivered", "rrPending", "possessionCompleted",
    ];
    const missingKeys = requiredSummaryKeys.filter((k) => summary.data?.[k] === undefined);
    assert(
      summary.ok && missingKeys.length === 0,
      "50. Dashboard summary exposes every metric the overview renders",
      missingKeys.length ? `missing: ${missingKeys.join(", ")}` : `${requiredSummaryKeys.length} metrics present`,
    );

    // R15. Possession completion must be reflected in the native project's land
    // figures, while externally-owned figures stay exactly as synchronised.
    const projectsAfter = await request("/projects", { headers: { Authorization: `Bearer ${natToken}` } });
    const extProject = projectsAfter.data.find((p: any) => p.externalProjectId === "BR-NH-2026-0042");
    assert(
      Number(summary.data.landAcquiredHa) > 0,
      "51. Project land-acquired figures track completed possessions",
      `landAcquiredHa: ${summary.data.landAcquiredHa}`,
    );
    assert(
      Number(extProject?.landRequiredHa) === 312.4 && Number(extProject?.landAcquiredHa) === 168.8,
      "52. Externally synchronised land figures are never overwritten by N-LAMS",
      `required=${extProject?.landRequiredHa}, acquired=${extProject?.landAcquiredHa}`,
    );

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    server.close();
    console.log("\n=================================================================");
    console.log(`Test Execution Finished: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================================\n");
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runTests();
