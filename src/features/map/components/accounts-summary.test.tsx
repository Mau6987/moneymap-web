// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CurrencyCatalog } from "@/lib/money/currency";
import { HIDDEN_AMOUNT } from "@/lib/money/money";

import { demoMapGateway } from "../data/demo-map-gateway";
import { DEMO_ACCOUNTS } from "../../transactions/data/demo-transactions-gateway";
import type { Account } from "../../transactions/data/transactions-gateway";
import { AccountsSummary } from "./accounts-summary";

const catalog = new CurrencyCatalog(await demoMapGateway.currencies(""));
const view = { catalog, hidden: false };
const bob = DEMO_ACCOUNTS.filter((a) => a.currency === "BOB");
const card = (overrides: Partial<Account>): Account => ({ ...bob[1]!, ...overrides });

describe("AccountsSummary", () => {
  it("shows Efectivo and Tarjeta with their main account", () => {
    render(<AccountsSummary accounts={bob} currency="BOB" view={view} />);

    const cash = screen.getByTestId("map-accounts-cash");
    expect(within(cash).getAllByText("Efectivo")).toHaveLength(2); // el tipo y la cuenta
    expect(within(cash).getByText("Bs 900")).toBeTruthy();
    const tile = screen.getByTestId("map-accounts-card");
    expect(within(tile).getByText("Bs 3.350")).toBeTruthy();
    expect(within(tile).getByText("TAR •• 4821")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("with more than one card, a tap unfolds the others", async () => {
    const accounts = [
      ...bob,
      card({ id: "c2", name: "Visa Oro", is_default: false, last4: "1111" }),
    ];
    render(<AccountsSummary accounts={accounts} currency="BOB" view={view} />);

    expect(screen.getByText("+1 más")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { expanded: false }));

    const more = screen.getByTestId("map-accounts-more");
    expect(within(more).getByText("Visa Oro")).toBeTruthy();
    expect(within(more).getByText("Tarjeta •• 1111 · BOB")).toBeTruthy();
    expect(within(more).getByRole("link").getAttribute("href")).toBe("/accounts");
  });

  it("private mode hides the balances", () => {
    render(<AccountsSummary accounts={bob} currency="BOB" view={{ catalog, hidden: true }} />);

    expect(screen.getAllByText(`Bs ${HIDDEN_AMOUNT}`)).toHaveLength(2);
  });

  it("without accounts it shows nothing", () => {
    const { container } = render(<AccountsSummary accounts={[]} currency="BOB" view={view} />);
    expect(container.innerHTML).toBe("");
  });
});
