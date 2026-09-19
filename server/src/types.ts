export type Role =
  | "SUPER_ADMIN"
  | "NATIONAL_ADMIN"
  | "DEPARTMENT_ADMIN"
  | "PROJECT_AUTHORITY"
  | "PROJECT_OFFICER"
  | "DISTRICT_OFFICER"
  | "FIELD_OFFICER"
  | "REVIEWER"
  | "COMPENSATION_OFFICER"
  | "COMPENSATION_REVIEWER"
  | "FINANCE_OFFICER"
  | "RR_OFFICER"
  | "RR_REVIEWER"
  | "VIEWER";

export interface AuthContext {
  userId: string;
  roles: Role[];
  departmentId?: string;
  districtId?: string;
  tehsilId?: string;
  jurisdictionType?: string;
}
