// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PlansView, type PlanCard } from "./components/plans-view";
import { demoPlansGateway } from "./data/plans-gateway";
import {
  cellOf,
  comparisonRows,
  featureLabel,
  fullFeatures,
  initialSelection,
  priceIn,
} from "./domain/plans";

const plans = await demoPlansGateway.plans("");
const mine = await demoPlansGateway.mine("");
const [free, premium] = plans as [(typeof plans)[0], (typeof plans)[0]];

describe("Planes", () => {
  it("RF-1 the rows list every limit once, in the order of the API", () => {
    const rows = comparisonRows(plans);
    expect(rows.map((r) => r.key)).toEqual([
      "finance.cards",
      "finance.currencies",
      "goals.active",
      "planning.budgets",
      "ai.voice_entries",
      "planning.affordability_checks",
      "notify.push",
      "reports.money_story",
    ]);
  });

  it("only Gratuito and Premium are left, and the free plan has unlimited goals", () => {
    expect(plans.map((p) => p.code)).toEqual(["free", "paid_3"]);
    expect(cellOf(free, "goals.active")).toEqual({ kind: "unlimited" });
  });

  it("the limits use the short names of the mockup", () => {
    expect(comparisonRows(plans)[0]).toEqual({ key: "finance.cards", description: "Tarjetas" });
    expect(featureLabel("new.feature", "Algo nuevo")).toBe("Algo nuevo");
  });

  it("a cell is a limit, unlimited, included or not included", () => {
    expect(cellOf(free, "finance.cards")).toEqual({ kind: "limit", limit: 1 });
    expect(cellOf(premium, "ai.voice_entries")).toEqual({ kind: "unlimited" });
    expect(cellOf(premium, "notify.push")).toEqual({ kind: "on" });
    expect(cellOf(premium, "unknown.key")).toEqual({ kind: "off" });
  });

  it("RF-2 the limits already reached are the ones used up", () => {
    expect(fullFeatures(mine).map((f) => f.key)).toEqual(["finance.cards", "finance.currencies"]);
  });

  it("starts on the plan after the user's, and the free plan has no price", () => {
    expect(initialSelection(plans, mine)).toBe("paid_3");
    expect(priceIn(free, "BOB")).toBeUndefined();
    expect(priceIn(premium, "USD")?.currency).toBe("BOB");
  });

  it("monthly or yearly changes the price; choosing has no charge (MM-188)", () => {
    const cards: PlanCard[] = [
      {
        code: "free",
        name: "Gratuito",
        description: null,
        isFree: true,
        tier: 0,
        monthly: null,
        yearly: null,
        savingPct: null,
        cells: { "finance.cards": { kind: "limit", limit: 1 } },
      },
      {
        code: "paid_1",
        name: "Plus",
        description: null,
        isFree: false,
        tier: 1,
        monthly: "Bs 29",
        yearly: "Bs 290",
        savingPct: "16,67",
        cells: { "finance.cards": { kind: "limit", limit: 3 } },
      },
    ];
    render(
      <PlansView
        plans={cards}
        rows={[{ key: "finance.cards", description: "Tarjetas activas" }]}
        current="free"
        initial="paid_1"
        action={async () => ({})}
      />,
    );
    expect(screen.getByTestId("plan-paid_1").textContent).toContain("Bs 29 al mes");
    expect(screen.getByTestId("plan-paid_1-finance.cards").textContent).toContain("3");
    // BUG-042: cada plan dice que el efectivo no tiene límite.
    expect(screen.getByTestId("plan-free-cash").textContent).toBe("Sin límite");
    expect(screen.getByTestId("plan-paid_1-cash").textContent).toBe("Sin límite");
    expect(screen.getAllByText("Efectivo")).toHaveLength(2);
    expect((screen.getByTestId("plans-choose") as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByTestId("plans-note").textContent).toContain("Sin cobro");

    fireEvent.click(screen.getByRole("radio", { name: "Anual" }));
    expect(screen.getByTestId("plan-paid_1").textContent).toContain("Bs 290 al año");
    expect(screen.getByTestId("plans-saving").textContent).toContain("Ahorras 16,67 %");

    // El propio no ofrece comprarse.
    fireEvent.click(screen.getAllByRole("button", { pressed: false })[0]!);
    expect(screen.queryByTestId("plans-choose")).toBeNull();
  });

  it("MM-188 the demo changes the plan and remembers it", async () => {
    const changed = await demoPlansGateway.change("", "paid_3");
    expect(changed.code).toBe("paid_3");
    expect(changed.features.find((f) => f.key === "finance.cards")?.limit).toBeNull();
    expect((await demoPlansGateway.mine("")).code).toBe("paid_3");
    await demoPlansGateway.change("", "free");
    await expect(demoPlansGateway.change("", "no_existe")).rejects.toThrow();
  });
});
