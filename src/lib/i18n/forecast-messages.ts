/** Textos de Forecast (spec 010 del back; mockups "Web-Forecast" y "Web-Forecast-B"), los de la app. */
import { byLocale } from "./locale";

const es = {
  eyebrow: "Map · Proyección",
  title: "Forecast",
  horizons: "Horizonte",
  days: (days: number) => `${days} días`,
  currency: "Moneda",
  today: "Hoy",
  onDate: (date: string) => `Al ${date} tendrás`,
  vsToday: (amount: string) => `${amount} vs hoy`,
  lowest: "Punto más bajo",
  chart: (today: string, d30: string, d60: string, d90: string) =>
    `Saldo proyectado: hoy ${today}, ${d30} a 30 días, ${d60} a 60 y ${d90} a 90`,
  assumptions: "De dónde sale",
  every30: "Cada 30 días",
  rows: {
    balance: "Tienes hoy",
    balanceSub: "Saldo de tus cuentas",
    income: "Ingresos fijos",
    incomeSub: "Los que vencen en los próximos 30 días",
    expenses: "Pagos fijos",
    expensesSub: "Los que vencen en los próximos 30 días",
    goals: "Metas",
    goalsSub: "Lo que apartas cada mes",
    variable: "Día a día",
    variableSub: (months: number) =>
      months === 0
        ? "Lo que va del mes, llevado a 30 días"
        : months === 1
          ? "Promedio de tu último mes"
          : `Promedio de tus últimos ${months} meses`,
  },
  footnote: "Estimación con tus promedios · no es una recomendación",
  goesNegative: (date: string) => `A este ritmo, tu saldo bajaría de cero cerca del ${date}.`,
  limitedHistory: "Todavía tienes poco historial: la estimación mejora con más movimientos.",
  noAccounts: "Agrega una cuenta para ver cómo va a estar tu saldo.",
  tryScenario: "Probar un escenario",
  error: "No pudimos calcular el Forecast.",
  retry: "Reintentar",
};

const en: typeof es = {
  eyebrow: "Map · Projection",
  title: "Forecast",
  horizons: "Horizon",
  days: (days: number) => `${days} days`,
  currency: "Currency",
  today: "Today",
  onDate: (date: string) => `On ${date} you'll have`,
  vsToday: (amount: string) => `${amount} vs today`,
  lowest: "Lowest point",
  chart: (today: string, d30: string, d60: string, d90: string) =>
    `Projected balance: today ${today}, ${d30} in 30 days, ${d60} in 60 and ${d90} in 90`,
  assumptions: "Where it comes from",
  every30: "Every 30 days",
  rows: {
    balance: "You have today",
    balanceSub: "Your accounts' balance",
    income: "Fixed income",
    incomeSub: "Due in the next 30 days",
    expenses: "Fixed payments",
    expensesSub: "Due in the next 30 days",
    goals: "Goals",
    goalsSub: "What you set aside each month",
    variable: "Day to day",
    variableSub: (months: number) =>
      months === 0
        ? "This month so far, scaled to 30 days"
        : months === 1
          ? "Average of your last month"
          : `Average of your last ${months} months`,
  },
  footnote: "Estimate from your averages · not a recommendation",
  goesNegative: (date: string) =>
    `At this pace, your balance would drop below zero around ${date}.`,
  limitedHistory:
    "You don't have much history yet: the estimate gets better with more transactions.",
  noAccounts: "Add an account to see how your balance will look.",
  tryScenario: "Try a scenario",
  error: "We couldn't calculate the Forecast.",
  retry: "Try again",
};

const pt: typeof es = {
  eyebrow: "Map · Projeção",
  title: "Forecast",
  horizons: "Horizonte",
  days: (days: number) => `${days} dias`,
  currency: "Moeda",
  today: "Hoje",
  onDate: (date: string) => `Em ${date} você terá`,
  vsToday: (amount: string) => `${amount} vs hoje`,
  lowest: "Ponto mais baixo",
  chart: (today: string, d30: string, d60: string, d90: string) =>
    `Saldo projetado: hoje ${today}, ${d30} em 30 dias, ${d60} em 60 e ${d90} em 90`,
  assumptions: "De onde vem",
  every30: "A cada 30 dias",
  rows: {
    balance: "Você tem hoje",
    balanceSub: "Saldo das suas contas",
    income: "Receitas fixas",
    incomeSub: "As que vencem nos próximos 30 dias",
    expenses: "Pagamentos fixos",
    expensesSub: "Os que vencem nos próximos 30 dias",
    goals: "Metas",
    goalsSub: "O que você separa todo mês",
    variable: "Dia a dia",
    variableSub: (months: number) =>
      months === 0
        ? "O que vai do mês, levado a 30 dias"
        : months === 1
          ? "Média do seu último mês"
          : `Média dos seus últimos ${months} meses`,
  },
  footnote: "Estimativa com suas médias · não é uma recomendação",
  goesNegative: (date: string) =>
    `Neste ritmo, seu saldo ficaria abaixo de zero por volta de ${date}.`,
  limitedHistory: "Você ainda tem pouco histórico: a estimativa melhora com mais movimentações.",
  noAccounts: "Adicione uma conta para ver como vai ficar seu saldo.",
  tryScenario: "Testar um cenário",
  error: "Não conseguimos calcular o Forecast.",
  retry: "Tentar de novo",
};

export const forecastMessagesByLocale = byLocale({ es, en, pt });
