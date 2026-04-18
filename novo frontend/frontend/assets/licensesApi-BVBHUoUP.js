/* ========================================
 * Licenses API Module
 * Endpoints: /finance/licences
 *
 * Provides CRUD operations for license
 * management and lookup helpers for
 * license type/status labels.
 * ======================================== */

/* ---- API Configuration ---- */

const FINANCE_API_BASE_URL = "http://localhost:8000".replace(/\/$/, "");

/* ---- Authentication Helpers ---- */

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/* ---- Core Fetch Wrapper ---- */

/**
 * Sends an authenticated request to the Finance API.
 * Automatically attaches auth headers, parses JSON,
 * and throws on non-2xx responses with the server message.
 */
async function fetchFinanceApi(endpoint, options) {
  if (!FINANCE_API_BASE_URL)
    throw new Error("Finance API base URL is not configured.");

  const response = await fetch(`${FINANCE_API_BASE_URL}${endpoint}`, {
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

/* ---- Response Extraction Helpers ---- */

/**
 * Extrai array de uma resposta da API.
 * Handles varying response shapes: raw array, or object
 * with items/data/licenses/licences fields.
 */
const extractArray = (responseData) => {
  if (Array.isArray(responseData)) return responseData;
  if (responseData && typeof responseData == "object") {
    const knownFields = ["items", "data", "licenses", "licences"];
    for (const field of knownFields) {
      const fieldValue = responseData[field];
      if (Array.isArray(fieldValue)) return fieldValue;
      if (fieldValue && typeof fieldValue == "object") {
        const nestedItems = fieldValue.items;
        if (Array.isArray(nestedItems)) return nestedItems;
      }
    }
  }
  return [];
};

/**
 * Extrai item unico de uma resposta da API.
 * Unwraps { item: {...} } or { data: {...} } envelopes,
 * or returns the response object as-is.
 */
const extractItem = (responseData) => {
  if (!responseData || typeof responseData != "object") return null;
  if (
    "item" in responseData &&
    responseData.item &&
    typeof responseData.item == "object"
  )
    return responseData.item;
  if (
    "data" in responseData &&
    responseData.data &&
    typeof responseData.data == "object"
  )
    return responseData.data;
  return responseData;
};

/* ---- License Type & Status Options ---- */

const LICENSE_TYPE_OPTIONS = [
  { value: 1, label: "Spot" },
  { value: 2, label: "Futuro" },
  { value: 3, label: "Robo" },
  { value: 4, label: "Teste futuros" },
];

const LICENSE_STATUS_OPTIONS = [
  { value: "active", label: "Ativa" },
  { value: "expired", label: "Expirada" },
];

/**
 * Retorna o label legivel para um tipo de licenca.
 */
const getLicenseTypeLabel = (typeValue) => {
  return (
    LICENSE_TYPE_OPTIONS.find((option) => option.value === typeValue)?.label ??
    "Tipo desconhecido"
  );
};

/* ---- CRUD Endpoints ---- */

const LICENSES_ENDPOINT = "/finance/licences";

/**
 * Fetches all licenses from the server.
 * Returns an array of license objects.
 */
async function getLicenses() {
  const responseData = await fetchFinanceApi(LICENSES_ENDPOINT);
  return extractArray(responseData);
}

/**
 * Creates a new license on the server.
 * Returns the newly created license object.
 */
async function createLicense(licenseData) {
  const responseData = await fetchFinanceApi(LICENSES_ENDPOINT, {
    method: "POST",
    body: JSON.stringify(licenseData),
  });
  return extractItem(responseData);
}

/**
 * Updates an existing license by ID.
 * Uses PATCH for partial updates.
 * Returns the updated license object.
 */
async function updateLicense(licenseId, licenseData) {
  const responseData = await fetchFinanceApi(`${LICENSES_ENDPOINT}/${licenseId}`, {
    method: "PATCH",
    body: JSON.stringify(licenseData),
  });
  return extractItem(responseData);
}

/**
 * Deletes a license by ID.
 */
async function deleteLicense(licenseId) {
  return fetchFinanceApi(`${LICENSES_ENDPOINT}/${licenseId}`, {
    method: "DELETE",
  });
}

/* ---- Module Exports ---- */

export {
  LICENSE_STATUS_OPTIONS as L,
  LICENSE_TYPE_OPTIONS as a,
  createLicense as c,
  deleteLicense as d,
  getLicenses as f,
  getLicenseTypeLabel as g,
  updateLicense as u,
};
