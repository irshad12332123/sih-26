const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  department?: string;
  district?: string;
  state?: string;
  officerCode?: string;
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("nlams_token");
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || "Request failed");

  // If this was a state-mutating request, emit global change event
  if (init.method && ["POST", "PATCH", "PUT", "DELETE"].includes(init.method.toUpperCase())) {
    emitDataChanged();
  }

  return body.data as T;
}

export function emitDataChanged() {
  window.dispatchEvent(new CustomEvent("nlams:data-changed"));
}

export async function login(email: string, password: string) {
  const result = await api<{ token: string; user: SessionUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
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

export function logout() {
  localStorage.removeItem("nlams_token");
  localStorage.removeItem("nlams_user");
  emitDataChanged();
}

export function csvDownload(rows: Record<string, unknown>[], fileName: string) {
  if (!rows || rows.length === 0) return;
  const keys = Object.keys(rows[0] || {});
  const csv = [
    keys.join(","),
    ...rows.map((row) =>
      keys.map((key) => JSON.stringify(row[key] ?? "")).join(","),
    ),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
