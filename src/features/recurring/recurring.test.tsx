// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RuleForm } from "./components/rule-form";
import { demoRecurringGateway } from "./data/recurring-gateway";

vi.mock("./recurring-actions", () => ({ createRule: vi.fn(), updateRule: vi.fn() }));
const { createRule } = await import("./recurring-actions");

const accounts = [
  {
    id: "demo-bnb",
    name: "Tarjeta BNB",
    currency: "BOB",
    label: "Bs",
    decimals: 2,
    isDefault: true,
  },
  {
    id: "demo-usd",
    name: "Tarjeta USD",
    currency: "USD",
    label: "$",
    decimals: 2,
    isDefault: false,
  },
];
const categories = ["Casa", "Servicios", "Suscripciones", "Salud", "Educación"].map((name) => ({
  id: name,
  name,
  type: "expense",
  color: "#D25A42",
}));

describe("Ingresos y gastos fijos (MM-177)", () => {
  it("the demo has the salary and two fixed expenses, each in its account's currency", async () => {
    const rules = await demoRecurringGateway.rules("");
    expect(rules.map((r) => [r.description, r.type, r.currency])).toEqual([
      ["Sueldo", "income", "BOB"],
      ["Alquiler", "expense", "BOB"],
      ["Netflix", "expense", "USD"],
    ]);
  });

  it("paying the demo rent leaves this month's one next", async () => {
    const rent = (await demoRecurringGateway.rules("")).find((r) => r.id === "r-rent");
    const [overdue, thisMonth] = [...(rent?.pending_dates ?? [])];
    expect(thisMonth).toBeTruthy();
    expect(rent?.next_due_on).toBe(overdue);

    await demoRecurringGateway.pay("", "r-rent", "key");

    expect(rent?.next_due_on).toBe(thisMonth);
    expect(rent?.pending_dates).toEqual([thisMonth]);
  });

  it("saves only with what it is, a valid amount and a category", async () => {
    render(
      <RuleForm
        action={createRule}
        kind="expenses"
        accounts={accounts}
        categories={categories}
        today="2026-10-26"
      />,
    );
    const save = screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    await userEvent.type(screen.getByLabelText("¿Qué es?"), "Alquiler");
    await userEvent.type(screen.getByLabelText("Monto (Bs)"), "700");
    expect(save.disabled).toBe(true);

    // Las 4 primeras y "Más" con el resto (MM-176).
    expect(screen.queryByRole("button", { name: "Educación" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Casa" }));
    expect(save.disabled).toBe(false);
  });

  it("BUG-027 like the app, it goes in a currency: the account is picked when paying", async () => {
    render(
      <RuleForm
        action={createRule}
        kind="expenses"
        accounts={accounts}
        categories={categories}
        today="2026-10-26"
      />,
    );
    expect(screen.queryByRole("radio", { name: /Tarjeta/ })).toBeNull();
    expect(screen.getByText("La cuenta la eliges al pagarlo.")).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: "USD" }));
    expect(screen.getByLabelText("Monto ($)")).toBeTruthy();
  });

  it("editing starts from the rule, with its amount as it is typed", () => {
    render(
      <RuleForm
        action={createRule}
        kind="income"
        accounts={accounts}
        categories={[{ id: "c-salary", name: "Sueldo", type: "income", color: "#2E8A62" }]}
        today="2026-10-26"
        rule={{
          id: "r1",
          account_id: "demo-bnb",
          category_id: "c-salary",
          type: "income",
          amount: "12000.00",
          currency: "BOB",
          description: "Sueldo",
          frequency: "monthly",
          next_due_on: "2026-11-01",
          auto_post: false,
          pending_dates: ["2026-11-01"],
        }}
      />,
    );
    expect((screen.getByLabelText("Monto (Bs)") as HTMLInputElement).value).toBe("12000,00");
    expect(screen.queryByLabelText("Primer vencimiento")).toBeNull();
    expect(screen.getByRole("radio", { name: "Cada mes" }).getAttribute("aria-checked")).toBe(
      "true",
    );
  });
});
