// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CurrencyCatalog } from "@/lib/money/currency";
import { HIDDEN_AMOUNT } from "@/lib/money/money";

import { demoTransactionsGateway } from "../../transactions/data/demo-transactions-gateway";
import { demoMapGateway } from "../data/demo-map-gateway";
import type { CurrencyBlock } from "../map-data";
import { CurrencyTabs } from "./currency-tabs";
import { BudgetsCard, ringText, SafeToSpendCard } from "./map-cards";
import type { RecurringRule } from "../../recurring/data/recurring-gateway";

vi.mock("../../recurring/recurring-actions", () => ({ payRule: vi.fn() }));

const { AllCurrencies, DuePaymentsCard, EmptyMap, MonthChip, PastMonth, SetupCard } =
  await import("./map-states");

const catalog = new CurrencyCatalog(await demoMapGateway.currencies(""));
const view = { catalog, hidden: false };

async function block(currency: string): Promise<CurrencyBlock> {
  const balance = (await demoMapGateway.balances("")).find((b) => b.currency === currency)!;
  return {
    balance,
    safeToSpend: await demoMapGateway.safeToSpend("", currency),
    position: await demoMapGateway.position("", currency),
  };
}

describe("SafeToSpendCard", () => {
  it("RF-1 shows the accounts' total with the period's income, expenses and bills to pay", async () => {
    render(<SafeToSpendCard block={await block("BOB")} view={view} today="2026-10-15" isMain />);

    expect(screen.getByTestId("map-total-amount").textContent).toBe("Bs 2.500");
    expect(screen.getByText("total")).toBeTruthy();
    expect(screen.getByText("+Bs 12.000")).toBeTruthy();
    expect(screen.getByText("−Bs 6.300")).toBeTruthy();
    expect(screen.getByText("Cuentas por pagar")).toBeTruthy();
    expect(screen.getByTestId("map-payables").textContent).toBe("Bs 700");
    expect(screen.getByRole("link").getAttribute("href")).toBe("/safe-to-spend?currency=BOB");
  });

  it("the ring draws what is free, the bills to pay and what was spent", async () => {
    render(<SafeToSpendCard block={await block("BOB")} view={view} today="2026-10-15" isMain />);

    expect(screen.getByTestId("map-ring-free")).toBeTruthy();
    expect(screen.getByTestId("map-ring-payables")).toBeTruthy();
    expect(screen.getByTestId("map-ring-spent")).toBeTruthy();
  });

  it("RF-9 a negative Safe to Spend says so and draws nothing free", async () => {
    const negative = await block("BOB");
    negative.safeToSpend = { ...negative.safeToSpend, amount: "-300.00" };
    render(<SafeToSpendCard block={negative} view={view} today="2026-10-15" isMain />);

    expect(screen.getByText("Te pasaste")).toBeTruthy();
    expect(screen.queryByTestId("map-ring-free")).toBeNull();
  });

  it("RF-11 private mode hides every amount", async () => {
    render(
      <SafeToSpendCard
        block={await block("BOB")}
        view={{ catalog, hidden: true }}
        today="2026-10-15"
        isMain
      />,
    );

    expect(screen.getByTestId("map-total-amount").textContent).toBe(`Bs ${HIDDEN_AMOUNT}`);
    expect(screen.queryByText("+Bs 12.000")).toBeNull();
  });
});

describe("currencies", () => {
  it("RF-3 one tab per currency and Todas; one currency has no tabs", () => {
    const { rerender } = render(<CurrencyTabs codes={["BOB", "USD"]} selected="USD" />);

    expect(screen.getByRole("link", { current: "page" }).textContent).toBe("USD");
    expect(screen.getByText("Todas").getAttribute("href")).toBe("/map?currency=ALL");

    rerender(<CurrencyTabs codes={["BOB"]} selected="BOB" />);
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("RF-3 Todas shows every currency apart, never a total", async () => {
    render(<AllCurrencies blocks={[await block("BOB"), await block("USD")]} view={view} />);

    expect(within(screen.getByTestId("map-all-BOB")).getByText("Bs 1.000")).toBeTruthy();
    expect(within(screen.getByTestId("map-all-USD")).getByText("$ 350")).toBeTruthy();
    expect(screen.getByText("Cada moneda por separado, sin sumarlas")).toBeTruthy();
  });
});

describe("other cards", () => {
  it("RF-5 the empty Map says so", () => {
    render(<EmptyMap label="Bs" />);

    expect(screen.getByText("Tu mapa está vacío")).toBeTruthy();
  });

  it("BUG-040 Completa tu mapa shows the steps already done, as the app", () => {
    render(<SetupCard setup={{ hasIncome: true, hasExpenses: false }} />);

    expect(screen.getByText("1 de 3")).toBeTruthy();
    expect(screen.getByText("Hecho")).toBeTruthy();
    expect(screen.getByText("Agrega tu ingreso").closest("a")?.getAttribute("href")).toBe(
      "/recurring/income",
    );
    expect(screen.getByText("Agrega gastos fijos").closest("a")?.getAttribute("href")).toBe(
      "/recurring/expenses",
    );
  });

  it("BUG-040 the payments due today go on top with Pagar; none, no card", async () => {
    const rent: RecurringRule = {
      id: "r-rent",
      account_id: "bnb",
      category_id: "c-home",
      type: "expense",
      amount: "700.00",
      currency: "BOB",
      description: "Alquiler",
      frequency: "monthly",
      next_due_on: "2026-10-15",
      auto_post: false,
    } as RecurringRule;
    const accounts = (await demoTransactionsGateway.accounts("")).filter(
      (a) => a.currency === "BOB",
    );
    const { container, rerender } = render(
      <DuePaymentsCard rules={[rent]} today="2026-10-15" view={view} accounts={accounts} />,
    );

    expect(screen.getByText("Tienes un pago para hoy")).toBeTruthy();

    // BUG-027: "Pagar" pregunta con qué cuenta, con su saldo, como la app.
    await userEvent.click(screen.getByRole("button", { name: "Pagar" }));
    expect(screen.getByText("¿Con qué cuenta pagas?")).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Efectivo.*Bs 900/ })).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: /Tarjeta BNB/ }));
    const account = container.querySelector<HTMLInputElement>('input[name="account"]');
    expect(account?.value).toBe("demo-bnb");

    rerender(<DuePaymentsCard rules={[]} today="2026-10-15" view={view} accounts={accounts} />);
    expect(screen.queryByTestId("map-due")).toBeNull();
  });

  it("BUG-040 the month chip offers the last 12 months, the current one first", () => {
    render(<MonthChip today="2026-11-03" shown={null} currency="USD" />);

    const links = within(screen.getByTestId("map-month")).getAllByRole("link");
    expect(links).toHaveLength(12);
    expect(links[0]!.textContent).toBe("Noviembre de 2026 · este mes");
    expect(links[0]!.getAttribute("href")).toBe("/map?currency=USD");
    expect(links[0]!.getAttribute("aria-current")).toBe("page");
    expect(links[2]!.getAttribute("href")).toBe("/map?month=2026-09&currency=USD");
    expect(links[11]!.textContent).toBe("Diciembre de 2025");
  });

  it("BUG-040 a past month shows what came in, went out and was saved", () => {
    render(
      <PastMonth
        month="2026-09-01"
        currency="BOB"
        view={view}
        position={{
          currency: "BOB",
          period_starts_on: "2026-09-01",
          period_ends_on: "2026-09-30",
          available_balance: "3200.00",
          income: "5000.00",
          expenses: "1800.00",
          saved: "200.00",
        }}
      />,
    );

    expect(screen.getByText("Septiembre de 2026")).toBeTruthy();
    expect(screen.getByText("+Bs 5.000")).toBeTruthy();
    expect(screen.getByText("−Bs 1.800")).toBeTruthy();
    expect(screen.getByText("Bs 3.200")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Ver los movimientos de Septiembre de 2026" })
        .getAttribute("href"),
    ).toBe("/transactions?date=range&from=2026-09-01&to=2026-09-30&currency=BOB");
    expect(screen.getByRole("link", { name: "Volver a este mes" }).getAttribute("href")).toBe(
      "/map?currency=BOB",
    );
  });

  it("budgets show their pace; without any it invites to create one", async () => {
    const { rerender } = render(
      <BudgetsCard budgets={await demoMapGateway.budgets("")} today="2026-10-15" />,
    );

    expect(screen.getByText("Muy rápido")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Comida: 60 % usado" })).toBeTruthy();

    rerender(<BudgetsCard budgets={[]} today="2026-10-15" />);
    expect(screen.getByTestId("map-budgets-empty").getAttribute("href")).toBe("/budgets/new");
  });
});

describe("ringText", () => {
  it("MM-181 shrinks long amounts so they stay inside the ring", () => {
    expect(ringText("Bs 1.000")).toBe("text-[22px]");
    expect(ringText("Bs 12.345")).toBe("text-lg");
    expect(ringText("Bs 12.345,67")).toBe("text-[15px]");
  });
});
