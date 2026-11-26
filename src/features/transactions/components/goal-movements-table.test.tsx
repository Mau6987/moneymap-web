// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CurrencyCatalog } from "@/lib/money/currency";

import { demoMapGateway } from "../../map/data/demo-map-gateway";
import { DEMO_ACCOUNTS, demoTransactionsGateway } from "../data/demo-transactions-gateway";
import { GoalMovementsTable } from "./goal-movements-table";

const catalog = new CurrencyCatalog(await demoMapGateway.currencies(""));

describe("REQ-056 filtro Metas", () => {
  it("shows each contribution leaving its account and each withdrawal coming back", async () => {
    const { items } = await demoTransactionsGateway.goalMovements("", { limit: 50 });
    render(
      <GoalMovementsTable
        items={items}
        accounts={DEMO_ACCOUNTS}
        catalog={catalog}
        hidden={false}
        today="2026-11-03"
      />,
    );

    const withdrawal = within(screen.getByTestId("goal-movement-gm3"));
    expect(withdrawal.getByText("Retiro de Fondo de emergencia")).toBeTruthy();
    expect(withdrawal.getByText("+Bs 100")).toBeTruthy();

    const contribution = within(screen.getByTestId("goal-movement-gm2"));
    expect(contribution.getByText("Aporte a Fondo de emergencia")).toBeTruthy();
    expect(contribution.getByText("−Bs 300")).toBeTruthy();
    expect(contribution.getAllByText("Tarjeta BNB").length).toBeGreaterThan(0);
  });

  it("filters by account like the history", async () => {
    const { items } = await demoTransactionsGateway.goalMovements("", { account_id: "demo-bnb" });

    expect(items.map((m) => m.id)).toEqual(["gm2"]);
  });
});
