export { MockBhoomiRashiAdapter, type BhoomiRashiAdapter, type BhoomiRashiProjectSummary, type BhoomiRashiParcelRecord } from "./bhoomirashi.adapter.js";

export interface LandRecordsAdapter {
  getParcel(externalId: string): Promise<{
    externalId: string;
    surveyNumber: string;
    areaHa: number;
    state: string;
    district: string;
    tehsil: string;
    village: string;
    source: string;
  }>;
  getDocuments(externalId: string): Promise<string[]>;
}

export interface AcquisitionSystemAdapter {
  getCase(
    externalId: string,
  ): Promise<{ externalId: string; status: string; lastSyncedAt: string }>;
  getCaseStatus(externalId: string): Promise<string>;
}

export interface PaymentSystemAdapter {
  getPaymentStatus(
    externalId: string,
  ): Promise<{ status: "PAID" | "UNDER_PROCESS" | "RECONCILIATION_REQUIRED"; paidAmount: number; reference: string; timestamp: string }>;
}

export class MockLandRecordsAdapter implements LandRecordsAdapter {
  async getParcel(externalId: string) {
    return {
      externalId,
      surveyNumber: "142/3",
      areaHa: 2.71,
      state: "Haryana",
      district: "Ambala",
      tehsil: "Ambala",
      village: "Demo Village",
      source: "DEMO / MOCK · Haryana Cadastral Land Records",
    };
  }
  async getDocuments(_externalId: string) {
    return ["Jamabandi_Ambala_142_3.pdf", "Cadastral_Map_Sheet_04.pdf", "Mutation_Register_Extract.pdf"];
  }
}

export class MockAcquisitionAdapter implements AcquisitionSystemAdapter {
  async getCase(externalId: string) {
    return {
      externalId,
      status: "FIELD_VERIFICATION_IN_PROGRESS",
      lastSyncedAt: new Date().toISOString(),
    };
  }
  async getCaseStatus(_externalId: string) {
    return "FIELD_VERIFICATION_IN_PROGRESS";
  }
}

export class MockPfmsAdapter implements PaymentSystemAdapter {
  async getPaymentStatus(externalId: string) {
    return {
      status: "PAID" as const,
      paidAmount: 1075000,
      reference: `DEMO-PFMS-2026-${externalId.slice(-4) || "0042"}`,
      timestamp: new Date().toISOString(),
    };
  }
}
