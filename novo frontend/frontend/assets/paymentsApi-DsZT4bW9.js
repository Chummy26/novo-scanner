/* ========================================
 * Payments API Module
 * Endpoints: /finance/payments
 * ======================================== */

/* ---- Configuration ---- */

const FINANCE_API_BASE_URL = "http://localhost:8000".replace(/\/$/, "");

/* ---- Authentication Helpers ---- */

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/* ---- Core HTTP Client ---- */

/**
 * Performs an authenticated fetch against the Finance API.
 * Parses JSON responses and extracts error messages on failure.
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

/* ---- Response Extraction Utilities ---- */

/**
 * Extrai array de uma resposta da API.
 * Checks top-level keys "items", "data", "payments" and nested .items.
 */
const extractArray = (responseData) => {
  if (Array.isArray(responseData)) return responseData;
  if (responseData && typeof responseData == "object") {
    const knownFields = ["items", "data", "payments"];
    for (const fieldName of knownFields) {
      const fieldValue = responseData[fieldName];
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
 * Unwraps "item" or "data" wrappers, or returns the object as-is.
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

/* ---- Payment Status Options ---- */

const PAYMENT_STATUS_OPTIONS = [
  { value: "approved_release", label: "Aprovado (libera)" },
  { value: "approved_no_release", label: "Aprovado (sem liberar)" },
  { value: "pending", label: "Pendente" },
  { value: "canceled", label: "Cancelado" },
];

/* ---- Payment Method Options ---- */

const PAYMENT_METHOD_OPTIONS = [
  { value: "pix_manual", label: "Pix manual" },
  { value: "transfer", label: "Transfer\u00EAncia" },
  { value: "card", label: "Cart\u00E3o" },
  { value: "mercado_pago", label: "Mercado Pago" },
  { value: "other", label: "Outro" },
];

/* ---- Currency Options ---- */

const CURRENCY_OPTIONS = [
  { value: "USDT", label: "USDT" },
  { value: "BRL", label: "BRL" },
  { value: "EUR", label: "EUR" },
];

/* ---- Label Lookup Helpers ---- */

/**
 * Retorna o label legivel para um status de pagamento.
 */
const getStatusLabel = (statusValue) => {
  return (
    PAYMENT_STATUS_OPTIONS.find((option) => option.value === statusValue)?.label ??
    statusValue ??
    "-"
  );
};

/**
 * Retorna o label legivel para um metodo de pagamento.
 */
const getMethodLabel = (methodValue) => {
  return (
    PAYMENT_METHOD_OPTIONS.find((option) => option.value === methodValue)?.label ??
    methodValue ??
    "-"
  );
};

/* ---- CRUD Endpoints ---- */

const PAYMENTS_ENDPOINT = "/finance/payments";

/**
 * Fetches all payments from the API.
 */
async function getPayments() {
  const responseData = await fetchFinanceApi(PAYMENTS_ENDPOINT);
  return extractArray(responseData);
}

/**
 * Creates a new payment record.
 */
async function createPayment(paymentData) {
  const responseData = await fetchFinanceApi(PAYMENTS_ENDPOINT, {
    method: "POST",
    body: JSON.stringify(paymentData),
  });
  return extractItem(responseData);
}

/**
 * Updates an existing payment by ID (partial update via PATCH).
 */
async function updatePayment(paymentId, paymentData) {
  const responseData = await fetchFinanceApi(`${PAYMENTS_ENDPOINT}/${paymentId}`, {
    method: "PATCH",
    body: JSON.stringify(paymentData),
  });
  return extractItem(responseData);
}

/**
 * Deletes a payment by ID.
 */
async function deletePayment(paymentId) {
  return fetchFinanceApi(`${PAYMENTS_ENDPOINT}/${paymentId}`, {
    method: "DELETE",
  });
}

/* ---- Module Exports ---- */

export {
  CURRENCY_OPTIONS as C,
  PAYMENT_STATUS_OPTIONS as P,
  PAYMENT_METHOD_OPTIONS as a,
  getMethodLabel as b,
  createPayment as c,
  deletePayment as d,
  getPayments as f,
  getStatusLabel as g,
  updatePayment as u,
};
