import { describe, expect, it } from "vitest";

import type { Position, SafeToSpend } from "../data/map-gateway";
import {
  daysLeft,
  freeShare,
  hasNoMovements,
  isEmptyMap,
  isNegative,
  MIN_RING_SHARE,
  monthEnd,
  pastMonth,
  recentMonths,
  periodDay,
  periodElapsed,
  ringParts,
} from "./map";

const sts = (amount: string, balance: string): SafeToSpend => ({
  currency: "BOB",
  period_starts_on: "2026-10-01",
  period_ends_on: "2026-10-31",
  amount,
  breakdown: {
    current_balance: balance,
    pending_recurring: "0",
    planned_savings: "0",
    goal_contributions: "0",
  },
});

const position = (income: string, expenses: string, saved: string): Position => ({
  currency: "BOB",
  period_starts_on: "2026-10-01",
  period_ends_on: "2026-10-31",
  available_balance: "0",
  income,
  expenses,
  saved,
});

describe("the period", () => {
  it("counts the days left and how much went by", () => {
    expect(daysLeft("2026-10-31", "2026-10-15")).toBe(16);
    expect(daysLeft("2026-10-31", "2026-11-02")).toBe(0);
    expect(periodDay("2026-10-01", "2026-10-31", "2026-10-15")).toEqual([15, 31]);
    expect(periodElapsed("2026-10-01", "2026-10-31", "2026-10-15")).toBeCloseTo(15 / 31);
  });
});

describe("Safe to Spend", () => {
  it("RF-9 a negative result stays negative and the ring is empty", () => {
    expect(isNegative(sts("-300.00", "2500.00"))).toBe(true);
    expect(freeShare(sts("-300.00", "2500.00"))).toBe(0);
  });

  it("the ring measures what is free over the balance", () => {
    expect(freeShare(sts("1000.00", "2500.00"))).toBe(0.4);
  });
});

describe("spec 004 RF-5", () => {
  it("a period without income, expenses or savings is the empty Map", () => {
    expect(hasNoMovements(position("0.00", "0.00", "0.00"))).toBe(true);
    expect(hasNoMovements(position("0.00", "35.00", "0.00"))).toBe(false);
  });
});

describe("BUG-038", () => {
  it("a new user with opening balances is not the empty Map", () => {
    const withMoney = { ...position("0.00", "0.00", "0.00"), available_balance: "2500.00" };
    expect(hasNoMovements(withMoney)).toBe(true);
    expect(isEmptyMap(withMoney)).toBe(false);
    expect(isEmptyMap(position("0.00", "0.00", "0.00"))).toBe(true);
  });
});

describe("ringParts", () => {
  const withDue = (amount: string, balance: string, due: string): SafeToSpend => {
    const base = sts(amount, balance);
    return { ...base, breakdown: { ...base.breakdown, pending_recurring: due } };
  };

  it("splits the balance plus what was spent into spent, to pay and free", () => {
    const parts = ringParts(
      withDue("3000.00", "5000.00", "2000.00"),
      position("10000.00", "5000.00", "0.00"),
    );
    expect(parts).toEqual({ spent: 0.5, payables: 0.2, free: 0.3 });
  });

  it("a small part is never thinner than the minimum, so it is always seen", () => {
    const parts = ringParts(
      withDue("1000.00", "2500.00", "10.00"),
      position("0.00", "0.00", "0.00"),
    );
    expect(parts.payables).toBe(MIN_RING_SHARE);
    expect(parts.spent).toBe(0);
  });

  it("nothing in the accounts and nothing spent draws an empty ring", () => {
    const parts = ringParts(withDue("-300.00", "0.00", "300.00"), position("0.00", "0.00", "0.00"));
    expect(parts).toEqual({ spent: 0, payables: 0, free: 0 });
  });

  it("the three parts never draw more than the whole ring", () => {
    const parts = ringParts(
      withDue("9000.00", "9500.00", "500.00"),
      position("9000.00", "9000.00", "0.00"),
    );
    expect(parts.spent + parts.payables + parts.free).toBeLessThanOrEqual(1);
  });
});

describe("BUG-040 months of the Map", () => {
  it("offers the last 12 months, the current one first", () => {
    const months = recentMonths("2026-01-15");
    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2026-01-01");
    expect(months[1]).toBe("2025-12-01");
    expect(months[11]).toBe("2025-02-01");
  });

  it("only a past month inside the picker opens it", () => {
    expect(pastMonth("2026-09", "2026-11-03")).toBe("2026-09-01");
    expect(pastMonth("2026-11", "2026-11-03")).toBeNull();
    expect(pastMonth("2026-12", "2026-11-03")).toBeNull();
    expect(pastMonth("2025-11", "2026-11-03")).toBeNull();
    expect(pastMonth("septiembre", "2026-11-03")).toBeNull();
    expect(pastMonth(undefined, "2026-11-03")).toBeNull();
  });

  it("knows the last day of a month", () => {
    expect(monthEnd("2026-02-01")).toBe("2026-02-28");
    expect(monthEnd("2028-02-01")).toBe("2028-02-29");
    expect(monthEnd("2026-09-01")).toBe("2026-09-30");
  });
});
