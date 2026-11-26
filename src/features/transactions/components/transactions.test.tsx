// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CurrencyCatalog } from "@/lib/money/currency";
import { HIDDEN_AMOUNT } from "@/lib/money/money";

import { demoMapGateway } from "../../map/data/demo-map-gateway";
import type { Transaction } from "../../map/data/map-gateway";
import { DEMO_ACCOUNTS } from "../data/demo-transactions-gateway";
import { parseFilters } from "../domain/filters";
import { TransactionsFilters } from "./transactions-filters";
import { TransactionsTable } from "./transactions-table";

const catalog = new CurrencyCatalog(await demoMapGateway.currencies(""));
const categories = await demoMapGateway.categories("");

const tx = (over: Partial<Transaction>): Transaction => ({
  id: "t1",
  kind: "expense",
  account_id: "demo-cash",
  category_id: "c-food",
  transfer_account_id: null,
  amount: "186.00",
  currency: "BOB",
  occurred_on: "2026-10-20",
  description: "Hipermaxi",
  source: "quick_add",
  created_at: "2026-10-20T12:00:00Z",
  has_receipt: false,
  ...over,
});

const table = (items: Transaction[], extra: { hidden?: boolean; account?: string } = {}) =>
  render(
    <TransactionsTable
      items={items}
      accounts={DEMO_ACCOUNTS}
      categories={categories}
      catalog={catalog}
      hidden={extra.hidden ?? false}
      account={extra.account ?? ""}
      today="2026-10-21"
    />,
  );

describe("TransactionsTable", () => {
  it("shows expenses with − and incomes with +, each in its currency", () => {
    table([
      tx({}),
      tx({ id: "t2", kind: "income", amount: "8000.00", description: "Sueldo" }),
      tx({ id: "t3", amount: "15.00", currency: "USD", description: "Netflix" }),
    ]);

    expect(within(screen.getByTestId("transaction-t1")).getByText("−Bs 186")).toBeTruthy();
    expect(within(screen.getByTestId("transaction-t2")).getByText("+Bs 8.000")).toBeTruthy();
    expect(within(screen.getByTestId("transaction-t3")).getByText("−$ 15")).toBeTruthy();
    expect(
      within(screen.getByTestId("transaction-t1")).getAllByText("Comida").length,
    ).toBeGreaterThan(0);
  });

  it("a transfer shows origin → destination; into the chosen account it comes in", () => {
    const transfer = tx({
      kind: "transfer",
      category_id: null,
      description: "",
      account_id: "demo-cash",
      transfer_account_id: "demo-bnb",
    });
    const { unmount } = table([transfer]);
    expect(screen.getAllByText("Efectivo → Tarjeta BNB").length).toBeGreaterThan(0);
    expect(screen.getByText("Bs 186")).toBeTruthy();
    unmount();

    table([transfer], { account: "demo-bnb" });
    expect(screen.getByText("+Bs 186")).toBeTruthy();
  });

  it("groups the rows by day: today, yesterday and then the weekday", () => {
    table([
      tx({ id: "t1", occurred_on: "2026-10-21" }),
      tx({ id: "t2", occurred_on: "2026-10-20" }),
      tx({ id: "t3", occurred_on: "2026-10-20" }),
      tx({ id: "t4", occurred_on: "2026-10-18" }),
    ]);

    const days = screen.getAllByRole("columnheader").map((th) => th.textContent);
    expect(days).toEqual(expect.arrayContaining(["Hoy", "Ayer", "Domingo, 18 de octubre"]));
    expect(screen.getAllByRole("rowgroup")).toHaveLength(4);
  });

  it("private mode hides the amounts", () => {
    table([tx({})], { hidden: true });

    expect(screen.getByText(`−Bs ${HIDDEN_AMOUNT}`)).toBeTruthy();
  });
});

describe("TransactionsFilters", () => {
  it("folds date, account, category and currency until one is set", () => {
    const { unmount } = render(
      <TransactionsFilters
        filters={parseFilters({ q: "taxi" })}
        accounts={DEMO_ACCOUNTS}
        categories={categories}
        currencies={["BOB"]}
      />,
    );
    expect((screen.getByTestId("transactions-more-filters") as HTMLDetailsElement).open).toBe(
      false,
    );
    unmount();

    render(
      <TransactionsFilters
        filters={parseFilters({ category: "c-food" })}
        accounts={DEMO_ACCOUNTS}
        categories={categories}
        currencies={["BOB"]}
      />,
    );
    const details = screen.getByTestId("transactions-more-filters") as HTMLDetailsElement;
    expect(details.open).toBe(true);
    expect(within(details).getByText("Filtros · 1")).toBeTruthy();
  });

  it("keeps the filters in the form and the kind as links", () => {
    render(
      <TransactionsFilters
        filters={parseFilters({ kind: "income", q: "taxi", account: "demo-usd" })}
        accounts={DEMO_ACCOUNTS}
        categories={categories}
        currencies={["BOB", "USD"]}
      />,
    );

    expect(screen.getByRole("link", { current: "page" }).textContent).toBe("Ingresos");
    expect((screen.getByPlaceholderText("Buscar movimiento") as HTMLInputElement).value).toBe(
      "taxi",
    );
    expect((screen.getByLabelText("Cuenta") as HTMLSelectElement).value).toBe("demo-usd");
    expect(screen.getByRole("option", { name: "Tarjeta USD · USD" })).toBeTruthy();
    expect(screen.getByText("Filtros · 1")).toBeTruthy();
  });

  it("one currency has no currency filter", () => {
    render(
      <TransactionsFilters
        filters={parseFilters({})}
        accounts={DEMO_ACCOUNTS.slice(0, 2)}
        categories={categories}
        currencies={["BOB"]}
      />,
    );

    expect(screen.queryByLabelText("Moneda")).toBeNull();
  });
});
