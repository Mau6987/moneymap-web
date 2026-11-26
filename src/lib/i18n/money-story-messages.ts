/** Textos de Money Story (spec 006; mockups "Web-MoneyStory" y "Web-Resumen-Mes"), los de la app. */
import { byLocale } from "./locale";

const es = {
  title: "Money Story",
  heading: "Cómo te fue en el mes",
  previous: "Mes anterior",
  next: "Mes siguiente",
  empty: "Tu primera Money Story llega cuando cierre el mes.",
  emptyMonth: "Este mes no tuvo movimientos.",
  firstMonth: "Es tu primer mes en esta moneda: todavía no hay un mes anterior para comparar.",
  rate: "ahorro",
  rateLabel: (rate: string) => `Ahorraste el ${rate} de lo que entró`,
  income: "Ganaste",
  expense: "Gastaste",
  savings: "Ahorraste",
  deficit: "Saliste de más",
  mapEntry: "Cómo te fue el mes pasado",
  versus: (month: string) => `Vs. ${month}`,
  barsLabel: (before: string, now: string) => `Entró, salió y ahorro en ${before} y en ${now}`,
  savingsRow: "Ahorro",
  same: "= igual",
  topBefore: (category: string) => `Mayor gasto en el mes anterior · ${category}`,
  goalsBefore: "Aportes a metas en el mes anterior",
  highlights: "Lo que pasó",
  summary: (month: string, income: string, expense: string) =>
    `En ${month} entraron ${income} y salieron ${expense}.`,
  saved: (savings: string, rate: string) => `Ahorraste ${savings}: el ${rate} % de lo que entró.`,
  overspent: (deficit: string) =>
    `Salieron ${deficit} más de lo que entró. Aquí hay algo que quizás quieras mirar.`,
  balanced: "Salió lo mismo que entró.",
  topCategory: (category: string, amount: string) => `Tu mayor gasto fue ${category}: ${amount}.`,
  goalsContributed: (amount: string) => `Aportaste ${amount} a tus metas.`,
  incomeUp: (difference: string, month: string) => `Entraron ${difference} más que en ${month}.`,
  incomeDown: (difference: string, month: string) =>
    `Entraron ${difference} menos que en ${month}.`,
  incomeSame: (month: string) => `Entró lo mismo que en ${month}.`,
  savingsUp: (difference: string, month: string) => `Ahorraste ${difference} más que en ${month}.`,
  savingsDown: (difference: string, month: string) =>
    `Ahorraste ${difference} menos que en ${month}.`,
  savingsSame: (month: string) => `Ahorraste lo mismo que en ${month}.`,
  flowLink: "Ver a dónde fue en Money Flow",
  error: "No pudimos cargar tu Money Story",
  retry: "Reintentar",
};

const en: typeof es = {
  title: "Money Story",
  heading: "How your month went",
  previous: "Previous month",
  next: "Next month",
  empty: "Your first Money Story arrives when the month closes.",
  emptyMonth: "This month had no transactions.",
  firstMonth: "It's your first month in this currency: there's no previous month to compare yet.",
  rate: "saved",
  rateLabel: (rate: string) => `You saved ${rate} of what came in`,
  income: "You earned",
  expense: "You spent",
  savings: "You saved",
  deficit: "You went over",
  mapEntry: "How last month went",
  versus: (month: string) => `Vs. ${month}`,
  barsLabel: (before: string, now: string) => `In, out and saved in ${before} and in ${now}`,
  savingsRow: "Savings",
  same: "= same",
  topBefore: (category: string) => `Top expense last month · ${category}`,
  goalsBefore: "Goal contributions last month",
  highlights: "What happened",
  summary: (month: string, income: string, expense: string) =>
    `In ${month}, ${income} came in and ${expense} went out.`,
  saved: (savings: string, rate: string) => `You saved ${savings}: ${rate} % of what came in.`,
  overspent: (deficit: string) =>
    `${deficit} more went out than came in. There may be something here worth a look.`,
  balanced: "As much went out as came in.",
  topCategory: (category: string, amount: string) => `Your top expense was ${category}: ${amount}.`,
  goalsContributed: (amount: string) => `You contributed ${amount} to your goals.`,
  incomeUp: (difference: string, month: string) => `${difference} more came in than in ${month}.`,
  incomeDown: (difference: string, month: string) => `${difference} less came in than in ${month}.`,
  incomeSame: (month: string) => `The same came in as in ${month}.`,
  savingsUp: (difference: string, month: string) =>
    `You saved ${difference} more than in ${month}.`,
  savingsDown: (difference: string, month: string) =>
    `You saved ${difference} less than in ${month}.`,
  savingsSame: (month: string) => `You saved the same as in ${month}.`,
  flowLink: "See where it went in Money Flow",
  error: "We couldn't load your Money Story",
  retry: "Try again",
};

const pt: typeof es = {
  title: "Money Story",
  heading: "Como foi o seu mês",
  previous: "Mês anterior",
  next: "Próximo mês",
  empty: "Sua primeira Money Story chega quando o mês fechar.",
  emptyMonth: "Este mês não teve movimentações.",
  firstMonth: "É seu primeiro mês nesta moeda: ainda não há um mês anterior para comparar.",
  rate: "poupado",
  rateLabel: (rate: string) => `Você poupou ${rate} do que entrou`,
  income: "Você ganhou",
  expense: "Você gastou",
  savings: "Você poupou",
  deficit: "Você passou",
  mapEntry: "Como foi o mês passado",
  versus: (month: string) => `Vs. ${month}`,
  barsLabel: (before: string, now: string) => `Entrou, saiu e poupança em ${before} e em ${now}`,
  savingsRow: "Poupança",
  same: "= igual",
  topBefore: (category: string) => `Maior gasto no mês anterior · ${category}`,
  goalsBefore: "Contribuições para metas no mês anterior",
  highlights: "O que aconteceu",
  summary: (month: string, income: string, expense: string) =>
    `Em ${month} entraram ${income} e saíram ${expense}.`,
  saved: (savings: string, rate: string) => `Você poupou ${savings}: ${rate} % do que entrou.`,
  overspent: (deficit: string) =>
    `Saíram ${deficit} a mais do que entrou. Aqui há algo que talvez valha a pena olhar.`,
  balanced: "Saiu o mesmo que entrou.",
  topCategory: (category: string, amount: string) => `Seu maior gasto foi ${category}: ${amount}.`,
  goalsContributed: (amount: string) => `Você contribuiu com ${amount} para suas metas.`,
  incomeUp: (difference: string, month: string) => `Entraram ${difference} a mais que em ${month}.`,
  incomeDown: (difference: string, month: string) =>
    `Entraram ${difference} a menos que em ${month}.`,
  incomeSame: (month: string) => `Entrou o mesmo que em ${month}.`,
  savingsUp: (difference: string, month: string) =>
    `Você poupou ${difference} a mais que em ${month}.`,
  savingsDown: (difference: string, month: string) =>
    `Você poupou ${difference} a menos que em ${month}.`,
  savingsSame: (month: string) => `Você poupou o mesmo que em ${month}.`,
  flowLink: "Ver para onde foi no Money Flow",
  error: "Não conseguimos carregar sua Money Story",
  retry: "Tentar de novo",
};

export const moneyStoryMessagesByLocale = byLocale({ es, en, pt });
