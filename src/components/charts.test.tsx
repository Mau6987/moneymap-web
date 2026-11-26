// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Budget } from "@/features/map/data/map-gateway";
import { weeklySpend } from "@/features/budgets/domain/weeks";

import { BarGroups } from "./bar-groups";
import { LineChart } from "./line-chart";
import { WaterfallChart } from "./waterfall-chart";

describe("Gráficos de los mockups (MM-174)", () => {
  it("the waterfall reads its amounts aloud and hangs each step from the one before", () => {
    const { container } = render(
      <WaterfallChart
        label="Cascada: saldo Bs 2.500"
        steps={[
          { label: "Saldo", amount: "2500", text: "Bs 2.500", kind: "start", tone: "ink" },
          { label: "Fijos", amount: "700", text: "−Bs 700", kind: "minus", tone: "coral" },
          { label: "Ahorro", amount: "500", text: "−Bs 500", kind: "minus", tone: "primary" },
          { label: "Metas", amount: "300", text: "−Bs 300", kind: "minus", tone: "amber" },
          { label: "Libre", amount: "1000", text: "Bs 1.000", kind: "result", tone: "green" },
        ]}
      />,
    );
    expect(screen.getByRole("img", { name: "Cascada: saldo Bs 2.500" })).toBeTruthy();
    const bars = [...container.querySelectorAll<HTMLElement>(".absolute")];
    expect(bars.map((b) => b.style.bottom)).toEqual(["0%", "72%", "52%", "40%", "0%"]);
  });

  it("the bars of a group: the last one in the group's color", () => {
    const { container } = render(
      <BarGroups
        label="Entró, salió y ahorro"
        legend={["Septiembre", "Octubre"]}
        groups={[{ label: "Ganaste", values: ["1000", "2000"], tone: "green" }]}
      />,
    );
    const bars = container.querySelectorAll<HTMLElement>('[role="img"] [aria-hidden="true"]');
    expect(bars[1]!.className).toContain("bg-green");
    expect(bars[1]!.style.height).toContain("100%");
    expect(screen.getByText("Octubre")).toBeTruthy();
  });

  it("a series can start further along: the goal's projection goes from today", () => {
    const { container } = render(
      <LineChart
        series={[
          { values: ["0", "2500"], tone: "primary" },
          { values: ["2500", "5000"], tone: "primary", dashed: true, start: 1 },
        ]}
        guide="5000"
        labels={["Inicio", "Hoy", "Mar 2027"]}
        highlight={1}
        label="Proyección de ahorro"
      />,
    );
    expect(container.querySelectorAll("path[stroke-dasharray]")).toHaveLength(1);
    expect(container.querySelectorAll('line[stroke-dasharray="6 6"]')).toHaveLength(1);
  });

  it("the weekly spend adds the API's daily spend by week of the month", () => {
    const budget = {
      period_starts_on: "2026-10-01",
      period_ends_on: "2026-10-31",
      daily: [
        { on: "2026-10-02", spent: "100.50", cumulative: "100.50" },
        { on: "2026-10-07", spent: "20.00", cumulative: "120.50" },
        { on: "2026-10-08", spent: "35.00", cumulative: "155.50" },
        { on: "2026-10-30", spent: "10.00", cumulative: "165.50" },
      ],
    } as unknown as Budget;
    expect(weeklySpend(budget)).toEqual(["120.5", "35", "0", "0", "10"]);
  });
});
