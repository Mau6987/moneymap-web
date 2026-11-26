// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NewAccountForm } from "../accounts/components/account-forms";
import { PlanLimitCard } from "./components/plan-limit-card";
import { asLimit, isFull } from "./plan-limits";

vi.mock("@/lib/auth/session", () => ({ withAccessToken: vi.fn() }));

const cards = {
  key: "finance.cards",
  description: "Tarjetas activas",
  enabled: true,
  limit: 1,
  period: "total",
  used: 1,
};

describe("Límites del plan (MM-188)", () => {
  it("is full only with a limit that is already used", () => {
    expect(isFull(cards)).toBe(true);
    expect(isFull({ ...cards, used: 0 })).toBe(false);
    expect(isFull({ ...cards, limit: null })).toBe(false);
    expect(isFull(undefined)).toBe(false);
  });

  it("the card says what is full and leads to Planes", () => {
    render(<PlanLimitCard limit={asLimit(cards)} />);

    expect(screen.getByText("Llegaste al límite de tu plan")).toBeTruthy();
    expect(screen.getByText(/1 de 1/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver planes" }).getAttribute("href")).toBe("/plans");
  });

  it("a new card past the plan shows the limit instead of Crear", () => {
    render(
      <NewAccountForm
        action={async () => ({})}
        currencies={[{ code: "BOB", name: "Boliviano", decimals: 2 }]}
        limits={{ cards: asLimit(cards), currencies: null, withAccounts: ["BOB"] }}
      />,
    );

    expect(screen.queryByTestId("plan-limit-finance.cards")).toBeNull();
    screen.getByRole("radio", { name: "Tarjeta" }).click();
    return Promise.resolve().then(() => {
      expect(screen.getByTestId("plan-limit-finance.cards")).toBeTruthy();
    });
  });
});
