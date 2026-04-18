/* ========================================
 * Auth API Module
 * Endpoints: /auth/roles, /auth/permissions, /auth/users
 * ======================================== */

const AUTH_API_BASE_URL = "http://localhost:8000".replace(/\/$/, "");

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function fetchAuthApi(endpoint, options) {
  if (!AUTH_API_BASE_URL)
    throw new Error("Auth API base URL is not configured.");

  const response = await fetch(`${AUTH_API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options?.headers || {}),
    },
  });

  const rawText = await response.text();
  let parsed = rawText;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {}

  if (!response.ok) {
    const errorMessage =
      (parsed &&
        typeof parsed == "object" &&
        ("message" in parsed
          ? parsed.message
          : "error" in parsed
            ? parsed.error
            : null)) ||
      rawText ||
      "Request failed";
    const error = new Error(
      typeof errorMessage == "string" ? errorMessage : "Request failed",
    );
    throw ((error.status = response.status), error);
  }

  return parsed ?? {};
}

/**
 * Extrai array de uma resposta da API, tentando campos conhecidos.
 */
const extractArray = (responseData) => {
  if (Array.isArray(responseData)) return responseData;
  if (responseData && typeof responseData == "object") {
    const knownFields = ["items", "data", "roles", "permissions", "users"];
    for (const field of knownFields) {
      const value = responseData[field];
      if (Array.isArray(value)) return value;
    }
  }
  return [];
};

/* ---- Roles CRUD ---- */

async function getRoles() {
  const data = await fetchAuthApi("/auth/roles");
  return extractArray(data);
}

async function createRole(roleData) {
  return fetchAuthApi("/auth/roles", {
    method: "POST",
    body: JSON.stringify(roleData),
  });
}

async function updateRole(roleId, roleData) {
  return fetchAuthApi(`/auth/roles/${roleId}`, {
    method: "PUT",
    body: JSON.stringify(roleData),
  });
}

async function deleteRole(roleId) {
  return fetchAuthApi(`/auth/roles/${roleId}`, {
    method: "DELETE",
  });
}

/* ---- Permissions CRUD ---- */

async function getPermissions() {
  const data = await fetchAuthApi("/auth/permissions");
  return extractArray(data);
}

async function createPermission(permissionData) {
  return fetchAuthApi("/auth/permissions", {
    method: "POST",
    body: JSON.stringify(permissionData),
  });
}

async function updatePermission(permissionId, permissionData) {
  return fetchAuthApi(`/auth/permissions/${permissionId}`, {
    method: "PUT",
    body: JSON.stringify(permissionData),
  });
}

async function deletePermission(permissionId) {
  return fetchAuthApi(`/auth/permissions/${permissionId}`, {
    method: "DELETE",
  });
}

/* ---- Role Permissions ---- */

async function getRolePermissions(roleId) {
  const data = await fetchAuthApi(`/auth/roles/${roleId}/permissions`);
  return extractArray(data);
}

async function addRolePermission(roleId, permissionId) {
  return fetchAuthApi(`/auth/roles/${roleId}/permissions`, {
    method: "POST",
    body: JSON.stringify({ permissionId }),
  });
}

async function removeRolePermission(roleId, permissionId) {
  return fetchAuthApi(`/auth/roles/${roleId}/permissions/${permissionId}`, {
    method: "DELETE",
  });
}

/* ---- Users CRUD ---- */

async function getUsers() {
  const data = await fetchAuthApi("/auth/users");
  return extractArray(data);
}

async function filterUsers(filterCriteria) {
  const data = await fetchAuthApi("/auth/users/filter", {
    method: "POST",
    body: JSON.stringify(filterCriteria),
  });
  return extractArray(data);
}

async function createUser(userData) {
  return fetchAuthApi("/auth/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

async function updateUser(userId, userData) {
  return fetchAuthApi(`/auth/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(userData),
  });
}

async function deleteUser(userId) {
  return fetchAuthApi(`/auth/users/${userId}`, {
    method: "DELETE",
  });
}

/* ---- User Roles ---- */

async function getUserRoles(userId) {
  const data = await fetchAuthApi(`/auth/users/${userId}/roles`);
  return extractArray(data);
}

async function addUserRole(userId, roleId) {
  return fetchAuthApi(`/auth/users/${userId}/roles`, {
    method: "POST",
    body: JSON.stringify({ roleId }),
  });
}

async function removeUserRole(userId, roleId) {
  return fetchAuthApi(`/auth/users/${userId}/roles/${roleId}`, {
    method: "DELETE",
  });
}

/* ---- User Permissions ---- */

async function getUserPermissions(userId) {
  const data = await fetchAuthApi(`/auth/users/${userId}/permissions`);
  return extractArray(data);
}

async function addUserPermission(userId, permissionId) {
  return fetchAuthApi(`/auth/users/${userId}/permissions`, {
    method: "POST",
    body: JSON.stringify({ permissionId }),
  });
}

async function removeUserPermission(userId, permissionId) {
  return fetchAuthApi(`/auth/users/${userId}/permissions/${permissionId}`, {
    method: "DELETE",
  });
}

/* ---- Exports (nomes devem ser mantidos para compatibilidade entre modulos) ---- */
export {
  getPermissions as a,
  updatePermission as b,
  createRole as c,
  deleteRole as d,
  createPermission as e,
  getRoles as f,
  deletePermission as g,
  getRolePermissions as h,
  removeRolePermission as i,
  getUsers as j,
  updateUser as k,
  addRolePermission as l,
  createUser as m,
  deleteUser as n,
  getUserRoles as o,
  getUserPermissions as p,
  removeUserRole as q,
  addUserRole as r,
  removeUserPermission as s,
  addUserPermission as t,
  updateRole as u,
  filterUsers as v,
};
