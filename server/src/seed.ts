import { resetState } from "./repositories/local.repository.js";

const state = resetState();
console.log(
  JSON.stringify({
    level: "info",
    message: `Idempotent local demo seed initialized. Master authority baseline ready.`,
    records: {
      projects: state.projects.length,
      cases: state.cases.length,
      parcels: state.parcels.length,
      tasks: state.tasks.length,
      activities: state.caseActivities.length,
      compensation: state.compensation.length,
      rr: state.rr.length,
      possession: state.possession.length,
      notifications: state.notifications.length,
      auditLogs: state.audit.length,
      officers: state.users.length,
    },
  }),
);
