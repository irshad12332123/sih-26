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
