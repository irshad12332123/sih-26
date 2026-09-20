const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export type SessionUser = {
  id: string;
  officerId?: string;
  employeeReference?: string;
  email: string;
  displayName: string;
  designation?: string;
  role: string;
  department?: string;
  organization?: string;
  district?: string;
  state?: string;
  tehsil?: string;
  village?: string;
  jurisdictionType?: string;
  officerCode?: string;
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("nlams_token");
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    });
  } catch {
    throw new Error(
      "Cannot reach the N-LAMS API. Check that the backend service is running and try again.",
    );
  }

  // The API always answers with JSON, but a proxy error or a crash can return
  // HTML/empty bodies — surface a readable message instead of a parse error.
  let body: any = null;
  const raw = await response.text();
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      body?.error?.message ||
        (response.status === 401
          ? "Your session has expired. Please sign in again."
          : `Request failed (${response.status} ${response.statusText || "error"}).`),
    );
  }
  if (body === null) throw new Error("The server returned an unreadable response.");

  // If this was a state-mutating request, emit global change event
  if (
    init.method &&
    ["POST", "PATCH", "PUT", "DELETE"].includes(init.method.toUpperCase())
  ) {
    emitDataChanged();
  }

  return body.data as T;
}

export function emitDataChanged() {
  window.dispatchEvent(new CustomEvent("nlams:data-changed"));
}

export async function login(email: string, password: string) {
  const result = await api<{ token: string; user: SessionUser }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
  localStorage.setItem("nlams_token", result.token);
  localStorage.setItem("nlams_user", JSON.stringify(result.user));
  emitDataChanged();
  return result.user;
}

export function currentUser(): SessionUser | null {
  try {
    return JSON.parse(localStorage.getItem("nlams_user") || "null");
  } catch {
    return null;
  }
}

export function getRoleDashboardPath(role?: string): string {
  switch (role) {
    case "FIELD_OFFICER":
      return "/field-tasks";
    case "REVIEWER":
      return "/review-queue";
    case "COMPENSATION_OFFICER":
    case "COMPENSATION_REVIEWER":
    case "FINANCE_OFFICER":
      return "/compensation";
    case "RR_OFFICER":
    case "RR_REVIEWER":
      return "/rr";
    case "PROJECT_OFFICER":
    case "PROJECT_AUTHORITY":
      return "/";
    case "DISTRICT_OFFICER":
      return "/";
    case "NATIONAL_ADMIN":
    case "SUPER_ADMIN":
    case "VIEWER":
    default:
      return "/";
  }
}

export function logout() {
  localStorage.removeItem("nlams_token");
  localStorage.removeItem("nlams_user");
  emitDataChanged();
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  // RFC 4180: wrap in quotes and double any embedded quote.
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvDownload(rows: Record<string, unknown>[], fileName: string) {
  if (!rows || rows.length === 0) return;
  // Rows can have differing shapes — use the union of keys so nothing is lost.
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row || {}))));
  if (keys.length === 0) return;
  const csv = [
    keys.map(csvCell).join(","),
    ...rows.map((row) => keys.map((key) => csvCell(row?.[key])).join(",")),
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Give the browser a tick to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
