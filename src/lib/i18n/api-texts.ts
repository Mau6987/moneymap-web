import { byLocale, LOCALE_TAGS, type Locale } from "./locale";

/**
 * Los textos que llegan de la API en español (MM-191): los nombres de las
 * categorías y los planes iniciales y los avisos del buzón. La API no los
 * traduce, así que la web los reconoce y los muestra en el idioma elegido. Lo
 * que la persona o el administrador escribió (una categoría renombrada, un
 * plan con otro nombre) se muestra tal cual.
 */

type Names = Record<Locale, string>;

/** Las categorías de `catalog.category_templates` (y las del modo demo). */
const CATEGORY_NAMES: Names[] = [
  { es: "Salario", en: "Salary", pt: "Salário" },
  { es: "Trabajo independiente", en: "Freelance", pt: "Trabalho autônomo" },
  { es: "Emprendimiento", en: "Business", pt: "Empreendimento" },
  { es: "Mesada familiar", en: "Family support", pt: "Mesada familiar" },
  { es: "Inversiones e intereses", en: "Investments", pt: "Investimentos e juros" },
  { es: "Otros ingresos", en: "Other income", pt: "Outras receitas" },
  { es: "Vivienda y alquiler", en: "Housing", pt: "Moradia e aluguel" },
  { es: "Servicios básicos", en: "Utilities", pt: "Contas da casa" },
  { es: "Supermercado", en: "Groceries", pt: "Supermercado" },
  { es: "Transporte", en: "Transport", pt: "Transporte" },
  { es: "Salud", en: "Health", pt: "Saúde" },
  { es: "Educación", en: "Education", pt: "Educação" },
  { es: "Deudas y créditos", en: "Debt payments", pt: "Dívidas e créditos" },
  { es: "Seguros", en: "Insurance", pt: "Seguros" },
  { es: "Restaurantes", en: "Restaurants", pt: "Restaurantes" },
  { es: "Delivery de comida", en: "Food delivery", pt: "Delivery de comida" },
  { es: "Entretenimiento", en: "Entertainment", pt: "Entretenimento" },
  { es: "Suscripciones", en: "Subscriptions", pt: "Assinaturas" },
  { es: "Compras", en: "Shopping", pt: "Compras" },
  { es: "Viajes", en: "Travel", pt: "Viagens" },
  { es: "Cuidado personal", en: "Personal care", pt: "Cuidados pessoais" },
  { es: "Regalos", en: "Gifts", pt: "Presentes" },
  { es: "Otros gastos", en: "Other expenses", pt: "Outras despesas" },
  { es: "Comida", en: "Food", pt: "Comida" },
  { es: "Vivienda", en: "Home", pt: "Moradia" },
  { es: "Salidas", en: "Going out", pt: "Passeios" },
];

const byName = new Map<string, Names>();
for (const names of CATEGORY_NAMES)
  for (const name of Object.values(names)) byName.set(name.toLowerCase(), names);

/** El nombre de una categoría en el idioma; si no es una de las iniciales, el suyo. */
export function categoryName(name: string, locale: Locale): string;
export function categoryName(name: string | null | undefined, locale: Locale): string | null;
export function categoryName(name: string | null | undefined, locale: Locale) {
  if (name == null) return null;
  return byName.get(name.trim().toLowerCase())?.[locale] ?? name;
}

/** Lo mismo sobre cualquier objeto con `name`: una lista de categorías de la API. */
export function withCategoryNames<T extends { name: string }>(items: T[], locale: Locale): T[] {
  return items.map((item) => ({ ...item, name: categoryName(item.name, locale) }));
}

/** Los nombres con que nacen los planes (seed del back). */
const PLAN_NAMES: Record<string, Names> = {
  free: { es: "Gratuito", en: "Free", pt: "Gratuito" },
  paid_1: { es: "Plan de pago 1", en: "Paid plan 1", pt: "Plano pago 1" },
  paid_2: { es: "Plan de pago 2", en: "Paid plan 2", pt: "Plano pago 2" },
  paid_3: { es: "Plan de pago 3", en: "Paid plan 3", pt: "Plano pago 3" },
};

/** El nombre de un plan; si el administrador lo cambió, el que puso. */
export function planName(code: string, name: string, locale: Locale): string {
  const names = PLAN_NAMES[code];
  return names && Object.values(names).includes(name) ? names[locale] : name;
}

// ---- Avisos del buzón (notify/domain/messages.py del back) ----

const ES_MONTHS =
  "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split(
    " ",
  );

const month = (index: number, locale: Locale) =>
  new Intl.DateTimeFormat(LOCALE_TAGS[locale], { month: "long", timeZone: "UTC" }).format(
    Date.UTC(2026, index, 1),
  );

type When = { kind: "today" } | { kind: "tomorrow" } | { kind: "on"; day: string; month: string };

const NOTICES = byLocale({
  es: null,
  en: {
    when: (w: When) =>
      w.kind === "today" ? "today" : w.kind === "tomorrow" ? "tomorrow" : `on ${w.month}/${w.day}`,
    recurringOne: (when: string) => `You have a recurring payment ${when}`,
    recurringMany: (n: string, when: string) => `You have ${n} recurring payments ${when}`,
    openIt: "Open MoneyMap to see it.",
    openThem: "Open MoneyMap to see them.",
    storyReady: "Your Money Story is ready",
    storyBody: (m: string) => `See how ${m} went.`,
    goalDone: "You reached your goal",
    goalOpen: "Open MoneyMap to see how it's going.",
    goalReached: (name: string, target: string) => `${name}: you reached ${target}.`,
    goalAt: (n: string) => `You're at ${n} % of your goal`,
    goalSaved: (name: string, saved: string, target: string) =>
      `${name}: ${saved} of ${target} saved.`,
    budgetOver: "You went over a budget",
    budget80: "You used 80 % of a budget",
    budgetOverOf: (c: string) => `You went over your ${c} budget`,
    budget80Of: (c: string) => `You used 80 % of ${c}`,
    budgetSpent: (spent: string, amount: string) => `${spent} of ${amount} spent this month.`,
  },
  pt: {
    when: (w: When) =>
      w.kind === "today" ? "hoje" : w.kind === "tomorrow" ? "amanhã" : `em ${w.day}/${w.month}`,
    recurringOne: (when: string) => `Você tem um pagamento recorrente ${when}`,
    recurringMany: (n: string, when: string) => `Você tem ${n} pagamentos recorrentes ${when}`,
    openIt: "Abra o MoneyMap para ver.",
    openThem: "Abra o MoneyMap para ver.",
    storyReady: "Sua Money Story está pronta",
    storyBody: (m: string) => `Veja como foi ${m}.`,
    goalDone: "Você cumpriu sua meta",
    goalOpen: "Abra o MoneyMap para ver como está.",
    goalReached: (name: string, target: string) => `${name}: você chegou a ${target}.`,
    goalAt: (n: string) => `Você está em ${n} % da sua meta`,
    goalSaved: (name: string, saved: string, target: string) =>
      `${name}: você tem ${saved} de ${target}.`,
    budgetOver: "Você ultrapassou um orçamento",
    budget80: "Você usou 80 % de um orçamento",
    budgetOverOf: (c: string) => `Você ultrapassou seu orçamento de ${c}`,
    budget80Of: (c: string) => `Você usou 80 % de ${c}`,
    budgetSpent: (spent: string, amount: string) => `Você gastou ${spent} de ${amount} este mês.`,
  },
});

type NoticeText = { title: string; body: string };

function parseWhen(text: string): When | null {
  if (text === "hoy") return { kind: "today" };
  if (text === "mañana") return { kind: "tomorrow" };
  const on = /^el (\d\d)\/(\d\d)$/.exec(text);
  return on ? { kind: "on", day: on[1]!, month: on[2]! } : null;
}

/**
 * El título y el cuerpo de un aviso en el idioma. Reconoce las frases que arma
 * el back; si una no calza (una frase nueva), la deja como llegó.
 */
export function noticeText(type: string, notice: NoticeText, locale: Locale): NoticeText {
  const t = NOTICES[locale];
  if (!t) return notice;
  const { title, body } = notice;
  const open = (b: string) =>
    b === "Abre MoneyMap para verlo." || b === "Abre MoneyMap para verla."
      ? t.openIt
      : b === "Abre MoneyMap para verlos."
        ? t.openThem
        : b === "Abre MoneyMap para ver cómo va."
          ? t.goalOpen
          : null;
  let m: RegExpExecArray | null;

  switch (type) {
    case "recurring.due_soon": {
      let out: string | null = null;
      if ((m = /^Tienes un pago recurrente (.+)$/.exec(title))) {
        const w = parseWhen(m[1]!);
        if (w) out = t.recurringOne(t.when(w));
      } else if ((m = /^Tienes (\d+) pagos recurrentes (.+)$/.exec(title))) {
        const w = parseWhen(m[2]!);
        if (w) out = t.recurringMany(m[1]!, t.when(w));
      }
      // El cuerpo con montos es la lista de pagos: lo que escribió la persona.
      return { title: out ?? title, body: open(body) ?? body };
    }
    case "money_story.ready": {
      m = /^Mira cómo te fue en (\p{L}+)\.$/u.exec(body);
      const index = m ? ES_MONTHS.indexOf(m[1]!.toLowerCase()) : -1;
      return {
        title: title === "Tu Money Story está lista" ? t.storyReady : title,
        body: index >= 0 ? t.storyBody(month(index, locale)) : body,
      };
    }
    case "goal.milestone":
    case "goal.achieved": {
      let out = title;
      if (title === "Cumpliste tu meta") out = t.goalDone;
      else if ((m = /^Vas por el (\d+) % de tu meta$/.exec(title))) out = t.goalAt(m[1]!);
      let text = open(body);
      if (!text && (m = /^(.+): llegaste a (.+)\.$/.exec(body))) text = t.goalReached(m[1]!, m[2]!);
      if (!text && (m = /^(.+): llevas (.+) de (.+)\.$/.exec(body)))
        text = t.goalSaved(m[1]!, m[2]!, m[3]!);
      return { title: out, body: text ?? body };
    }
    case "budget.threshold":
    case "budget.exceeded": {
      let out = title;
      if (title === "Superaste un presupuesto") out = t.budgetOver;
      else if (title === "Usaste el 80 % de un presupuesto") out = t.budget80;
      else if ((m = /^Superaste tu presupuesto de (.+)$/.exec(title)))
        out = t.budgetOverOf(categoryName(m[1]!, locale));
      else if ((m = /^Usaste el 80 % de (.+)$/.exec(title)))
        out = t.budget80Of(categoryName(m[1]!, locale));
      let text = open(body);
      if (!text && (m = /^Llevas (.+) de (.+) este mes\.$/.exec(body)))
        text = t.budgetSpent(m[1]!, m[2]!);
      return { title: out, body: text ?? body };
    }
    default:
      return notice;
  }
}
