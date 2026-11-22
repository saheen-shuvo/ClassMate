const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const authRequest = async (path, options = {}) => {
  const response = await fetch(`${API_URL}/api/auth${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  let data = {};
  try {
    data = await response.json();
  } catch {}

  if (!response.ok) throw new Error(data.message || "Authentication request failed.");
  return data;
};

export const registerUser = (payload) =>
  authRequest("/register", { method: "POST", body: JSON.stringify(payload) });

export const loginUser = (payload) =>
  authRequest("/login", { method: "POST", body: JSON.stringify(payload) });

export const getCurrentUser = () => authRequest("/me");

export const logoutUser = () =>
  authRequest("/logout", { method: "POST", body: "{}" });

export const updateProfile = (payload) =>
  authRequest("/profile", { method: "PATCH", body: JSON.stringify(payload) });

export const dashboardForRole = (role) => ({
  student: "/dashboard/student",
  cr: "/dashboard/cr",
  faculty: "/dashboard/faculty",
  admin: "/dashboard/admin",
}[role] || "/login");

export const getAdminOverview = () =>
  authRequestFromAdmin("/overview");

export const getAdminUsers = () =>
  authRequestFromAdmin("/users");

export const createAdminUser = (payload) =>
  authRequestFromAdmin("/users", { method: "POST", body: JSON.stringify(payload) });

export const updateAdminUser = (id, payload) =>
  authRequestFromAdmin(`/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) });

const authRequestFromAdmin = async (path, options = {}) => {
  const response = await fetch(`${API_URL}/api/admin${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.message || "Admin request failed.");
  return data;
};
