/**
 * Portuguese-Brazilian (PT-BR) translation file for the Arbitrage Scanner application.
 * Contains all user-facing strings organized by feature area.
 */

// ── Navigation sidebar and top-bar labels ──────────────────────────
var nav = {
  // Main dashboard menu items
  dashboards: {
    dashboards: "Dashboards",
    scanner: "Scanner",
    monitoramento: "Monitoramento",
    lancamentos: "Lançamentos",
    home: "Home",
    plans: "Planos",
    auth: "Autenticação",
    users: "Usuários",
    licenses: "Licenças",
    payments: "Pagamentos",
    operacoes: "Operações",
    coins: "Moedas",
  },
  // Settings sub-menu inside the navigation
  settings: {
    settings: "Configurações",
    general: "Geral",
    appearance: "Aparência",
  },
};

// ── Arbitrage Scanner page ─────────────────────────────────────────
var scanner = {
  title: "Scanner de Arbitragem",
  subtitle: "Scanner de oportunidades",
  search: "Pesquisar moeda ou exchange ...",
  filters: "Filtros",
  spreadMin: "Spread mínimo (%)",
  volumeMin: "Volume mínimo (USDT)",
  liquidityMin: "Liquidez Mínima (USD)",
  invertedMin: "Qtd. mínima de invertidas",
  buyExchange: "Selecione corretoras de compra",
  sellExchange: "Selecione corretoras de venda",
  oppTypes: "Tipos de oportunidade",
  spotFutures: "Spot x Futuro",
  futuresFutures: "Futuro x Futuro",
  all: "Todas",
  spot: "Spot",
  futures: "Futuro",
  buy: "Compra",
  sell: "Venda",
  entrySpread: "% alvo de entrada",
  exitSpread: "% alvo saída",
  save: "Salvar no Monitoramento",
  openExchanges: "Abrir exchanges",
  share: "Compartilhar no Discord",
  fundingRate: "Funding Rate",
};

// ── Monitoring / watchlist panel ───────────────────────────────────
var monitor = {
  title: "Painel de Monitoramento",
  subtitle: "Monitoramento de Moedas",
};

// ── Shared / reusable UI labels ────────────────────────────────────
var common = {
  search: "Pesquisar...",
  save: "Salvar",
  cancel: "Cancelar",
  delete: "Excluir",
  edit: "Editar",
  close: "Fechar",
  total: "Total",
  clear: "Limpar campos",
};

// ── Authentication screens (login, register, password reset) ───────
var auth = {
  login: "Login",
  register: "Cadastro",
  password: "Senha",
  username: "Usuário",
  email: "E-mail",
  rememberMe: "Lembrar-me",
  forgotPassword: "Esqueceu a senha",
  resetPassword: "Redefinir senha",
};

// ── Settings / preferences page ────────────────────────────────────
var settings = {
  title: "Configurações",
  general: "Geral",
  appearance: "Aparência",
  dark: "Escuro",
  light: "Claro",
  language: "Português (Brasil)",
};

// ── Notification center ────────────────────────────────────────────
var notifications = {
  title: "Notificações",
  unread: "Nao lidas",
  updates: "Atualizações",
  alerts: "Alertas",
};

// ── Finance / billing dashboard ────────────────────────────────────
var finance = {
  title: "Financeiro Dashboard",
  plans: "Meus Planos",
  payments: "Pagamentos",
  licenses: "Licenças",
};

// ── Combined translations object with all sections + connection status strings ──
var translations = {
  nav: nav,
  scanner: scanner,
  monitor: monitor,
  common: common,
  auth: auth,
  settings: settings,
  notifications: notifications,
  finance: finance,

  // WebSocket / connection status indicators
  connecting: "Conectando",
  error: "Erro",
  idle: "Inativo",
  open: "Aberto",
};

export {
  auth,
  common,
  translations as default,
  finance,
  monitor,
  nav,
  notifications,
  scanner,
  settings,
};
