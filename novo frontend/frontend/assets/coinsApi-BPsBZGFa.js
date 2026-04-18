/* ========================================
 * Coins / Catalog API Module
 * Endpoints: /catalog/coins
 * ======================================== */

/* ---- Configuration ---- */

const CATALOG_API_BASE_URL = "http://localhost:8000".replace(/\/$/, "");

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
 * Performs an authenticated fetch against the Catalog API.
 * Parses the response as JSON, extracts an error message on
 * non-2xx status codes, and throws with `error.status` attached.
 */
async function fetchCatalogApi(endpoint, options) {
  if (!CATALOG_API_BASE_URL)
    throw new Error("Catalog API base URL is not configured.");

  const response = await fetch(`${CATALOG_API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options?.headers || {}),
    },
  });

  const rawText = await response.text();
  let parsedBody = rawText;
  try {
    parsedBody = rawText ? JSON.parse(rawText) : null;
  } catch {}

  if (!response.ok) {
    const errorMessage =
      (parsedBody &&
        typeof parsedBody == "object" &&
        ("message" in parsedBody
          ? parsedBody.message
          : "error" in parsedBody
            ? parsedBody.error
            : null)) ||
      rawText ||
      "Request failed";
    const error = new Error(
      typeof errorMessage == "string" ? errorMessage : "Request failed",
    );
    throw ((error.status = response.status), error);
  }

  return parsedBody ?? {};
}

/* ---- Response Extraction Utilities ---- */

/**
 * Extracts an array from an API response by trying known wrapper
 * fields: "items", "data", "coins" (including nested .items).
 */
const extractArray = (responseData) => {
  if (Array.isArray(responseData)) return responseData;
  if (responseData && typeof responseData == "object") {
    const knownFields = ["items", "data", "coins"];
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
 * Extracts a single item from an API response, unwrapping
 * "item" or "data" envelope objects if present.
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

/* ---- Coins CRUD Operations ---- */

const COINS_ENDPOINT = "/catalog/coins";

/**
 * In-flight promise cache for getCoinNames to avoid duplicate
 * concurrent requests. Cleared once the request settles.
 */
let coinNamesPromiseCache = null;

/**
 * Lists coins with pagination and filters.
 * @param {Object} params - { page, limit, search, status, sort_by, sort_dir }
 * @returns {{ data: Array, meta: { total: number, page: number, limit: number } }}
 */
async function getCoins(params) {
  const queryParams = new URLSearchParams();
  if (params) {
    params.page && queryParams.append("page", params.page.toString());
    params.limit && queryParams.append("limit", params.limit.toString());
    params.search && queryParams.append("search", params.search);
    params.status !== void 0 &&
      queryParams.append("status", String(params.status));
    params.sort_by && queryParams.append("sort_by", params.sort_by);
    params.sort_dir && queryParams.append("sort_dir", params.sort_dir);
  }

  const queryString = queryParams.toString();
  const requestUrl = queryString
    ? `${COINS_ENDPOINT}?${queryString}`
    : COINS_ENDPOINT;
  const responseData = await fetchCatalogApi(requestUrl);

  let coins = [];
  let paginationMeta = { total: 0, page: 1, limit: 10 };

  if (Array.isArray(responseData)) {
    coins = responseData;
    paginationMeta.total = responseData.length;
  } else if (responseData && typeof responseData == "object") {
    coins = extractArray(responseData);
    if ("meta" in responseData && responseData.meta) {
      paginationMeta = responseData.meta;
    } else if ("total" in responseData) {
      paginationMeta.total = Number(responseData.total) || coins.length;
    } else {
      paginationMeta.total = coins.length;
    }
  }

  return { data: coins, meta: paginationMeta };
}

/**
 * Creates a new coin entry.
 * @param {Object} coinData - Coin fields to create
 * @returns {Object} The created coin record
 */
async function createCoin(coinData) {
  const responseData = await fetchCatalogApi(COINS_ENDPOINT, {
    method: "POST",
    body: JSON.stringify(coinData),
  });
  return extractItem(responseData);
}

/**
 * Updates an existing coin by ID (partial update via PATCH).
 * @param {string|number} coinId - ID of the coin to update
 * @param {Object} coinData - Fields to patch
 * @returns {Object} The updated coin record
 */
async function updateCoin(coinId, coinData) {
  const responseData = await fetchCatalogApi(`${COINS_ENDPOINT}/${coinId}`, {
    method: "PATCH",
    body: JSON.stringify(coinData),
  });
  return extractItem(responseData);
}

/**
 * Deletes a coin by ID.
 * @param {string|number} coinId - ID of the coin to delete
 */
async function deleteCoin(coinId) {
  return fetchCatalogApi(`${COINS_ENDPOINT}/${coinId}`, {
    method: "DELETE",
  });
}

/* ---- Coin Supplementary Data ---- */

/**
 * Fetches the raw / unprocessed data blob for a specific coin.
 * @param {string|number} coinId - ID of the coin
 */
async function getCoinRawData(coinId) {
  return fetchCatalogApi(`${COINS_ENDPOINT}/${coinId}/raw-data`);
}

/**
 * Returns a list of all coin names (string[]). The result is cached
 * for the duration of the in-flight request to deduplicate concurrent
 * callers; the cache is cleared once the promise settles.
 * @returns {{ data: string[] }}
 */
async function getCoinNames() {
  if (coinNamesPromiseCache) return coinNamesPromiseCache;

  const namesPromise = fetchCatalogApi(`${COINS_ENDPOINT}/names`)
    .then((responseData) => {
      return {
        data: Array.isArray(responseData)
          ? responseData.map((entry) => String(entry))
          : Array.isArray(responseData?.data)
            ? responseData.data.map((entry) => String(entry))
            : [],
      };
    })
    .finally(() => {
      if (coinNamesPromiseCache === namesPromise) {
        coinNamesPromiseCache = null;
      }
    });

  coinNamesPromiseCache = namesPromise;
  return namesPromise;
}

/* ---- Exports ---- */

export {
  getCoinRawData as a,
  getCoins as b,
  createCoin as c,
  deleteCoin as d,
  getCoinNames as f,
  updateCoin as u,
};
