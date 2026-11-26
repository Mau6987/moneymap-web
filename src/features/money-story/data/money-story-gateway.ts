import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/errors";
import type { components } from "@/lib/api/generated/schema";
import { isDemo } from "@/lib/demo";

import { shiftPeriod } from "../../money-flow/domain/money-flow";
import { monthsBetween } from "../domain/story";
import { apiTextLocale } from "@/lib/i18n/server";
import { categoryName } from "@/lib/i18n/api-texts";

type Schemas = components["schemas"];
export type MoneyStoryMonth = Schemas["MoneyStoryMonthRead"];
export type MoneyStory = Schemas["MoneyStoryRead"];
export type StoryHighlight = Schemas["StoryHighlightRead"];

/** Money Story de un mes, una por moneda (spec 006, RF-1 a RF-7). Lanza `ApiError`. */
export interface MoneyStoryGateway {
  /** Sin `period`, el último mes cerrado. */
  month(token: string, period?: string): Promise<MoneyStoryMonth>;
}

const api = (accessToken: string) => createApiClient({ baseUrl: apiBaseUrl(), accessToken });

export const apiMoneyStoryGateway: MoneyStoryGateway = {
  month: (token, period) =>
    unwrap(
      api(token).GET("/v1/money-story", {
        params: { query: period ? { period } : {} },
      }),
    ),
};

/** El último mes cerrado: el anterior al de hoy. */
export const lastClosedPeriod = (today: string) => shiftPeriod(today.slice(0, 7), -1);

const lastDay = (period: string) => {
  const [y, m] = period.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

/**
 * El mes cerrado en bolivianos comparado con el anterior y el primer mes en
 * dólares; dos meses atrás solo hay bolivianos y antes, nada.
 */
export const demoMoneyStoryGateway: MoneyStoryGateway = {
  month: async (_, requested) => {
    const latest = lastClosedPeriod(new Date().toISOString());
    const period = requested ?? latest;
    const back = monthsBetween(period, latest);
    if (back < 0 || back > 1) return { period: back < 0 ? null : period, items: [] };
    const previous = shiftPeriod(period, -1);
    const dates = { period_starts_on: `${period}-01`, period_ends_on: lastDay(period) };
    const bob: MoneyStory = {
      currency: "BOB",
      ...dates,
      income_total: "12000.00",
      expense_total: "8760.00",
      savings_total: "3240.00",
      savings_rate: "0.2700",
      is_first_month: back === 1,
      comparison:
        back === 1
          ? null
          : {
              period: previous,
              income_total: "12000.00",
              expense_total: "9000.00",
              savings_total: "3000.00",
              goals_contributed: "300.00",
              top_expense_category: { name: "Comida", total: "2080.00" },
            },
      highlights: [
        {
          key: "summary",
          params: { month: period, income: "12000.00", expense: "8760.00" },
          text: "",
        },
        { key: "saved", params: { savings: "3240.00", rate: "27" }, text: "" },
        {
          key: "top_expense_category",
          params: { category: "Comida", amount: "2600.00" },
          text: "",
        },
        { key: "goals_contributed", params: { amount: "500.00" }, text: "" },
        ...(back === 1
          ? []
          : [
              { key: "income_same", params: { previous_month: previous }, text: "" },
              {
                key: "savings_up",
                params: { previous_month: previous, difference: "240.00" },
                text: "",
              },
            ]),
      ],
      generated_at: null,
    };
    const usd: MoneyStory = {
      currency: "USD",
      ...dates,
      income_total: "800.00",
      expense_total: "330.00",
      savings_total: "470.00",
      savings_rate: "0.5875",
      is_first_month: true,
      comparison: null,
      highlights: [{ key: "first_month", params: {}, text: "" }],
      generated_at: null,
    };
    return { period, items: back === 0 ? [bob, usd] : [bob] };
  },
};

export function moneyStoryGateway(): MoneyStoryGateway {
  const gateway = isDemo() ? demoMoneyStoryGateway : apiMoneyStoryGateway;
  // MM-191: la categoría de mayor gasto se muestra en el idioma elegido.
  return {
    ...gateway,
    month: async (token, period) => {
      const [found, locale] = await Promise.all([gateway.month(token, period), apiTextLocale()]);
      const name = (n: string) => categoryName(n, locale);
      return {
        ...found,
        items: found.items.map((story) => ({
          ...story,
          highlights: story.highlights.map((h) =>
            h.params.category
              ? { ...h, params: { ...h.params, category: name(h.params.category) } }
              : h,
          ),
          comparison: story.comparison?.top_expense_category
            ? {
                ...story.comparison,
                top_expense_category: {
                  ...story.comparison.top_expense_category,
                  name: name(story.comparison.top_expense_category.name),
                },
              }
            : story.comparison,
        })),
      };
    },
  };
}
