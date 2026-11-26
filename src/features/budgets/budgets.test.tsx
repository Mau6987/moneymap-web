// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Budget, Category } from "../map/data/map-gateway";
import { createBudget } from "./budgets-actions";
import { freeByCurrency, isAtRisk } from "./budgets-data";
import { BudgetForm } from "./components/budget-form";
import { PaceChart } from "./components/pace-chart";

vi.mock("@/lib/auth/session", () => ({ withAccessToken: vi.fn() }));

const budget = (over: Partial<Budget>): Budget => ({
  id: "b1",
  category_id: "food",
  category_name: "Comida",
  currency: "BOB",
  amount: "2000.00",
  spent: "1200.00",
  remaining: "800.00",
  percent_used: 60,
  pace: { status: "on_track", projected_total: "1900.00" },
  period_starts_on: "2026-10-01",
  period_ends_on: "2026-10-31",
  daily: [{ on: "2026-10-05", spent: "1200.00", cumulative: "1200.00" }],
  alert_at_80: true,
  alert_at_100: true,
  ...over,
});

const category = (id: string, type: "income" | "expense" = "expense"): Category => ({
  id,
  name: id,
  type,
  money_flow_group: type === "expense" ? "needs" : null,
  icon: "",
  color: "#D25A42",
  template_key: null,
});

describe("budget rules", () => {
  it("RF-6 at risk: going faster than the month or already over", () => {
    expect(isAtRisk(budget({}))).toBe(false);
    expect(isAtRisk(budget({ pace: { status: "a_bit_fast", projected_total: "0" } }))).toBe(true);
    expect(
      isAtRisk(budget({ remaining: "-50.00", pace: { status: null, projected_total: "0" } })),
    ).toBe(true);
  });

  it("RF-1 one per category and currency; incomes never", () => {
    const free = freeByCurrency(
      [category("food"), category("fun"), category("salary", "income")],
      [budget({})],
      ["BOB", "USD"],
    );

    expect(free.BOB?.map((c) => c.id)).toEqual(["fun"]);
    expect(free.USD?.map((c) => c.id)).toEqual(["food", "fun"]);
  });

  it("refuses without a category or with a bad limit before the API", async () => {
    const form = new FormData();
    form.set("currency", "BOB");
    form.set("amount", "100");
    expect(await createBudget({}, form)).toEqual({ error: "budget_category" });
    form.set("category", "food");
    form.set("amount", "0");
    expect(await createBudget({}, form)).toEqual({ error: "invalid_amount" });
  });
});

describe("BudgetForm", () => {
  const currencies = [
    { code: "BOB", name: "Boliviano", label: "Bs", decimals: 2 },
    { code: "USD", name: "Dólar estadounidense", label: "$", decimals: 2 },
  ];
  const free = { BOB: [{ id: "fun", name: "Ocio", color: "#E2A93C" }], USD: [] };

  it("offers the free categories of the chosen currency and the alerts on", async () => {
    render(<BudgetForm action={createBudget} currencies={currencies} freeByCurrency={free} />);

    expect(screen.getByRole("button", { name: "Ocio" })).toBeTruthy();
    expect((screen.getByLabelText("Avisarme al 80 %") as HTMLInputElement).checked).toBe(true);

    await userEvent.selectOptions(screen.getByLabelText("Moneda"), "USD");
    expect(screen.queryByRole("button", { name: "Ocio" })).toBeNull();
    expect(screen.getByText(/ya tienen presupuesto en esta moneda/)).toBeTruthy();
  });

  it("MM-179 shows four categories and opens the rest with Más", async () => {
    const many = ["a", "b", "c", "d", "e", "f"].map((id) => ({
      id,
      name: id.toUpperCase(),
      color: "#000",
    }));
    render(
      <BudgetForm
        action={createBudget}
        currencies={currencies}
        freeByCurrency={{ BOB: many, USD: [] }}
      />,
    );

    expect(screen.getByRole("button", { name: "D" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "E" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Más (2)" }));
    expect(screen.getByRole("button", { name: "F" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Menos" })).toBeTruthy();
  });

  it("saves only with a category and a limit", async () => {
    render(<BudgetForm action={createBudget} currencies={currencies} freeByCurrency={free} />);
    const save = screen.getByRole("button", { name: "Crear presupuesto" }) as HTMLButtonElement;

    await userEvent.type(screen.getByLabelText("Límite mensual (Bs)"), "500");
    expect(save.disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Ocio" }));
    expect(save.disabled).toBe(false);
  });
});

describe("PaceChart", () => {
  it("draws the spending against the ideal pace, with a label for screen readers", () => {
    render(<PaceChart budget={budget({})} today="2026-10-15" label="Gasto del mes" />);

    expect(screen.getByRole("img", { name: "Gasto del mes" })).toBeTruthy();
  });
});
