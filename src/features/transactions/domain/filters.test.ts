import { describe, expect, it } from "vitest";

import type { Transaction } from "../../map/data/map-gateway";
import {
  activeCount,
  byKind,
  filtersHref,
  monthRange,
  parseFilters,
  periodKind,
  periodRanges,
  toGoalMovementsQuery,
  toQuery,
} from "./filters";

const tx = (kind: string, account: string, transfer: string | null = null): Transaction => ({
  id: `${kind}-${account}`,
  kind,
  account_id: account,
  category_id: null,
  transfer_account_id: transfer,
  amount: "10.00",
  currency: "BOB",
  occurred_on: "2026-10-10",
  description: "",
  source: "manual",
  created_at: "2026-10-10T00:00:00Z",
  has_receipt: false,
});

describe("filters", () => {
  it("reads the URL and ignores what it does not understand", () => {
    const f = parseFilters({ kind: "income", date: "year", from: "ayer", q: " super " });

    expect(f.kind).toBe("income");
    expect(f.date).toBe("all");
    expect(f.from).toBe("");
    expect(f.q).toBe("super");
  });

  it("RF-32 this month, last month and a range go as from and to", () => {
    expect(monthRange("2026-10-23")).toEqual(["2026-10-01", "2026-10-31"]);
    expect(monthRange("2026-01-15", -1)).toEqual(["2025-12-01", "2025-12-31"]);

    const range = parseFilters({ date: "range", from: "2026-09-05", to: "2026-09-20" });
    expect(toQuery(range, "2026-10-23")).toMatchObject({ from: "2026-09-05", to: "2026-09-20" });
    expect(toQuery(parseFilters({ account: "a1", q: "taxi" }), "2026-10-23")).toEqual({
      limit: 50,
      account_id: "a1",
      q: "taxi",
    });
  });

  it("a transfer that arrives at the chosen account is money that comes in", () => {
    const items = [tx("expense", "a1"), tx("income", "a1"), tx("transfer", "a2", "a1")];

    expect(byKind(items, "income", "a1").map((t) => t.kind)).toEqual(["income", "transfer"]);
    expect(byKind(items, "expense", "a1").map((t) => t.kind)).toEqual(["expense"]);
  });

  it("REQ-056 Metas asks the goal movements with the same filters, without search or category", () => {
    const filters = parseFilters({
      kind: "goals",
      account: "a1",
      currency: "BOB",
      q: "taxi",
      category: "c1",
      date: "month",
    });

    expect(filters.kind).toBe("goals");
    expect(toGoalMovementsQuery(filters, "2026-10-23")).toEqual({
      limit: 50,
      from: "2026-10-01",
      to: "2026-10-31",
      account_id: "a1",
      currency: "BOB",
    });
    expect(byKind([tx("expense", "a1")], "goals", "")).toEqual([]);
  });

  it("REQ-056 Transferencias leaves only the transfers", () => {
    const items = [tx("expense", "a1"), tx("income", "a1"), tx("transfer", "a2", "a1")];

    expect(parseFilters({ kind: "transfer" }).kind).toBe("transfer");
    expect(byKind(items, "transfer", "").map((t) => t.kind)).toEqual(["transfer"]);
    expect(byKind(items, "transfer", "a1").map((t) => t.kind)).toEqual(["transfer"]);
  });

  it("builds the URL without empty filters and drops the cursor on a change", () => {
    const f = parseFilters({ kind: "expense", cursor: "50", currency: "USD" });

    expect(filtersHref(f, { kind: "all" })).toBe("/transactions?currency=USD");
    expect(activeCount(f)).toBe(1);
  });
});

describe("filtros por periodo, como la app", () => {
  it("knows the kind of period by its length", () => {
    expect(periodKind("2026-11-02", "2026-11-08")).toBe("weekly");
    expect(periodKind("2026-11-01", "2026-11-15")).toBe("semi_monthly");
    expect(periodKind("2026-11-16", "2026-11-30")).toBe("semi_monthly");
    expect(periodKind("2026-11-01", "2026-11-30")).toBe("monthly");
  });

  it("this week and last week", () => {
    expect(periodRanges({ kind: "weekly", startsOn: "2026-11-02", endsOn: "2026-11-08" })).toEqual({
      current: ["2026-11-02", "2026-11-08"],
      previous: ["2026-10-26", "2026-11-01"],
    });
  });

  it("this half-month and the previous one, in both halves", () => {
    expect(
      periodRanges({ kind: "semi_monthly", startsOn: "2026-11-16", endsOn: "2026-11-30" }).previous,
    ).toEqual(["2026-11-01", "2026-11-15"]);
    expect(
      periodRanges({ kind: "semi_monthly", startsOn: "2026-11-01", endsOn: "2026-11-15" }).previous,
    ).toEqual(["2026-10-16", "2026-10-31"]);
  });

  it("the period filter asks the API with its range", () => {
    const period = { kind: "semi_monthly" as const, startsOn: "2026-11-01", endsOn: "2026-11-15" };
    expect(parseFilters({ date: "lastPeriod" }).date).toBe("lastPeriod");
    expect(toQuery(parseFilters({ date: "period" }), "2026-11-03", period)).toMatchObject({
      from: "2026-11-01",
      to: "2026-11-15",
    });
    expect(toQuery(parseFilters({ date: "lastPeriod" }), "2026-11-03", period)).toMatchObject({
      from: "2026-10-16",
      to: "2026-10-31",
    });
  });
});
