// Central API client. Reads base URL from Vite env (VITE_API_URL).
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getToken() {
  return window.__kwasu_token || null;
}
export function setToken(t) {
  window.__kwasu_token = t;
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && getToken()) headers["Authorization"] = `Bearer ${getToken()}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  // auth
  registerStudent: (b) => request("/auth/register", { method: "POST", body: b, auth: false }),
  registerAdmin: (b) => request("/auth/register-admin", { method: "POST", body: b, auth: false }),
  login: (b) => request("/auth/login", { method: "POST", body: b, auth: false }),
  me: () => request("/auth/me"),
  saveProfile: (b) => request("/auth/profile", { method: "POST", body: b }),
  notifications: () => request("/auth/notifications"),

  // complaints
  submitComplaint: (text) => request("/complaints", { method: "POST", body: { text } }),
  feed: () => request("/complaints/feed"),
  myComplaints: () => request("/complaints/mine"),
  addComment: (cid, text) => request(`/complaints/${cid}/comments`, { method: "POST", body: { text } }),

  // admin
  pendingProfiles: () => request("/admin/profiles/pending"),
  approveProfile: (pid) => request(`/admin/profiles/${pid}/approve`, { method: "POST" }),
  rejectProfile: (pid, reason) => request(`/admin/profiles/${pid}/reject`, { method: "POST", body: { reason } }),
  banProfile: (pid) => request(`/admin/profiles/${pid}/ban`, { method: "POST" }),
  adminComplaints: () => request("/admin/complaints"),
  flaggedComplaints: () => request("/admin/complaints/flagged"),
  changeCategory: (cid, category) => request(`/admin/complaints/${cid}/category`, { method: "POST", body: { category } }),
  changeStatus: (cid, status) => request(`/admin/complaints/${cid}/status`, { method: "POST", body: { status } }),
  respond: (cid, response) => request(`/admin/complaints/${cid}/respond`, { method: "POST", body: { response } }),
  clearFlag: (cid) => request(`/admin/complaints/${cid}/clear-flag`, { method: "POST" }),
  confirmFlag: (cid) => request(`/admin/complaints/${cid}/confirm-flag`, { method: "POST" }),
  stats: () => request("/admin/stats"),
};
