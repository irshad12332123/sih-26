import { loadState, saveState, dbPath, resetState } from "./repositories/local.repository.js";

const state = resetState();
console.log(
  JSON.stringify({
    level: "info",
    message: `Idempotent local demo seed persisted to ${dbPath}. Golden case NLA-C-00231 (FO-AMB-01) initialized.`,
    records: {
      projects: state.projects.length,
      cases: state.cases.length,
      parcels: state.parcels.length,
      tasks: state.tasks.length,
      activities: state.caseActivity.length,
      compensations: state.compensations.length,
      rr: state.rr.length,
      possessions: state.possessions.length,
      notifications: state.notifications.length,
      auditLogs: state.audits.length,
    },
  }),
);
