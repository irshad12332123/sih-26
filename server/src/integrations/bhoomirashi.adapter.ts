export interface BhoomiRashiProjectSummary {
  externalProjectId: string;
  name: string;
  department: string;
  state: string;
  district: string;
  landRequiredHa: number;
  landAcquiredHa: number;
  affectedParcelsCount: number;
  stages: {
    section3A: string;
    section3CObjections: number;
    section3D: string;
    section3GCases: number;
    section3HPayments: number;
    section3EPossessions: number;
  };
  lastSyncedAt: string;
}

export interface BhoomiRashiParcelRecord {
  externalParcelId: string;
  externalProjectId: string;
  surveyNumber: string;
  state: string;
  district: string;
  tehsil: string;
  village: string;
  totalAreaHa: number;
  requiredAreaHa: number;
  coordinates: [number, number][];
  status3A: string;
  status3D: string;
  ownerReference: string;
}

export interface BhoomiRashiAdapter {
  syncProjects(): Promise<{
    projectsSynced: number;
    parcelReferences: number;
    statusUpdates: number;
    errors: number;
    projects: BhoomiRashiProjectSummary[];
  }>;
  getProject(externalProjectId: string): Promise<BhoomiRashiProjectSummary | null>;
  getProjectParcels(externalProjectId: string): Promise<BhoomiRashiParcelRecord[]>;
  getParcel(externalParcelId: string): Promise<BhoomiRashiParcelRecord | null>;
  getAcquisitionStatus(externalProjectIdOrParcelId: string): Promise<{
    stage: string;
    progressPercentage: number;
    notified3A: boolean;
    declared3D: boolean;
    awarded3G: boolean;
    paid3H: boolean;
    possessionTaken3E: boolean;
  }>;
}

export class MockBhoomiRashiAdapter implements BhoomiRashiAdapter {
  private demoProjects: BhoomiRashiProjectSummary[] = [
    {
      externalProjectId: "BR-PROJ-DEMO-001",
      name: "NH-44 Corridor Expansion — Demo Section",
      department: "Ministry of Road Transport & Highways — DEMO",
      state: "Haryana",
      district: "Ambala",
      landRequiredHa: 248.6,
      landAcquiredHa: 137.4,
      affectedParcelsCount: 482,
      stages: {
        section3A: "COMPLETED",
        section3CObjections: 17,
        section3D: "COMPLETED",
        section3GCases: 312,
        section3HPayments: 278,
        section3EPossessions: 193,
      },
      lastSyncedAt: new Date().toISOString(),
    },
    {
      externalProjectId: "BR-PROJ-DEMO-002",
      name: "Delhi-Amritsar-Katra Expressway Section 4",
      department: "National Highways Authority of India",
      state: "Punjab",
      district: "Ludhiana",
      landRequiredHa: 412.0,
      landAcquiredHa: 380.5,
      affectedParcelsCount: 650,
      stages: {
        section3A: "COMPLETED",
        section3CObjections: 4,
        section3D: "COMPLETED",
        section3GCases: 620,
        section3HPayments: 590,
        section3EPossessions: 510,
      },
      lastSyncedAt: new Date().toISOString(),
    },
  ];

  async syncProjects() {
    return {
      projectsSynced: 42,
      parcelReferences: 1284,
      statusUpdates: 312,
      errors: 0,
      projects: this.demoProjects,
    };
  }

  async getProject(externalProjectId: string) {
    return (
      this.demoProjects.find((p) => p.externalProjectId === externalProjectId) ||
      this.demoProjects[0]
    );
  }

  async getProjectParcels(externalProjectId: string): Promise<BhoomiRashiParcelRecord[]> {
    return Array.from({ length: 12 }, (_, i) => {
      const idx = i + 1;
      const lat = 30.362 + i * 0.0042;
      const lng = 76.776 + i * 0.0090;
      return {
        externalParcelId: `BR-PARCEL-DEMO-${String(idx).padStart(3, "0")}`,
        externalProjectId,
        surveyNumber: `${141 + idx}/${(idx % 4) + 1}`,
        state: "Haryana",
        district: "Ambala",
        tehsil: "Ambala",
        village: idx % 2 === 0 ? "Demo Village" : "Corridor Kalan",
        totalAreaHa: Number((2.4 + idx * 0.31).toFixed(2)),
        requiredAreaHa: Number((1.1 + idx * 0.15).toFixed(2)),
        coordinates: [
          [lat, lng],
          [lat + 0.003, lng + 0.004],
          [lat + 0.002, lng + 0.008],
          [lat - 0.002, lng + 0.005],
        ],
        status3A: "COMPLETED",
        status3D: idx > 4 ? "COMPLETED" : "PENDING",
        ownerReference: `CITIZEN-${12344 + idx}`,
      };
    });
  }

  async getParcel(externalParcelId: string): Promise<BhoomiRashiParcelRecord | null> {
    const parcels = await this.getProjectParcels("BR-PROJ-DEMO-001");
    return parcels.find((p) => p.externalParcelId === externalParcelId) || parcels[0];
  }

  async getAcquisitionStatus(externalProjectIdOrParcelId: string) {
    return {
      stage: "3G Compensation Determination",
      progressPercentage: 65,
      notified3A: true,
      declared3D: true,
      awarded3G: true,
      paid3H: false,
      possessionTaken3E: false,
    };
  }
}
