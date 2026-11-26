// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createAccount } from "./accounts-actions";
import { NewAccountForm } from "./components/account-forms";
import { validateName } from "./domain/account-validation";

vi.mock("@/lib/auth/session", () => ({ withAccessToken: vi.fn() }));

const currencies = [
  { code: "BOB", name: "Boliviano", decimals: 2 },
  { code: "CLP", name: "Peso chileno", decimals: 0 },
];

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe("account validation", () => {
  it("a name needs a letter or a number and at most 80 characters", () => {
    expect(validateName("Efectivo")).toBeUndefined();
    expect(validateName("   ")).toBe("name_required");
    expect(validateName("x".repeat(81))).toBe("validation_error");
  });

  it("refuses a bad opening balance or last four before calling the API", async () => {
    const base = { type: "card", name: "Visa", currency: "BOB", decimals: "2" };

    expect(await createAccount({}, form({ ...base, opening: "abc" }))).toEqual({
      error: "invalid_amount",
    });
    expect(await createAccount({}, form({ ...base, opening: "10", last4: "12" }))).toEqual({
      error: "invalid_last4",
    });
    expect(await createAccount({}, form({ ...base, name: " ", opening: "10" }))).toEqual({
      error: "name_required",
    });
  });
});

describe("NewAccountForm", () => {
  it("RF-2 starts in the main currency and the name follows the type", async () => {
    render(<NewAccountForm action={createAccount} currencies={currencies} />);

    expect((screen.getByLabelText("Moneda") as HTMLSelectElement).value).toBe("BOB");
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Efectivo");
    expect(screen.queryByLabelText("Últimos 4 dígitos (opcional)")).toBeNull();

    await userEvent.click(screen.getByRole("radio", { name: "Tarjeta" }));

    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Tarjeta");
    expect(screen.getByLabelText("Últimos 4 dígitos (opcional)")).toBeTruthy();
    expect(screen.getByLabelText("Saldo actual")).toBeTruthy();
  });

  it("the last four only take digits", async () => {
    render(<NewAccountForm action={createAccount} currencies={currencies} />);
    await userEvent.click(screen.getByRole("radio", { name: "Tarjeta" }));
    await userEvent.type(screen.getByLabelText("Últimos 4 dígitos (opcional)"), "12ab34");

    expect((screen.getByLabelText("Últimos 4 dígitos (opcional)") as HTMLInputElement).value).toBe(
      "1234",
    );
  });
});
