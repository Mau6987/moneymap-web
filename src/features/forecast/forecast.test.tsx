// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LineChart } from "@/components/line-chart";

import type { Forecast } from "../map/data/map-gateway";
import { changeFromToday, chartValues, isHorizon, lowestBalance, pointAt } from "./domain/forecast";

const point = (days: 30 | 60 | 90, balance: string) => ({
  days,
  on: "2026-11-25",
  balance,
  recurring_income: "0",
  recurring_expenses: "0",
  goal_contributions: "0",
  variable_spending: "0",
});

const forecast: Forecast = {
  currency: "BOB",
  balance: "4250.00",
  points: [point(30, "4675.00"), point(60, "-120.50"), point(90, "300.00")],
  goes_negative_on: "2026-12-10",
  limited_history: false,
  assumptions: {
    recurring_income: "12000.00",
    recurring_expenses: "700.00",
    goal_contributions: "500.00",
    variable_spending: "6300.00",
    history_months: 3,
  },
};

describe("Forecast (MM-173)", () => {
  it("picks the horizon and only accepts 30, 60 or 90", () => {
    expect(pointAt(forecast, 60)?.balance).toBe("-120.50");
    expect(isHorizon("90")).toBe(true);
    expect(isHorizon("45")).toBe(false);
  });

  it("the change from today and the lowest point are exact, from the API's points", () => {
    expect(changeFromToday(forecast, "4675.00")).toBe("425");
    expect(lowestBalance(forecast)).toBe("-120.5");
    expect(chartValues(forecast)).toEqual(["4250.00", "4675.00", "-120.50", "300.00"]);
  });

  it("the chart reads its amounts aloud and draws the zero line when it goes negative", () => {
    const { container } = render(
      <LineChart
        series={[{ values: chartValues(forecast), tone: "coral" }]}
        labels={["Hoy", "30 días", "60 días", "90 días"]}
        highlight={2}
        label="Saldo proyectado: hoy Bs 4.250"
      />,
    );
    expect(screen.getByRole("img", { name: "Saldo proyectado: hoy Bs 4.250" })).toBeTruthy();
    expect(container.querySelector('line[stroke-dasharray="6 6"]')).not.toBeNull();
    expect(container.querySelector("circle")).not.toBeNull();
  });
});
