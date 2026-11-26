// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { DEMO_NEW_USER_TOKEN } from "@/lib/demo";

const gateway = vi.hoisted(() => ({
  status: vi.fn(),
  saveMainCurrency: vi.fn(),
  savePeriod: vi.fn(),
  categories: vi.fn(),
  createAccount: vi.fn(),
  rules: vi.fn(),
  createRule: vi.fn(),
}));
const navigation = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  unstable_rethrow: vi.fn((error: unknown) => {
    if (error instanceof Error && error.message.startsWith("redirect:")) throw error;
  }),
}));

vi.mock("./data/onboarding-gateway", async (original) => ({
  ...(await original<object>()),
  onboardingGateway: () => gateway,
}));
vi.mock("@/lib/auth/session", () => ({
  withAccessToken: (call: (token: string) => Promise<unknown>) => call("t"),
}));
vi.mock("next/navigation", () => navigation);

const actions = await import("./onboarding-actions");
const { demoOnboardingGateway } = await import("./data/onboarding-gateway");
const { canOpen, resumeStep } = await import("./domain/steps");
const { ExpenseFields } = await import("./components/expense-fields");
const { AccountFields } = await import("./components/account-fields");
const { OnboardingShell } = await import("./components/onboarding-shell");

const status = (over: Partial<Record<string, unknown>> = {}) => ({
  completed: false,
  completed_at: null,
  main_currency: "BOB",
  accounts: 0,
  income_rules: 0,
  expense_rules: 0,
  ...over,
});

const form = (fields: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, v);
  }
  return data;
};

const categories = [
  { id: "c-sal", template_key: "salary", type: "income", name: "Salario" },
  { id: "c-oi", template_key: "other_income", type: "income", name: "Otros ingresos" },
  { id: "c-home", template_key: "housing", type: "expense", name: "Vivienda" },
  { id: "c-oe", template_key: "other_expense", type: "expense", name: "Otros gastos" },
];

beforeEach(() => {
  vi.clearAllMocks();
  gateway.categories.mockResolvedValue(categories);
  gateway.rules.mockResolvedValue([]);
});

describe("steps", () => {
  it("RF-10 resumes at the first step that is missing", () => {
    expect(resumeStep(status({ main_currency: null }))).toBe("country");
    expect(resumeStep(status())).toBe("accounts");
    expect(resumeStep(status({ accounts: 1 }))).toBe("period");
    expect(resumeStep(status({ accounts: 1, income_rules: 1 }))).toBe("expenses");
    expect(resumeStep(status({ accounts: 1, expense_rules: 2 }))).toBe("ready");
  });

  it("goes back freely but never ahead of what is saved", () => {
    expect(canOpen("currency", status({ main_currency: null }))).toBe(true);
    expect(canOpen("accounts", status({ main_currency: null }))).toBe(false);
    expect(canOpen("country", status({ accounts: 1 }))).toBe(true);
    expect(canOpen("ready", status())).toBe(false);
    expect(canOpen("ready", status({ accounts: 1 }))).toBe(true);
    // El periodo no figura en el estado: después de guardarlo se sigue al ingreso.
    expect(canOpen("income", status({ accounts: 1 }))).toBe(true);
    expect(canOpen("period", status())).toBe(false);
  });
});

describe("onboarding actions", () => {
  it("RF-2 saves the main currency only when it changed", async () => {
    gateway.status.mockResolvedValue(status({ main_currency: "BOB" }));
    await expect(
      actions.saveCurrency({}, form({ currency: "BOB", country: "BO" })),
    ).rejects.toThrow("redirect:/onboarding?step=accounts&country=BO");
    expect(gateway.saveMainCurrency).not.toHaveBeenCalled();

    await expect(actions.saveCurrency({}, form({ currency: "USD" }))).rejects.toThrow(
      "redirect:/onboarding?step=accounts",
    );
    expect(gateway.saveMainCurrency).toHaveBeenCalledWith("t", "USD");
  });

  it("RF-3 creates the cash first and then the card", async () => {
    gateway.status.mockResolvedValue(status());
    await expect(
      actions.saveAccounts(
        {},
        form({
          currency: "BOB",
          decimals: "2",
          cash: "2.500",
          has_card: "true",
          bank_name: "BNB",
          institution: "BNB",
          last4: "4821",
          card: "1500,5",
        }),
      ),
    ).rejects.toThrow("redirect:/onboarding?step=period");

    expect(gateway.createAccount.mock.calls.map(([, a]) => a)).toEqual([
      { name: "Efectivo", type: "cash", currency: "BOB", opening_balance: "2500.00" },
      {
        name: "Tarjeta BNB",
        type: "card",
        currency: "BOB",
        opening_balance: "1500.50",
        institution_code: "BNB",
        last4: "4821",
      },
    ]);
  });

  it("RF-11 a retry after the card failed does not create the cash again", async () => {
    gateway.status.mockResolvedValue(status({ accounts: 1 }));
    await expect(
      actions.saveAccounts(
        {},
        form({
          currency: "BOB",
          cash: "10",
          has_card: "true",
          bank_name: "BNB",
          last4: "4821",
          card: "5",
        }),
      ),
    ).rejects.toThrow("redirect:");

    expect(gateway.createAccount).toHaveBeenCalledTimes(1);
    expect(gateway.createAccount.mock.calls[0]?.[1]).toMatchObject({ type: "card" });
  });

  it("checks the card before calling the API", async () => {
    expect(
      await actions.saveAccounts({}, form({ cash: "10", has_card: "true", bank_name: "" })),
    ).toEqual({ error: "bank_required" });
    expect(
      await actions.saveAccounts(
        {},
        form({ cash: "10", has_card: "true", bank_name: "BNB", last4: "12" }),
      ),
    ).toEqual({ error: "invalid_last4" });
    expect(await actions.saveAccounts({}, form({ cash: "abc" }))).toEqual({
      error: "invalid_amount",
    });
    expect(gateway.createAccount).not.toHaveBeenCalled();
  });

  it("BUG-041 the card needs its last 4 digits and its balance", async () => {
    const card = { cash: "10", has_card: "true", bank_name: "BNB" };
    expect(await actions.saveAccounts({}, form({ ...card, card: "50" }))).toEqual({
      error: "invalid_last4",
    });
    expect(await actions.saveAccounts({}, form({ ...card, last4: "4821" }))).toEqual({
      error: "card_balance_required",
    });
    expect(gateway.createAccount).not.toHaveBeenCalled();

    gateway.status.mockResolvedValue(status());
    await expect(
      actions.saveAccounts({}, form({ ...card, currency: "BOB", last4: "4821", card: "0" })),
    ).rejects.toThrow("redirect:");
    expect(gateway.createAccount.mock.calls[1]?.[1]).toMatchObject({
      type: "card",
      last4: "4821",
      opening_balance: "0.00",
    });
  });

  it("RF-11 keeps what was written when saving fails", async () => {
    gateway.status.mockResolvedValue(status());
    gateway.createAccount.mockRejectedValueOnce(new ApiError("network_error", 0));

    expect(await actions.saveAccounts({}, form({ currency: "BOB", cash: "10" }))).toEqual({
      error: "network_error",
    });
  });

  it("RF-9 skipping income and expenses goes to the result", async () => {
    await expect(actions.savePeriod({}, form({ period: "weekly", skip: "true" }))).rejects.toThrow(
      "redirect:/onboarding?step=ready",
    );
    expect(gateway.savePeriod).toHaveBeenCalledWith("t", "weekly");
  });

  it("RF-5 an empty income goes on without saving", async () => {
    await expect(actions.saveIncome({}, form({ amount: "" }))).rejects.toThrow(
      "redirect:/onboarding?step=expenses",
    );
    expect(gateway.createRule).not.toHaveBeenCalled();
  });

  it("BUG-020 Otro ingreso goes with the other income category", async () => {
    gateway.status.mockResolvedValue(status({ accounts: 1 }));
    await expect(
      actions.saveIncome({}, form({ amount: "800", kind: "other_income", decimals: "2" })),
    ).rejects.toThrow("redirect:");
    expect(gateway.createRule).toHaveBeenCalledWith("t", {
      category_id: "c-oi",
      amount: "800.00",
      description: "Otros ingresos",
      frequency: "monthly",
      auto_post: false,
    });
  });

  it("RF-5 the income goes with its category, once", async () => {
    gateway.status.mockResolvedValue(status({ accounts: 1 }));
    await expect(
      actions.saveIncome({}, form({ amount: "3.000", kind: "salary", decimals: "2" })),
    ).rejects.toThrow("redirect:");
    expect(gateway.createRule).toHaveBeenCalledWith("t", {
      category_id: "c-sal",
      amount: "3000.00",
      description: "Salario",
      frequency: "monthly",
      auto_post: false,
    });

    gateway.status.mockResolvedValue(status({ accounts: 1, income_rules: 1 }));
    await expect(actions.saveIncome({}, form({ amount: "3000" }))).rejects.toThrow("redirect:");
    expect(gateway.createRule).toHaveBeenCalledTimes(1);
  });

  it.each(["-", "...", "🐶", "🐶🐱", ""])(
    "BUG-002 a fixed expense named %j is not saved",
    async (name) => {
      const result = await actions.saveExpenses(
        {},
        form({
          decimals: "2",
          template: ["housing", "other_expense"],
          name: ["Alquiler", name],
          amount: ["700", "80"],
        }),
      );

      expect(result).toEqual({ error: "expense_name" });
      expect(gateway.createRule).not.toHaveBeenCalled();
    },
  );

  it("RF-6 saves the expenses with an amount and skips the ones already saved", async () => {
    gateway.rules.mockResolvedValue([
      { type: "expense", description: "Alquiler", amount: "700.00" },
    ]);
    await expect(
      actions.saveExpenses(
        {},
        form({
          decimals: "2",
          template: ["housing", "utilities", "other_expense"],
          name: ["Alquiler", "Servicios", "Gimnasio"],
          amount: ["700", "", "150"],
        }),
      ),
    ).rejects.toThrow("redirect:/onboarding?step=ready");

    expect(gateway.createRule).toHaveBeenCalledTimes(1);
    expect(gateway.createRule).toHaveBeenCalledWith("t", {
      category_id: "c-oe",
      amount: "150.00",
      description: "Gimnasio",
      frequency: "monthly",
      auto_post: false,
    });
  });

  it("BUG-021 saves how often each expense repeats and when it is due", async () => {
    gateway.rules.mockResolvedValue([]);
    await expect(
      actions.saveExpenses(
        {},
        form({
          decimals: "2",
          template: ["housing"],
          name: ["Alquiler"],
          amount: ["700"],
          frequency: ["biweekly"],
          due: ["2026-11-15"],
        }),
      ),
    ).rejects.toThrow("redirect:/onboarding?step=ready");

    expect(gateway.createRule).toHaveBeenCalledWith("t", {
      category_id: "c-home",
      amount: "700.00",
      description: "Alquiler",
      frequency: "biweekly",
      start_date: "2026-11-15",
      auto_post: false,
    });
  });
});

describe("demo onboarding", () => {
  it("only a new person does it, and the result comes from what was saved", async () => {
    expect((await demoOnboardingGateway.status("demo-access")).completed).toBe(true);
    const token = DEMO_NEW_USER_TOKEN;
    expect((await demoOnboardingGateway.status(token)).completed).toBe(false);
    await expect(demoOnboardingGateway.complete(token)).rejects.toMatchObject({
      code: "onboarding_incomplete",
    });

    await demoOnboardingGateway.saveMainCurrency(token, "BOB");
    await demoOnboardingGateway.createAccount(token, {
      name: "Efectivo",
      type: "cash",
      currency: "BOB",
      opening_balance: "0",
    });
    await demoOnboardingGateway.createRule(token, {
      category_id: "c-housing",
      amount: "700",
      description: "Alquiler",
      frequency: "monthly",
      auto_post: false,
    });
    const summary = await demoOnboardingGateway.complete(token);
    expect(summary.committed).toBe("700.00");
    expect((await demoOnboardingGateway.status(token)).completed).toBe(true);
  });
});

describe("step fields", () => {
  const expenseProps = {
    symbol: "Bs",
    decimals: 2,
    today: "2026-11-03",
    categories: { housing: { name: "Vivienda", color: "#3E4BD2" } },
  };

  it("BUG-021 like the app: the amount checks the row, asks how often and when, and adds up", async () => {
    const { container } = render(<ExpenseFields {...expenseProps} />);
    const amounts = () =>
      [...container.querySelectorAll<HTMLInputElement>('input[type="hidden"][name="amount"]')].map(
        (i) => i.value,
      );
    expect(screen.queryByRole("combobox")).toBeNull();

    await userEvent.type(screen.getByLabelText("Monto de Alquiler"), "1.500");

    expect((screen.getByRole("checkbox", { name: "Alquiler" }) as HTMLInputElement).checked).toBe(
      true,
    );
    expect(screen.getByRole("combobox", { name: "Cada cuánto se paga Alquiler" })).toBeTruthy();
    expect(screen.getByText("Vence el")).toBeTruthy();
    expect(screen.getByTestId("expenses-committed").textContent).toContain("−Bs 1.500");
    expect(amounts()).toEqual(["1.500", "", ""]);

    // Desmarcado no se guarda, aunque tenga monto.
    await userEvent.click(screen.getByRole("checkbox", { name: "Alquiler" }));
    expect(amounts()).toEqual(["", "", ""]);
    expect(screen.getByTestId("expenses-committed").textContent).toContain("Bs 0");
  });

  it("RF-6 offers rent, utilities and transport and adds more rows", async () => {
    render(<ExpenseFields {...expenseProps} />);
    expect(screen.getByText("Alquiler")).toBeTruthy();
    expect(screen.getByText("Servicios (luz, agua, internet)")).toBeTruthy();
    expect(screen.getByText("Transporte")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Agregar gasto fijo" }));

    expect(screen.getByLabelText("Nombre")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Quitar Otro gasto fijo" }));
    expect(screen.queryByLabelText("Nombre")).toBeNull();
  });

  it("RF-4 the card is optional, with the country's banks or another name", async () => {
    render(
      <AccountFields
        currency="BOB"
        countryName="Bolivia"
        institutions={[{ code: "BNB", name: "BNB", short_name: "BNB", kind: "bank" }]}
      />,
    );
    expect(screen.queryByLabelText("Últimos 4 dígitos")).toBeNull();

    await userEvent.click(screen.getByLabelText("También tengo una tarjeta"));
    expect(screen.getByRole("radio", { name: "BNB" }).getAttribute("aria-checked")).toBe("true");

    const last4 = screen.getByLabelText("Últimos 4 dígitos") as HTMLInputElement;
    const balance = screen.getByLabelText("Saldo actual de la tarjeta") as HTMLInputElement;
    expect(last4.required && balance.required).toBe(true);

    await userEvent.click(screen.getByRole("radio", { name: "Otro" }));
    expect(screen.getByLabelText("Nombre de tu banco o billetera")).toBeTruthy();
  });

  it("BUG-019 Tu resumen shows only when there is a summary (the admin)", () => {
    const { unmount } = render(<OnboardingShell step="currency">paso</OnboardingShell>);
    expect(screen.queryByRole("complementary")).toBeNull();
    unmount();

    render(
      <OnboardingShell step="currency" summary={[{ label: "País", value: "Bolivia" }]}>
        paso
      </OnboardingShell>,
    );
    expect(screen.getByRole("complementary", { name: "Tu resumen" })).toBeTruthy();
    expect(screen.getByText("Bolivia")).toBeTruthy();
  });
});
