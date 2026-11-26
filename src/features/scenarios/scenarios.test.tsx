// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CurrencyInfo } from "@/lib/money/currency";

import { AffordPanel } from "./components/afford-panel";
import { WhatIfSimulator } from "./components/what-if-simulator";
import { demoScenariosGateway, type WhatIfBase } from "./data/scenarios-gateway";
import { checkAffordability, loadWhatIfBase } from "./scenarios-actions";
import { amountAt, rowsOf, totalOf } from "./what-if-model";

const baseline = vi.fn();
// MM-188: la consulta revalida la página (consultas del mes); fuera de Next no hay caché.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  withAccessToken: (call: (token: string) => unknown) => call("token"),
}));
vi.mock("./data/scenarios-gateway", async (original) => {
  const real = await original<typeof import("./data/scenarios-gateway")>();
  return {
    ...real,
    scenariosGateway: () => ({ ...real.demoScenariosGateway, baseline }),
  };
});

const currency = (code: string, extra: Partial<CurrencyInfo> = {}): CurrencyInfo => ({
  code,
  name: code,
  symbol: code === "BOB" ? "Bs" : "$",
  decimals: 2,
  is_active: true,
  is_mine: false,
  is_main_currency: false,
  ...extra,
});
const currencies = [
  currency("BOB", { is_mine: true, is_main_currency: true }),
  currency("USD", { is_mine: true }),
  currency("EUR"),
];

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

beforeEach(() => baseline.mockReset());

describe("Can I Afford It?", () => {
  it("RF-11 when it fits, it says what would be left after income and expenses", async () => {
    const state = await checkAffordability(
      {},
      form({ currency: "BOB", decimals: "2", amount: "800" }),
    );

    expect(state.result?.verdict).toBe("affordable");
    // 4200 de Safe to Spend + 3000 que faltan − 340 de gasto variable − 800
    expect(state.result?.available).toBe("6860.00");
    expect(state.result?.available_after).toBe("6060.00");
  });

  it("asks only with a price", async () => {
    expect(
      await checkAffordability({}, form({ currency: "BOB", decimals: "2", amount: "" })),
    ).toEqual({
      error: "invalid_amount",
    });
  });

  it("offers only the configured currency; with accounts in more, it offers them", () => {
    const { unmount } = render(
      <AffordPanel
        action={checkAffordability}
        currencies={currencies}
        accountCurrencies={["BOB"]}
        categories={[]}
        hidden={false}
      />,
    );
    expect(screen.queryByLabelText("Moneda")).toBeNull();
    expect(screen.getByLabelText("¿Cuánto cuesta? (Bs)")).toBeTruthy();
    unmount();

    render(
      <AffordPanel
        action={checkAffordability}
        currencies={currencies}
        accountCurrencies={["BOB", "USD"]}
        categories={[]}
        hidden={false}
      />,
    );
    const select = screen.getByLabelText("Moneda") as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(["BOB", "USD"]);
  });

  it("RF-14 shows the verdict, the breakdown, the date, the curve and the month, like the app", async () => {
    render(
      <AffordPanel
        action={checkAffordability}
        currencies={currencies}
        accountCurrencies={["BOB", "USD"]}
        categories={[]}
        hidden={false}
      />,
    );

    await userEvent.type(screen.getByLabelText("¿Cuánto cuesta? (Bs)"), "9000");
    await userEvent.click(screen.getByRole("button", { name: "Analizar" }));

    expect(await screen.findByText("Todavía no te alcanza")).toBeTruthy();
    expect(screen.getByTestId("afford-headline").textContent).toBe("Te faltan Bs 2.140");
    expect(screen.getByTestId("afford-available").textContent).toBe("Bs 6.860");
    const breakdown = within(screen.getByTestId("afford-breakdown"));
    expect(breakdown.getByText("Por pagar")).toBeTruthy();
    expect(breakdown.getByText("−Bs 1.500")).toBeTruthy();
    expect(breakdown.getByText("+Bs 3.000")).toBeTruthy();
    expect(screen.getByText(/^Podrías comprarlo en /)).toBeTruthy();
    expect(screen.getByTestId("afford-curve")).toBeTruthy();
    expect(screen.getByText("Fondo de emergencia")).toBeTruthy();
    expect(screen.getByText("Se atrasa 1 mes")).toBeTruthy();
    const monthly = within(screen.getByTestId("afford-monthly"));
    expect(monthly.getByText("Te sobran")).toBeTruthy();
    expect(monthly.getByText("Bs 1.200")).toBeTruthy();
  });

  it("when it fits there is no curve, and private mode hides the amounts", async () => {
    render(
      <AffordPanel action={checkAffordability} currencies={currencies} categories={[]} hidden />,
    );

    await userEvent.type(screen.getByLabelText("¿Cuánto cuesta? (Bs)"), "800");
    await userEvent.click(screen.getByRole("button", { name: "Analizar" }));

    expect(await screen.findByText("Sí te alcanza")).toBeTruthy();
    expect(screen.queryByTestId("afford-curve")).toBeNull();
    expect(screen.getByTestId("afford-result").textContent).not.toMatch(/Bs \d/);
  });
});

const item = (group: "income" | "needs" | "lifestyle", name: string, amount: string) => ({
  category_id: `${group}-${name}`,
  name,
  group,
  amount,
});

/** Gastos 500 + 300 + 200 + 50 + 25; ingresos 2000 + 100; una meta de 100 por periodo. */
const base = (extra: Partial<WhatIfBase> = {}): WhatIfBase => ({
  currency: "BOB",
  period_type: "semi_monthly",
  periods_per_year: 24,
  period_starts_on: "2026-10-16",
  period_ends_on: "2026-10-31",
  account_id: null,
  expenses: [
    item("needs", "Vivienda", "500.00"),
    item("lifestyle", "Ocio", "300.00"),
    item("needs", "Comida", "200.00"),
    item("needs", "Transporte", "50.00"),
    item("lifestyle", "Suscripciones", "25.00"),
  ],
  income: [item("income", "Salario", "2000.00"), item("income", "Ventas", "100.00")],
  goals: [
    {
      goal_id: "g1",
      name: "Fondo",
      target_amount: "1000.00",
      current_amount: "400.00",
      monthly_contribution: "200.00",
      period_contribution: "100.00",
    },
  ],
  ...extra,
});

const accounts = [
  { id: "a-cash", name: "Efectivo", type: "cash", currency: "BOB", last4: null, balance: "900.00" },
  {
    id: "a-card",
    name: "Tarjeta BNB",
    type: "card",
    currency: "BOB",
    last4: "4821",
    balance: "3100.00",
  },
  {
    id: "a-usd",
    name: "Tarjeta USD",
    type: "card",
    currency: "USD",
    last4: "7730",
    balance: "300.00",
  },
];

const simulator = (props: Partial<Parameters<typeof WhatIfSimulator>[0]> = {}) =>
  render(
    <WhatIfSimulator
      load={async (query) => ({ base: base({ period_type: query.period_type }) })}
      initial={base()}
      currencies={currencies}
      accounts={accounts}
      balances={{ BOB: "4000.00", USD: "300.00" }}
      defaultPeriod="semi_monthly"
      hidden={false}
      {...props}
    />,
  );

const total = () => screen.getByTestId("whatif-total-amount").textContent;
const sliderOf = (name: string) => screen.getByLabelText(name) as HTMLInputElement;

describe("What If? simulator", () => {
  it("top 3 per side, and Otros adds up the rest of the period", () => {
    const rows = rowsOf(base());

    expect(rows.filter((r) => r.kind === "expense").map((r) => [r.name, r.base])).toEqual([
      ["Vivienda", "500.00"],
      ["Ocio", "300.00"],
      ["Comida", "200.00"],
      [null, "75"],
    ]);
    expect(rows.filter((r) => r.kind === "income").map((r) => r.base)).toEqual([
      "2000.00",
      "100.00",
      "0",
    ]);
    // 2100 − 1075 − 100 de la meta
    expect(totalOf(rows, {}, 2)).toBe("925.00");
  });

  it("money stays exact with Decimal, without floating point errors", () => {
    const rows = rowsOf(
      base({
        expenses: [],
        goals: [],
        income: [item("income", "A", "0.10"), item("income", "B", "0.20")],
      }),
    );

    expect(totalOf(rows, {}, 2)).toBe("0.30");
    const a = rows.find((r) => r.name === "A");
    expect(a && amountAt(a, 300, 2)).toBe("0.30");
    expect(a && amountAt(a, 0, 2)).toBe("0.00");
  });

  it("starts on the period the user configured", () => {
    simulator({ defaultPeriod: "weekly", initial: null, initialError: "network_error" });

    expect(screen.getByRole("radio", { name: "Semana" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe("Sin conexión. Vuelve a intentar.");
  });

  it("changing the period reloads the base and the total", async () => {
    const load = vi.fn(async () => ({
      base: base({
        period_type: "weekly",
        period_starts_on: "2026-10-26",
        period_ends_on: "2026-11-01",
        expenses: [item("needs", "Vivienda", "100.00")],
        income: [item("income", "Salario", "500.00")],
        goals: [],
      }),
    }));
    simulator({ load });
    expect(screen.getByRole("radio", { name: "Quincena" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(total()).toBe("Bs 925");

    await userEvent.click(screen.getByRole("radio", { name: "Semana" }));

    expect(load).toHaveBeenCalledWith({ currency: "BOB", period_type: "weekly", account_id: null });
    expect(await screen.findByText("Bs 400")).toBeTruthy();
  });

  it("an expense up lowers the total; an income up raises it", () => {
    simulator();

    fireEvent.change(sliderOf("Vivienda"), { target: { value: "200" } });
    expect(total()).toBe("Bs 425");
    expect(screen.getByTestId("whatif-difference").textContent).toBe("−Bs 500 frente a lo real");

    fireEvent.change(sliderOf("Salario"), { target: { value: "150" } });
    expect(total()).toBe("Bs 1.425");

    fireEvent.click(screen.getByRole("button", { name: "Volver a lo real" }));
    expect(total()).toBe("Bs 925");
  });

  it("an amount can be typed, and the slider follows it", async () => {
    simulator();

    const field = screen.getByLabelText("Monto de Vivienda") as HTMLInputElement;
    expect(field.value).toBe("500");
    await userEvent.clear(field);
    await userEvent.type(field, "1.250,50");

    // 925 + 500 − 1250,50
    expect(total()).toBe("Bs 174,50");
    expect(sliderOf("Vivienda").value).toBe("250");
    // Lo que no es un monto no cambia el total.
    await userEvent.type(field, "x");
    expect(total()).toBe("Bs 174,50");
    await userEvent.tab();
    expect(field.value).toBe("1.250,50");

    // Un monto fuera del rango deja el slider en el borde y cuenta tal cual.
    const salary = screen.getByLabelText("Monto de Salario") as HTMLInputElement;
    await userEvent.clear(salary);
    await userEvent.type(salary, "10000");
    expect(sliderOf("Salario").value).toBe("300");
    expect(total()).toBe("Bs 8.174,50");
  });

  it("shows how you are doing overall: today's balance plus what the simulator moves", async () => {
    const load = vi.fn(async () => ({ base: base({ account_id: "a-cash" }) }));
    simulator({ load });

    const general = () => screen.getByTestId("whatif-general-amount").textContent;
    expect(general()).toBe("Bs 4.000");

    fireEvent.change(sliderOf("Vivienda"), { target: { value: "200" } });
    // Gastar 500 más baja el saldo de la moneda en 500.
    expect(general()).toBe("Bs 3.500");
    expect(screen.getByText("Hoy: Bs 4.000 →")).toBeTruthy();

    // Con una cuenta elegida, parte del saldo de esa cuenta.
    await userEvent.selectOptions(screen.getByLabelText("¿De dónde sale?"), "a-cash");
    expect(await screen.findByText("Bs 900")).toBeTruthy();
  });

  it("offers only the currencies with accounts", () => {
    simulator({ accounts: accounts.filter((a) => a.currency === "BOB") });

    const select = screen.getByLabelText("Moneda") as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(["BOB"]);
  });

  it("sliders go from 0 to ×3, never below zero", () => {
    simulator();

    const housing = sliderOf("Vivienda");
    expect([housing.min, housing.max]).toEqual(["0", "300"]);
    expect([sliderOf("Salario").min, sliderOf("Salario").max]).toEqual(["0", "300"]);
    expect(housing.getAttribute("aria-valuetext")).toBe(
      "Vivienda, Bs 500, ×1 de lo real. Ajústalo con las flechas.",
    );
    const goal = sliderOf("Fondo");
    expect([goal.min, goal.max]).toEqual(["0", "300"]);
    // Faltan 600: a 200 al mes son 3 meses; sin aportar no llega.
    expect(screen.getByText("Llegas en 3 meses")).toBeTruthy();
    fireEvent.change(goal, { target: { value: "0" } });
    expect(screen.getByText("Sin aportes no llega")).toBeTruthy();
    expect(total()).toBe("Bs 1.025");
    fireEvent.change(goal, { target: { value: "300" } });
    expect(screen.getByText("Llegas en 1 mes")).toBeTruthy();
  });

  it("refreshes the base with the API 500 ms after the last move", async () => {
    vi.useFakeTimers();
    try {
      const load = vi.fn(async () => ({ base: base() }));
      simulator({ load });

      fireEvent.change(sliderOf("Ocio"), { target: { value: "50" } });
      fireEvent.change(sliderOf("Ocio"), { target: { value: "0" } });
      expect(load).not.toHaveBeenCalled();
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(load).toHaveBeenCalledTimes(1);
      // Refrescar no pierde lo que se movió: sin Ocio, 925 + 300.
      expect(total()).toBe("Bs 1.225");
    } finally {
      vi.useRealTimers();
    }
  });

  it("offers cash and cards of the currency as the source", async () => {
    const load = vi.fn(async () => ({ base: base({ account_id: "a-card" }) }));
    simulator({ load });

    const source = screen.getByLabelText("¿De dónde sale?") as HTMLSelectElement;
    expect([...source.options].map((o) => o.text)).toEqual([
      "Todas las cuentas",
      "Efectivo",
      "Tarjeta BNB ••4821",
    ]);
    await userEvent.selectOptions(source, "a-card");

    expect(load).toHaveBeenCalledWith({
      currency: "BOB",
      period_type: "semi_monthly",
      account_id: "a-card",
    });
  });

  it("private mode hides every amount", () => {
    simulator({ hidden: true });

    const card = screen.getByTestId("whatif-total");
    expect(within(card).getByTestId("whatif-total-amount").textContent).toBe("Bs ••••");
    expect(document.body.textContent).not.toMatch(/Bs \d/);
  });

  it("asks the API for the chosen period, currency and account", async () => {
    baseline.mockResolvedValue(base());

    const state = await loadWhatIfBase({
      currency: "BOB",
      period_type: "weekly",
      account_id: "a-cash",
    });

    expect(baseline).toHaveBeenCalledWith("token", {
      currency: "BOB",
      period_type: "weekly",
      account_id: "a-cash",
    });
    expect(state.base?.currency).toBe("BOB");
    expect(await loadWhatIfBase({ currency: "", period_type: "weekly", account_id: null })).toEqual(
      { error: "validation_error" },
    );
  });

  it("the demo base follows the period", async () => {
    const query = { currency: "BOB", account_id: null } as const;
    const monthly = await demoScenariosGateway.baseline("", { ...query, period_type: "monthly" });
    const semi = await demoScenariosGateway.baseline("", { ...query, period_type: "semi_monthly" });

    expect(monthly.income[0]?.amount).toBe("12000.00");
    expect(semi.income[0]?.amount).toBe("6000.00");
    expect(semi.goals[0]?.period_contribution).toBe("250.00");
  });
});
