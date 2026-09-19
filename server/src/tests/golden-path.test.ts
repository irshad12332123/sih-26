import { app } from "../app.js";
import http from "node:http";

let server: http.Server;
const PORT = 4199;
const BASE = `http://localhost:${PORT}/api`;

async function request(path: string, options: RequestInit = {}) {
  const token = options.headers && (options.headers as any)["Authorization"];
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
  console.log("N-LAMS SIH 2026: End-to-End Golden Flow Automated Test Suite");
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
    // 1. Reset Demo State
    const resetRes = await request("/demo/reset", { method: "POST" });
    assert(resetRes.ok && resetRes.data.projects > 0, "1. Demo state reset to golden baseline");

    // 2. Health Check
    const health = await request("/health");
    assert(health.ok && health.data.status === "ok", "2. API Health check verified", health.data.persistence);

    // 3. Authenticate Personas
    const nationalAuth = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "national@nlams.demo", password: "National@123" }),
    });
    assert(nationalAuth.ok && nationalAuth.data.user.role === "NATIONAL_ADMIN", "3. Login as National Admin (MoRTH)");
    const nationalToken = nationalAuth.data.token;

    const fieldAuth = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "field@nlams.demo", password: "Field@123" }),
    });
    assert(fieldAuth.ok && fieldAuth.data.user.role === "FIELD_OFFICER", "4. Login as Field Officer (FO-AMB-01)");
    const fieldToken = fieldAuth.data.token;

    const reviewerAuth = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "reviewer@nlams.demo", password: "Reviewer@123" }),
    });
    assert(reviewerAuth.ok && reviewerAuth.data.user.role === "REVIEWER", "5. Login as Reviewing Officer (REV-AMB-01)");
    const reviewerToken = reviewerAuth.data.token;

    const viewerAuth = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "viewer@nlams.demo", password: "Viewer@123" }),
    });
    assert(viewerAuth.ok && viewerAuth.data.user.role === "VIEWER", "6. Login as Public / Ministry Viewer");
    const viewerToken = viewerAuth.data.token;

    // 4. BhoomiRashi Sync
    const syncRes = await request("/integrations/bhoomirashi/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${nationalToken}` },
    });
    assert(
      syncRes.ok && syncRes.data.projectsSynced === 42 && syncRes.data.parcelReferences === 1284,
      "7. BhoomiRashi mock project & parcel synchronization",
      "42 projects, 1284 parcel references",
    );

    // 5. Fetch Projects & Verification of Synchronized Data
    const projectsRes = await request("/projects", {
      headers: { Authorization: `Bearer ${nationalToken}` },
    });
    const mainProject = projectsRes.data[0];
    assert(
      projectsRes.ok && mainProject.landRequiredHa === 248.6 && mainProject.state === "Haryana",
      "8. Synchronized Project Details inspection",
      `${mainProject.name} (${mainProject.district}, ${mainProject.state})`,
    );

    // 6. Save Alignment Corridor
    const alignmentRes = await request(`/projects/${mainProject.id}/alignment`, {
      method: "POST",
      headers: { Authorization: `Bearer ${nationalToken}` },
      body: JSON.stringify({
        alignment: [
          [30.362, 76.776],
          [30.380, 76.812],
          [30.395, 76.850],
          [30.407, 76.873],
        ],
        bufferMeters: 100,
      }),
    });
    assert(alignmentRes.ok && alignmentRes.data.bufferMeters === 100, "9. Project alignment saved with 100m buffer corridor");

    // 7. Discover Candidate Parcels
    const discoveryRes = await request(`/projects/${mainProject.id}/discover-parcels`, {
      method: "POST",
      headers: { Authorization: `Bearer ${nationalToken}` },
      body: JSON.stringify({ bufferMeters: 100 }),
    });
    assert(
      discoveryRes.ok && discoveryRes.data.candidateParcels >= 10,
      "10. Alignment-driven Candidate Parcel Discovery & Automatic Case Creation",
      `${discoveryRes.data.candidateParcels} candidate parcels identified`,
    );

    // 8. Field Officer Task Queue
    const fieldTasksRes = await request("/tasks/my", {
      headers: { Authorization: `Bearer ${fieldToken}` },
    });
    assert(
      fieldTasksRes.ok && fieldTasksRes.data.length > 0,
      "11. Field Officer Task Queue filtered to jurisdiction (Ambala / Demo Village)",
      `${fieldTasksRes.data.length} assigned field tasks`,
    );
    const goldenTask = fieldTasksRes.data.find((t: any) => t.parcel?.parcelId === "PCL-00128") || fieldTasksRes.data[0];

    // 9. Field Officer Submits Verification with Geo-tagged Photographs
    const verifRes = await request(`/tasks/${goldenTask.id}/field-verification`, {
      method: "POST",
      headers: { Authorization: `Bearer ${fieldToken}` },
      body: JSON.stringify({
        physicallyIdentified: true,
        boundaryVerified: true,
        landUseVerified: true,
        structureAffected: false,
        encroachmentObserved: false,
        remarks: "Physical boundary corners verified against Ambala cadastral revenue sheet. No encroachments.",
        latitude: 30.3642,
        longitude: 76.7815,
        isDemoGps: true,
        photoUrls: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef"],
      }),
    });
    assert(
      verifRes.ok && verifRes.data.task.status === "COMPLETED" && verifRes.data.reviewTask.status === "IN_PROGRESS",
      "12. Field Verification Submission with geo-tagged photos & automatic Review task creation",
      `Assigned to Reviewer: ${verifRes.data.reviewTask.assignedUserId}`,
    );

    // 10. Reviewer Reviews & Approves
    const reviewerTask = verifRes.data.reviewTask;
    const approveRes = await request(`/tasks/${reviewerTask.id}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${reviewerToken}` },
      body: JSON.stringify({
        remarks: "Verified and confirmed boundary coordinates. Approved for Section 3G Award determination.",
      }),
    });
    assert(
      approveRes.ok && approveRes.data.nextTask.stageId !== undefined,
      "13. Reviewer scrutiny and approval advancing workflow to Section 3G Compensation Determination",
    );

    // 11. Compensation Award Approval
    const compList = await request("/compensation", {
      headers: { Authorization: `Bearer ${nationalToken}` },
    });
    const goldenComp = compList.data.find((c: any) => c.parcelId === "PCL-00128") || compList.data[0];
    const approveCompRes = await request(`/compensation/${goldenComp.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${nationalToken}` },
      body: JSON.stringify({
        status: "APPROVED",
        approvedAmount: goldenComp.assessedAmount,
      }),
    });
    assert(
      approveCompRes.ok && approveCompRes.data.status === "APPROVED",
      "14. Section 3G Compensation Award Approval",
      `Award: ₹${approveCompRes.data.approvedAmount.toLocaleString("en-IN")}`,
    );

    // 12. PFMS Direct Benefit Transfer Mock Payment Sync
    const pfmsSyncRes = await request(`/compensation/${goldenComp.id}/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${nationalToken}` },
    });
    assert(
      pfmsSyncRes.ok && pfmsSyncRes.data.status === "PAID" && pfmsSyncRes.data.paymentReference.startsWith("DEMO-PFMS"),
      "15. PFMS Direct Benefit Transfer Payment Synchronization",
      `Ref: ${pfmsSyncRes.data.paymentReference}`,
    );

    // 13. R&R Benefit Delivery & Completion
    const rrList = await request("/rr", {
      headers: { Authorization: `Bearer ${nationalToken}` },
    });
    const goldenRR = rrList.data[0];
    const rrUpdateRes = await request(`/rr/${goldenRR.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${nationalToken}` },
      body: JSON.stringify({
        status: "COMPLETED",
        benefitsDelivered: goldenRR.eligibleFamilies,
      }),
    });
    assert(
      rrUpdateRes.ok && rrUpdateRes.data.status === "COMPLETED",
      "16. Rehabilitation & Resettlement benefit delivery completion",
      `${goldenRR.eligibleFamilies} families delivered`,
    );

    // 14. Possession Completion
    const posList = await request("/possession", {
      headers: { Authorization: `Bearer ${nationalToken}` },
    });
    const goldenPos = posList.data[0];
    const posUpdateRes = await request(`/possession/${goldenPos.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${nationalToken}` },
      body: JSON.stringify({
        status: "POSSESSION_COMPLETED",
        remarks: "Handed over site to PIU Ambala.",
      }),
    });
    assert(posUpdateRes.ok && posUpdateRes.data.status === "POSSESSION_COMPLETED", "17. Section 3E Possession Completion");

    // 15. Notification & Audit Verification
    const notifs = await request("/notifications", {
      headers: { Authorization: `Bearer ${nationalToken}` },
    });
    assert(notifs.ok && notifs.data.length > 0, "18. Real-time Notification dispatch verification", `${notifs.data.length} notifications generated`);

    const audits = await request("/audit", {
      headers: { Authorization: `Bearer ${nationalToken}` },
    });
    assert(audits.ok && audits.data.length >= 5, "19. Immutable Audit Trail verification", `${audits.data.length} audit entries`);

    // 16. Case Activity Timeline
    const caseDetails = await request(`/cases/${goldenTask.caseId}`, {
      headers: { Authorization: `Bearer ${nationalToken}` },
    });
    assert(
      caseDetails.ok && caseDetails.data.activity.length >= 4,
      "20. Case Activity Timeline Feed completeness",
      `${caseDetails.data.activity.length} chronological lifecycle events`,
    );

    // 17. Citizen Public Status Lookup
    const citizenRes = await request("/public/citizen-status?query=CITIZEN-12345");
    assert(
      citizenRes.ok && citizenRes.data.caseReference !== undefined && citizenRes.data.paymentStatus === "PAID",
      "21. Privacy-Preserving Citizen Status Tracking Portal",
      `Case: ${citizenRes.data.caseReference}, Stage: ${citizenRes.data.acquisitionStage}`,
    );

    // 18. Security: Viewer Mutation Rejection (403)
    const viewerCompAttempt = await request(`/compensation/${goldenComp.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${viewerToken}` },
      body: JSON.stringify({ status: "APPROVED" }),
    });
    assert(viewerCompAttempt.status === 403, "22. Security Boundary: Viewer mutation rejected with 403 Forbidden");

    // Summary
    console.log("\n=================================================================");
    console.log(`Test Execution Finished: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error("Test error:", err);
  if (server) server.close();
  process.exit(1);
});
