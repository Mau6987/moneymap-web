// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { accentStyle } from "./domain/accents";

import { ApiError } from "@/lib/api/errors";

const gateway = vi.hoisted(() => ({
  updateProfile: vi.fn(),
  updatePreferences: vi.fn(),
  updateMoney: vi.fn(),
  addCurrency: vi.fn(),
  removeCurrency: vi.fn(),
  requestDeletion: vi.fn(),
}));
const session = vi.hoisted(() => ({
  withAccessToken: vi.fn((call: (token: string) => Promise<unknown>) => call("t")),
  clearSession: vi.fn(),
}));
const theme = vi.hoisted(() => ({ saveTheme: vi.fn() }));
const navigation = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  unstable_rethrow: vi.fn((error: unknown) => {
    if (error instanceof Error && error.message.startsWith("redirect:")) throw error;
  }),
}));

vi.mock("./data/settings-gateway", async (original) => ({
  ...(await original<object>()),
  settingsGateway: () => gateway,
}));
vi.mock("@/lib/auth/session", () => session);
vi.mock("@/lib/theme-cookie", () => theme);
vi.mock("next/navigation", () => navigation);

const actions = await import("./settings-actions");
const { demoSettingsGateway } = await import("./data/settings-gateway");
const { MyCurrencies, MainCurrencyForm } = await import("./components/money-forms");
const { ChoiceForm } = await import("./components/preference-forms");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

const currency = (code: string, mine: boolean, main = false) => ({
  code,
  name: code,
  symbol: code,
  decimals: 2,
  is_active: true,
  is_mine: mine,
  is_main_currency: main,
});

beforeEach(() => vi.clearAllMocks());

describe("settings actions", () => {
  it("RF-11 needs a first and last name, and an empty display name goes as null", async () => {
    expect(await actions.saveProfile({}, form({ first_name: " ", last_name: "López" }))).toEqual({
      error: "name_required",
    });
    expect(gateway.updateProfile).not.toHaveBeenCalled();

    await expect(
      actions.saveProfile(
        {},
        form({ first_name: "Ana", last_name: "López", display_name: " ", occupation: "pilot" }),
      ),
    ).rejects.toThrow("redirect:/settings?saved=profile");
    expect(gateway.updateProfile).toHaveBeenCalledWith("t", {
      first_name: "Ana",
      last_name: "López",
      display_name: null,
      city: null,
      occupation: null,
    });
  });

  it("RF-13 saves the theme in the API and in its cookie", async () => {
    await expect(actions.savePreferences({}, form({ theme: "dark" }))).rejects.toThrow(
      "redirect:/settings?s=profile&saved=preferences",
    );
    expect(gateway.updatePreferences).toHaveBeenCalledWith("t", { theme: "dark" });
    expect(theme.saveTheme).toHaveBeenCalledWith("dark");
  });

  it("RF-14 a failed preference keeps the cookie and returns the code", async () => {
    gateway.updatePreferences.mockRejectedValueOnce(new ApiError("network_error", 0));

    expect(await actions.savePreferences({}, form({ theme: "light" }))).toEqual({
      error: "network_error",
    });
    expect(theme.saveTheme).not.toHaveBeenCalled();
  });

  it("RF-15 the private mode goes back to Seguridad", async () => {
    await expect(
      actions.savePreferences({}, form({ hide_amounts: "true", section: "security" })),
    ).rejects.toThrow("redirect:/settings?s=security&saved=preferences");
    expect(gateway.updatePreferences).toHaveBeenCalledWith("t", { hide_amounts: true });
  });

  it("like the app, the accent color is saved, only from the list", async () => {
    await expect(actions.savePreferences({}, form({ accent_color: "#7c3aed" }))).rejects.toThrow(
      "redirect:",
    );
    expect(gateway.updatePreferences).toHaveBeenLastCalledWith("t", { accent_color: "#7C3AED" });

    await expect(actions.savePreferences({}, form({ accent_color: "red" }))).rejects.toThrow(
      "redirect:",
    );
    expect(gateway.updatePreferences).toHaveBeenLastCalledWith("t", { accent_color: "#3E4BD2" });
    expect(accentStyle("#3E4BD2")).toBe("");
    expect(accentStyle("#2E8A62")).toContain("--mm-primary:#2E8A62");
  });

  it("the planned savings is read in es-BO and may be zero", async () => {
    expect(await actions.saveSavings({}, form({ planned_savings: "abc", decimals: "2" }))).toEqual({
      error: "invalid_amount",
    });
    await expect(
      actions.saveSavings({}, form({ planned_savings: "1.500,5", decimals: "2" })),
    ).rejects.toThrow("redirect:/settings?saved=money");
    expect(gateway.updateMoney).toHaveBeenCalledWith("t", { planned_savings: "1500.50" });
  });

  it("like the app, saved from Safe to Spend it goes back there", async () => {
    await expect(
      actions.saveSavings(
        {},
        form({ planned_savings: "200", decimals: "2", back: "/safe-to-spend" }),
      ),
    ).rejects.toThrow("redirect:/safe-to-spend?saved=savings");
  });

  it("RF-14 (002) a currency in use is explained", async () => {
    gateway.removeCurrency.mockRejectedValueOnce(new ApiError("currency_in_use", 409));

    expect(await actions.removeCurrency({}, form({ code: "USD" }))).toEqual({
      error: "currency_in_use",
    });
  });

  it("deleting the account needs the password and ends the session", async () => {
    expect(await actions.deleteAccount({}, form({ password: "" }))).toEqual({
      error: "password_required",
    });

    gateway.requestDeletion.mockRejectedValueOnce(new ApiError("reauthentication_failed", 403));
    expect(await actions.deleteAccount({}, form({ password: "mala" }))).toEqual({
      error: "reauthentication_failed",
    });
    expect(session.clearSession).not.toHaveBeenCalled();

    await expect(actions.deleteAccount({}, form({ password: "secreta" }))).rejects.toThrow(
      "redirect:/login",
    );
    expect(session.clearSession).toHaveBeenCalled();
  });
});

describe("demo settings", () => {
  it("the main currency and one with accounts cannot be removed", async () => {
    await expect(demoSettingsGateway.removeCurrency("t", "BOB")).rejects.toMatchObject({
      code: "currency_in_use",
    });
    await demoSettingsGateway.addCurrency("t", "EUR");
    expect((await demoSettingsGateway.currencies("t")).find((c) => c.code === "EUR")?.is_mine).toBe(
      true,
    );
    await demoSettingsGateway.removeCurrency("t", "EUR");
  });
});

describe("settings forms", () => {
  it("RF-14 the main currency shows Principal instead of Quitar", () => {
    render(
      <MyCurrencies
        currencies={[currency("BOB", true, true), currency("USD", true), currency("EUR", false)]}
        remove={actions.removeCurrency}
        add={actions.addCurrency}
      />,
    );

    expect(screen.getByText("Principal")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Quitar BOB" })).toBeNull();
    expect(screen.getByRole("button", { name: "Quitar USD" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "EUR · EUR" })).toBeTruthy();
  });

  it("RF-13 (002) changing the main currency says the amounts stay", async () => {
    render(
      <MainCurrencyForm
        currencies={[currency("BOB", true, true), currency("USD", true)]}
        main="BOB"
        action={actions.saveMainCurrency}
      />,
    );
    const save = screen.getByRole("button", { name: "Cambiar moneda principal" });
    expect((save as HTMLButtonElement).disabled).toBe(true);

    await userEvent.selectOptions(screen.getByLabelText("Moneda principal"), "USD");

    expect((save as HTMLButtonElement).disabled).toBe(false);
    expect(
      screen.getByText("Tus montos no cambian: solo cambia qué moneda ves primero."),
    ).toBeTruthy();
  });

  it("a choice marks the current option", () => {
    render(
      <ChoiceForm
        name="theme"
        label="Tema"
        current="dark"
        action={actions.savePreferences}
        options={[
          { value: "light", label: "Claro" },
          { value: "dark", label: "Oscuro" },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "Oscuro" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "Claro" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });
});
