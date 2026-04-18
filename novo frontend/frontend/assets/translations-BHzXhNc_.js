/**
 * English (EN) translation file for the Arbitrage Scanner application.
 * Contains all user-facing strings organized by feature area.
 */
const translations = {

  // ── Navigation sidebar and top-bar labels ──────────────────────────
  nav: {
    // Main dashboard menu items
    dashboards: {
      dashboards: "Dashboards",
      scanner: "Scanner",
      monitoramento: "Monitoring",
      lancamentos: "Releases",
      home: "Home",
      plans: "Plans",
      auth: "Authentication",
      users: "Users",
      licenses: "Licenses",
      payments: "Payments",
      operacoes: "Operations",
      coins: "Coins",
    },
    // Settings sub-menu inside the navigation
    settings: {
      settings: "Settings",
      general: "General",
      appearance: "Appearance",
    },
  },

  // ── WebSocket / connection status indicators ───────────────────────
  connecting: "Connecting",
  error: "Error",
  idle: "Idle",
  open: "Open",

  // ── Arbitrage Scanner page ─────────────────────────────────────────
  scanner: {
    title: "Arbitrage Scanner",
    subtitle: "Opportunity Scanner",
    search: "Search coin or exchange...",
    filters: "Filters",
    spreadMin: "Minimum spread (%)",
    volumeMin: "Minimum volume (USDT)",
    liquidityMin: "Minimum Liquidity (USD)",
    invertedMin: "Min. inversions count",
    buyExchange: "Select buy exchanges",
    sellExchange: "Select sell exchanges",
    oppTypes: "Opportunity types",
    spotFutures: "Spot x Futures",
    futuresFutures: "Futures x Futures",
    all: "All",
    spot: "Spot",
    futures: "Futures",
    buy: "Buy",
    sell: "Sell",
    entrySpread: "% entry target",
    exitSpread: "% exit target",
    save: "Save to Monitoring",
    openExchanges: "Open exchanges",
    share: "Share on Discord",
    fundingRate: "Funding Rate",
  },

  // ── Monitoring / watchlist panel ───────────────────────────────────
  monitor: {
    title: "Monitoring Panel",
    subtitle: "Coin Monitoring",
  },

  // ── Shared / reusable UI labels ────────────────────────────────────
  common: {
    search: "Search...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    total: "Total",
    clear: "Clear fields",
  },

  // ── Authentication screens (login, register, password reset) ───────
  auth: {
    login: "Login",
    register: "Register",
    password: "Password",
    username: "Username",
    email: "Email",
    rememberMe: "Remember me",
    forgotPassword: "Forgot password",
    resetPassword: "Reset password",
  },

  // ── Settings / preferences page ────────────────────────────────────
  settings: {
    title: "Settings",
    general: "General",
    appearance: "Appearance",
    dark: "Dark",
    light: "Light",
    language: "English",
  },

  // ── Notification center ────────────────────────────────────────────
  notifications: {
    title: "Notifications",
    unread: "Unread",
    updates: "Updates",
    alerts: "Alerts",
  },

  // ── Finance / billing dashboard ────────────────────────────────────
  finance: {
    title: "Finance Dashboard",
    plans: "My Plans",
    payments: "Payments",
    licenses: "Licenses",
  },
};
export default translations;
