/**
 * Textos visibles.
 *
 * Los textos para el usuario viven aquí, nunca escritos dentro de un componente
 * (docs/engineering.md §3.4.2). En español (es-BO), inglés y portugués (MM-172).
 */
import { byLocale } from "./locale";

const es = {
  appName: "MoneyMap",
  appDescription: "Registra tus gastos e ingresos en segundos y ve hacia dónde va tu dinero.",
  loading: "Cargando…",
  nav: {
    menu: "Menú",
    map: "Map",
    transactions: "Movimientos",
    goals: "Metas",
    scenarios: "Escenarios",
    reports: "Resúmenes",
    accounts: "Cuentas",
    categories: "Categorías",
    settings: "Ajustes",
    add: "Registrar movimiento",
    notifications: "Avisos",
    allScreens: "Todas las pantallas",
    closeMenu: "Cerrar el menú",
    budgets: "Presupuestos",
    moneyFlow: "Money Flow",
    moneyStory: "Money Story",
    safeToSpend: "Safe to Spend",
    forecast: "Forecast",
    recurringIncome: "Ingresos fijos",
    recurringExpenses: "Gastos fijos",
    transfer: "Transferir",
    plans: "Planes",
    groups: {
      daily: "Tu día a día",
      plan: "Planear",
      reports: "Resúmenes",
      account: "Tu cuenta",
      admin: "Administración",
    },
    adminPlans: "Panel de planes",
  },
  map: {
    greeting: (name: string) => `Hola, ${name}`,
  },
  status: {
    notFound: {
      code: "Error 404",
      title: "Esta página no existe",
      body: "Puede que el enlace esté mal escrito o que la página se haya movido.",
      home: "Ir al Map",
      back: "Volver",
    },
    error: {
      title: "Algo salió mal",
      body: "Tuvimos un problema al mostrar esta pantalla. Tus datos están a salvo.",
      retry: "Reintentar",
      home: "Ir al Map",
      reference: (id: string) => `Referencia: ${id}`,
    },
    unavailable: {
      title: "MoneyMap no responde",
      body: "No pudimos conectar con nuestro servidor. Puede estar en mantenimiento: vuelve a intentar en unos minutos.",
      retry: "Reintentar",
    },
  },
  offline: {
    title: "Sin conexión",
    body: "No pudimos llegar a MoneyMap. Revisa tu conexión y vuelve a intentar.",
    retry: "Reintentar",
  },
};

const en: typeof es = {
  appName: "MoneyMap",
  appDescription: "Log your expenses and income in seconds and see where your money goes.",
  loading: "Loading…",
  nav: {
    menu: "Menu",
    map: "Map",
    transactions: "Transactions",
    goals: "Goals",
    scenarios: "Scenarios",
    reports: "Summaries",
    accounts: "Accounts",
    categories: "Categories",
    settings: "Settings",
    add: "Add transaction",
    notifications: "Notifications",
    allScreens: "All screens",
    closeMenu: "Close the menu",
    budgets: "Budgets",
    moneyFlow: "Money Flow",
    moneyStory: "Money Story",
    safeToSpend: "Safe to Spend",
    forecast: "Forecast",
    recurringIncome: "Fixed income",
    recurringExpenses: "Fixed expenses",
    transfer: "Transfer",
    plans: "Plans",
    groups: {
      daily: "Day to day",
      plan: "Plan",
      reports: "Summaries",
      account: "Your account",
      admin: "Administration",
    },
    adminPlans: "Plans panel",
  },
  map: {
    greeting: (name: string) => `Hi, ${name}`,
  },
  status: {
    notFound: {
      code: "Error 404",
      title: "This page doesn't exist",
      body: "The link may be mistyped or the page may have moved.",
      home: "Go to the Map",
      back: "Go back",
    },
    error: {
      title: "Something went wrong",
      body: "We had a problem showing this screen. Your data is safe.",
      retry: "Try again",
      home: "Go to the Map",
      reference: (id: string) => `Reference: ${id}`,
    },
    unavailable: {
      title: "MoneyMap isn't responding",
      body: "We couldn't reach our server. It may be under maintenance: try again in a few minutes.",
      retry: "Try again",
    },
  },
  offline: {
    title: "You're offline",
    body: "We couldn't reach MoneyMap. Check your connection and try again.",
    retry: "Try again",
  },
};

const pt: typeof es = {
  appName: "MoneyMap",
  appDescription:
    "Registre seus gastos e receitas em segundos e veja para onde vai o seu dinheiro.",
  loading: "Carregando…",
  nav: {
    menu: "Menu",
    map: "Map",
    transactions: "Movimentações",
    goals: "Metas",
    scenarios: "Cenários",
    reports: "Resumos",
    accounts: "Contas",
    categories: "Categorias",
    settings: "Ajustes",
    add: "Registrar movimentação",
    notifications: "Avisos",
    allScreens: "Todas as telas",
    closeMenu: "Fechar o menu",
    budgets: "Orçamentos",
    moneyFlow: "Money Flow",
    moneyStory: "Money Story",
    safeToSpend: "Safe to Spend",
    forecast: "Forecast",
    recurringIncome: "Receitas fixas",
    recurringExpenses: "Gastos fixos",
    transfer: "Transferir",
    plans: "Planos",
    groups: {
      daily: "Seu dia a dia",
      plan: "Planejar",
      reports: "Resumos",
      account: "Sua conta",
      admin: "Administração",
    },
    adminPlans: "Painel de planos",
  },
  map: {
    greeting: (name: string) => `Olá, ${name}`,
  },
  status: {
    notFound: {
      code: "Erro 404",
      title: "Esta página não existe",
      body: "O link pode estar errado ou a página pode ter mudado de lugar.",
      home: "Ir para o Map",
      back: "Voltar",
    },
    error: {
      title: "Algo deu errado",
      body: "Tivemos um problema ao mostrar esta tela. Seus dados estão seguros.",
      retry: "Tentar de novo",
      home: "Ir para o Map",
      reference: (id: string) => `Referência: ${id}`,
    },
    unavailable: {
      title: "O MoneyMap não responde",
      body: "Não conseguimos conectar ao nosso servidor. Pode estar em manutenção: tente de novo em alguns minutos.",
      retry: "Tentar de novo",
    },
  },
  offline: {
    title: "Sem conexão",
    body: "Não conseguimos chegar ao MoneyMap. Verifique sua conexão e tente de novo.",
    retry: "Tentar de novo",
  },
};

export const commonMessages = byLocale({ es, en, pt });
