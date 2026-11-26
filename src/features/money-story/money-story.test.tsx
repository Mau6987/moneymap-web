// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { demoMapGateway } from "@/features/map/data/demo-map-gateway";
import { CurrencyCatalog } from "@/lib/money/currency";

import { StoryBody } from "./components/story-body";
import { demoMoneyStoryGateway, lastClosedPeriod } from "./data/money-story-gateway";
import { changeOf, highlightText, monthsBetween, savingsPercent } from "./domain/story";

const catalog = new CurrencyCatalog(await demoMapGateway.currencies(""));
const month = await demoMoneyStoryGateway.month("");
const [bob, usd] = month.items as [(typeof month.items)[0], (typeof month.items)[0]];

describe("Money Story", () => {
  it("without a period it is the last closed month", () => {
    expect(lastClosedPeriod("2026-10-23")).toBe("2026-09");
    expect(lastClosedPeriod("2026-01-05")).toBe("2025-12");
    expect(monthsBetween("2026-08", "2026-09")).toBe(1);
  });

  it("RF-1 the saving rate is a whole percent, null without income", () => {
    expect(savingsPercent("0.2700")).toBe(27);
    expect(savingsPercent("0.5875")).toBe(59);
    expect(savingsPercent(null)).toBeNull();
  });

  it("RF-2 the change against the month before has a direction, not a judgement", () => {
    expect(changeOf("3240.00", "3000.00")).toEqual({ arrow: "↑", amount: "240" });
    expect(changeOf("8760.00", "9000.00")).toEqual({ arrow: "↓", amount: "240" });
    expect(changeOf("12000.00", "12000.00").arrow).toBeNull();
  });

  it("RF-4 writes the highlights and skips keys it does not know", () => {
    const money = (amount: string) => `Bs ${amount}`;
    expect(
      highlightText(
        { key: "summary", params: { month: "2026-09", income: "1", expense: "2" }, text: "" },
        money,
      ),
    ).toBe("En septiembre entraron Bs 1 y salieron Bs 2.");
    expect(highlightText({ key: "first_month", params: {}, text: "" }, money)).toBeNull();
    expect(highlightText({ key: "brand_new", params: {}, text: "x" }, money)).toBeNull();
  });

  it("RF-1 to RF-4 shows totals, the month before and the highlights", () => {
    render(<StoryBody story={bob} catalog={catalog} hidden={false} />);

    const totals = screen.getByTestId("story-totals");
    expect(within(totals).getByText("Bs 12.000")).toBeTruthy();
    expect(within(totals).getByText("27 %")).toBeTruthy();
    const comparison = screen.getByTestId("story-comparison");
    expect(within(comparison).getByText("↑ Bs 240")).toBeTruthy();
    expect(within(comparison).getByText("= igual")).toBeTruthy();
    expect(screen.getByText("Tu mayor gasto fue Comida: Bs 2.600.")).toBeTruthy();
    expect(screen.queryByTestId("story-first-month")).toBeNull();
  });

  it("RF-3 the first month says there is nothing to compare", () => {
    render(<StoryBody story={usd} catalog={catalog} hidden={false} />);

    expect(screen.getByTestId("story-first-month")).toBeTruthy();
    expect(screen.queryByTestId("story-comparison")).toBeNull();
  });

  it("private mode hides every amount and the rate", () => {
    render(<StoryBody story={bob} catalog={catalog} hidden />);

    expect(screen.queryByText(/Bs \d/)).toBeNull();
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.getByText("Ahorraste Bs ••••: el 27 % de lo que entró.")).toBeTruthy();
  });
});
