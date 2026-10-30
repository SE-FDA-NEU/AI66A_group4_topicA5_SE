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
  409: "This conflicts with the current state of the application. Refresh the page and try again.",
  422: "Some of the information isn't valid. Check the highlighted fields and try again.",
  423: "This account is temporarily locked. Wait a few minutes and try again, or ask your manager for help.",
  429: "Too many requests. Wait a moment and try again.",
  500: "The server had a problem. Check the applications list before retrying to avoid a duplicate; if it continues, ask your manager for help.",
  503: "The service is temporarily unavailable. Wait a moment and try again.",
};

// Only network failures (status 0) and server errors are worth retrying as-is.
export const isRetryable = (err) => err?.status === 0 || err?.status >= 500;

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
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),
  editApplication: (id, body) => request(`/loan-applications/${id}`, { method: "PATCH", body }),
  cancelApplication: (id) => request(`/loan-applications/${id}/cancel`, { method: "PATCH" }),
  notifications: () => request("/notifications"),
  readNotification: (id) => request(`/notifications/${id}/read`, { method: "PATCH" }),
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
  scoreHistory: (id) => request(`/loan-applications/${id}/scores`),
  score: (id) => request(`/loan-applications/${id}/score`, { method: "POST" }),
};

export const vnd = (n) => (n == null ? "-" : `${Number(n).toLocaleString("en-US")} VND`);
