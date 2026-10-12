// One place that talks to the backend. Every failure becomes an ApiError whose
// message is already written for the user (what happened, why, what to do next).
const STORAGE_KEY = "cs_session";

export class ApiError extends Error {
  constructor(status, message, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export const session = {
  get() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  },
  set(value) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  },
  clear() {
    sessionStorage.removeItem(STORAGE_KEY);
  },
};

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

const FALLBACK = {
  0: "We can't reach the server. Check your connection and try again.",
  401: "Please sign in to continue.",
  403: "You don't have permission to do that. Ask your manager if you need access.",
  404: "We couldn't find what you were looking for. Go back and try again.",
  500: "The server had a problem. Check the applications list before retrying to avoid a duplicate; if it continues, ask your manager for help.",
};

async function request(path, { method = "GET", body } = {}) {
  const token = session.get()?.access_token;
  let res;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    res = await fetch(`/api${path}`, {
      method,
      signal: controller.signal,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(0, err.name === "AbortError"
      ? "The server took too long to respond. Check the applications list before retrying, then try again."
      : FALLBACK[0]);
  } finally {
    clearTimeout(timeout);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = typeof data?.detail === "string" ? data.detail : FALLBACK[res.status] || FALLBACK[500];
    if (res.status === 401 && token) onUnauthorized(message);
    throw new ApiError(res.status, message, data?.errors);
  }
  return data;
}

export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  summary: () => request("/dashboard/summary"),
  listApplications: () => request("/loan-applications"),
  getApplication: (id) => request(`/loan-applications/${id}`),
  createApplication: (body) => request("/loan-applications", { method: "POST", body }),
  revealIdentifiers: (id) => request(`/loan-applications/${id}/sensitive-data/reveal`, { method: "POST" }),
  listUsers: () => request("/admin/users"),
  createUser: (body) => request("/admin/users", { method: "POST", body }),
  updateUser: (id, body) => request(`/admin/users/${id}`, { method: "PATCH", body }),
  approve: (id) => request(`/loan-applications/${id}/approve`, { method: "PATCH" }),
  score: (id) => request(`/loan-applications/${id}/score`, { method: "POST" }),
};

export const vnd = (n) => (n == null ? "-" : `${Number(n).toLocaleString("en-US")} VND`);
