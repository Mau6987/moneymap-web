// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { catalogs } from "@/lib/i18n/catalog";
import type { CurrencyInfo } from "@/lib/money/currency";

import { ReadyStep } from "./components/ready-step";

vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  withAccessToken: (call: (token: string) => unknown) => call("token"),
}));
vi.mock("@/lib/i18n/server", () => ({
  getMessages: async () => catalogs.es,
  useServerMessages: () => catalogs.es,
}));
vi.mock("./data/onboarding-gateway", () => ({
  onboardingGateway: () => ({
    complete: async () => ({
      currency: "BOB",
      period_starts_on: "2026-10-01",
      period_ends_on: "2026-10-31",
      income: "3000.00",
      committed: "700.00",
      balance: "2500.00",
      safe_to_spend: "1800.00",
    }),
  }),
}));

const currencies: CurrencyInfo[] = [
  {
    code: "BOB",
    name: "Boliviano",
    symbol: "Bs",
    decimals: 2,
    is_active: true,
    is_mine: true,
    is_main_currency: true,
  },
];

describe("ReadyStep", () => {
  it("BUG-048 shows the Map's Safe to Spend card, with the ring", async () => {
    render(
      await ReadyStep({
        currencies,
        status: {
          completed: false,
          main_currency: "BOB",
          accounts: 1,
          income_rules: 1,
          expense_rules: 2,
        } as Parameters<typeof ReadyStep>[0]["status"],
      }),
    );

    const card = within(screen.getByTestId("onboarding-safe-to-spend"));
    // El total de las cuentas en el centro del anillo, como en el Map.
    expect(card.getByTestId("onboarding-total").textContent).toBe("Bs 2.500");
    expect(card.getByTestId("onboarding-ring-free")).toBeTruthy();
    expect(card.getByTestId("onboarding-ring-payables")).toBeTruthy();
    expect(card.getByText("+Bs 3.000")).toBeTruthy();
    expect(card.getByText("−Bs 700")).toBeTruthy();
    expect(card.getByTestId("onboarding-safe-amount").textContent).toBe("Bs 1.800");
  });
});
