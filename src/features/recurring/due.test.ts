import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RecurringRule } from "./data/recurring-gateway";
import { ApiError } from "@/lib/api/errors";
import { recurringErrorText } from "@/lib/i18n/recurring-messages";

import { dueRules, ruleOccurrences } from "./domain/due";

const gateway = vi.hoisted(() => ({ pay: vi.fn(), skip: vi.fn() }));

vi.mock("./data/recurring-gateway", () => ({ recurringGateway: () => gateway }));
vi.mock("@/lib/auth/session", () => ({
  withAccessToken: (call: (token: string) => unknown) => call("token"),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
  unstable_rethrow: () => {},
}));

const { payRule } = await import("./recurring-actions");

const rule = (overrides: Partial<RecurringRule>): RecurringRule => ({
  id: "r-rent",
  account_id: "bnb",
  category_id: "c-home",
  type: "expense",
  amount: "700.00",
  currency: "BOB",
  description: "Alquiler",
  frequency: "monthly",
  next_due_on: "2026-10-10",
  auto_post: false,
  pending_dates: ["2026-10-10"],
  ...overrides,
});

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

beforeEach(() => vi.clearAllMocks());

describe("cuentas por pagar", () => {
  const rules = [
    rule({ id: "later", next_due_on: "2026-10-20" }),
    rule({ id: "today", next_due_on: "2026-10-15", amount: "150.50" }),
    rule({ id: "old", next_due_on: "2026-09-01", type: "income", amount: "12000.00" }),
    rule({ id: "usd", next_due_on: "2026-10-01", currency: "USD" }),
  ];

  it("son los fijos vencidos o de hoy en la moneda, el más viejo primero", () => {
    expect(dueRules(rules, "BOB", "2026-10-15").map((r) => r.id)).toEqual(["old", "today"]);
  });
});

describe("las veces por pagar", () => {
  const dates = (rules: RecurringRule[]) =>
    ruleOccurrences(rules).map(({ rule: r, dueOn, after }) => [r.id, dueOn, after]);

  it("QA: lo vencido de octubre y lo de noviembre, la más vieja primero", () => {
    const rules = [
      rule({
        id: "internet",
        next_due_on: "2026-10-30",
        pending_dates: ["2026-10-30", "2026-11-30"],
      }),
      rule({
        id: "transporte",
        next_due_on: "2026-10-29",
        pending_dates: ["2026-10-29", "2026-11-29"],
      }),
    ];

    expect(dates(rules)).toEqual([
      ["transporte", "2026-10-29", undefined],
      ["internet", "2026-10-30", undefined],
      ["transporte", "2026-11-29", "2026-10-29"],
      ["internet", "2026-11-30", "2026-10-30"],
    ]);
  });

  it("cada vez se paga después de la anterior, no de la primera", () => {
    const rules = [
      rule({
        next_due_on: "2026-09-01",
        pending_dates: ["2026-09-01", "2026-10-01", "2026-11-01"],
      }),
    ];

    expect(dates(rules).map(([, , after]) => after)).toEqual([
      undefined,
      "2026-09-01",
      "2026-10-01",
    ]);
  });

  it("uno al día sale una sola vez, con su próximo vencimiento", () => {
    expect(dates([rule({ next_due_on: "2026-12-29", pending_dates: ["2026-12-29"] })])).toEqual([
      ["r-rent", "2026-12-29", undefined],
    ]);
  });

  it("con un back sin pending_dates sigue mostrando next_due_on", () => {
    const old = rule({ next_due_on: "2026-10-29" }) as Partial<RecurringRule>;
    delete old.pending_dates;

    expect(dates([old as RecurringRule])).toEqual([["r-rent", "2026-10-29", undefined]]);
  });
});

describe("payRule", () => {
  it("al pagar desde el Map vuelve al Map en la misma moneda", async () => {
    await expect(
      payRule(form({ id: "r-rent", kind: "expenses", back: "/map", currency: "USD" })),
    ).rejects.toThrow("redirect:/map?saved=paid&currency=USD");
    expect(gateway.pay).toHaveBeenCalledWith("token", "r-rent", expect.any(String), undefined);
  });

  it("BUG-027 paga con la cuenta que se eligió", async () => {
    await expect(
      payRule(form({ id: "r-rent", kind: "expenses", account: "cash" })),
    ).rejects.toThrow("redirect:/recurring/expenses?saved=paid");
    expect(gateway.pay).toHaveBeenCalledWith("token", "r-rent", expect.any(String), "cash");
  });

  it("ya pagado por fuera: pasa al siguiente sin registrar el pago", async () => {
    await expect(
      payRule(form({ id: "r-rent", kind: "expenses", back: "/map", intent: "skip" })),
    ).rejects.toThrow("redirect:/map?saved=skipped");
    expect(gateway.skip).toHaveBeenCalledWith("token", "r-rent");
    expect(gateway.pay).not.toHaveBeenCalled();
  });

  it("un origen desconocido vuelve a Fijos", async () => {
    await expect(
      payRule(form({ id: "r-rent", kind: "income", back: "https://otro.sitio" })),
    ).rejects.toThrow("redirect:/recurring/income?saved=paid");
  });

  it("sin saldo en la cuenta lo explica, no dice 'Algo salió mal'", async () => {
    gateway.pay.mockRejectedValueOnce(new ApiError("account_insufficient", 422));
    await expect(payRule(form({ id: "r-rent", kind: "expenses" }))).rejects.toThrow(
      "redirect:/recurring/expenses?error=account_insufficient",
    );

    expect(recurringErrorText("account_insufficient")).toBe(
      "La cuenta no tiene saldo suficiente para pagarlo",
    );
    expect(recurringErrorText("account_required")).toContain("no tiene cuenta");
  });
});
