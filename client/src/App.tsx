import { Routes, Route } from "react-router-dom";
import { PortalLayout } from "./layouts/PortalLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectsPage, ProjectDetailsPage } from "./pages/ProjectsPage";
import { CasesPage, CaseDetailsPage } from "./pages/CasesPage";
import { FieldTasksPage } from "./pages/FieldTasksPage";
import { ReviewQueuePage } from "./pages/ReviewQueuePage";
import { CompensationPage, RRPage } from "./pages/FinancialPages";
import { CitizenPortalPage } from "./pages/CitizenPortalPage";
import { GISPage } from "./pages/GISPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { AuditPage } from "./pages/AuditPage";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { ModulePage } from "./pages/ModulePage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/citizen" element={<CitizenPortalPage />} />
      <Route element={<PortalLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailsPage />} />
        <Route path="cases" element={<CasesPage />} />
        <Route path="cases/:id" element={<CaseDetailsPage />} />
        <Route path="field-tasks" element={<FieldTasksPage />} />
        <Route path="review-queue" element={<ReviewQueuePage />} />
        <Route path="map" element={<GISPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="compensation" element={<CompensationPage />} />
        <Route path="rr" element={<RRPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route
          path="users"
          element={
            <ModulePage
              title="Users & Authority Registry"
              description="Role-based jurisdictional assignment across State, District, Tehsil, and Village levels."
            />
          }
        />
        <Route path="audit" element={<AuditPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
      </Route>
    </Routes>
  );
}
