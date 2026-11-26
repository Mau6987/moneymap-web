// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Goal } from "../map/data/map-gateway";
import { GoalForm, GoalMoney } from "./components/goal-forms";
import { catalogs } from "@/lib/i18n/catalog";

import { demoGoalsGateway } from "./data/goals-gateway";
import { isLate, nearestPriority, parseTargetDate } from "./domain/goal";
import { contribute, createGoal, withdraw, withdrawAndDelete } from "./goals-actions";

vi.mock("@/lib/auth/session", () => ({ withAccessToken: vi.fn() }));

const goal = (over: Partial<Goal>): Goal => ({
  id: "g1",
  name: "Viaje",
  target_amount: "5000.00",
  current_amount: "2500.00",
  currency: "BOB",
  target_date: "2026-06-30",
  priority: 1,
  status: "active",
  progress_percent: 50,
  estimated_completion: "2027-03-01",
  suggested_contribution: null,
  period_type: "semi_monthly",
  ...over,
});

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe("goal rules", () => {
  it("RF-23 the suggested contribution names the savings period, in each language", () => {
    expect(catalogs.es.goals.suggested("Bs 250", "semi_monthly")).toBe(
      "Para llegar a tu fecha, aporta Bs 250 por quincena.",
    );
    expect(catalogs.es.goals.suggested("Bs 250", "weekly")).toContain("por semana");
    expect(catalogs.en.goals.suggested("Bs 250", "monthly")).toContain("a month");
    expect(catalogs.pt.goals.suggested("Bs 250", "semi_monthly")).toContain("por quinzena");
  });

  it("the demo creates goals past the old limit of two", async () => {
    await expect(
      demoGoalsGateway.create("", {
        name: "Tercera",
        target_amount: "100.00",
        currency: "BOB",
        target_date: null,
        priority: 3,
      }),
    ).resolves.toMatchObject({ name: "Tercera", suggested_contribution: null });
  });

  it("RF-7 a goal past its date and not achieved is late", () => {
    expect(isLate(goal({}), "2026-10-23")).toBe(true);
    expect(isLate(goal({ status: "achieved" }), "2026-10-23")).toBe(false);
    expect(isLate(goal({ target_date: null }), "2026-10-23")).toBe(false);
  });

  it("priorities are Alta, Media and Baja; 2 and 4 show as the nearest", () => {
    expect([1, 2, 3, 4, 5].map(nearestPriority)).toEqual([1, 1, 3, 5, 5]);
    expect(parseTargetDate("")).toBeNull();
    expect(parseTargetDate("mañana")).toBeUndefined();
  });

  it("refuses an empty name, a bad target or a bad contribution before the API", async () => {
    const base = { decimals: "2", currency: "BOB", priority: "3", date: "" };
    expect(await createGoal({}, form({ ...base, name: " ", target: "100" }))).toEqual({
      error: "goal_name",
    });
    expect(await createGoal({}, form({ ...base, name: "Auto", target: "0" }))).toEqual({
      error: "invalid_amount",
    });
    expect(
      await contribute(
        {},
        form({ id: "g1", decimals: "2", amount: "10,555", date: "2026-10-23", key: "k" }),
      ),
    ).toEqual({ error: "invalid_amount" });
  });
});

describe("GoalForm", () => {
  const currencies = [
    { code: "BOB", name: "Boliviano", label: "Bs", decimals: 2 },
    { code: "USD", name: "Dólar estadounidense", label: "$", decimals: 2 },
  ];

  it("RF-1 offers only Mis monedas, the main one first, and Media by default", () => {
    render(<GoalForm action={createGoal} currencies={currencies} />);

    const select = screen.getByLabelText("Moneda") as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(["BOB", "USD"]);
    expect(screen.getByRole("radio", { name: "Media" }).getAttribute("aria-checked")).toBe("true");
  });

  it("RF-4 an edit keeps the currency and creates only with a name and a target", async () => {
    render(
      <GoalForm
        action={createGoal}
        currencies={currencies.slice(0, 1)}
        initial={{ id: "g1", name: "Viaje", target: "5.000", date: "", priority: 1 }}
      />,
    );

    expect(screen.queryByLabelText("Moneda")).toBeNull();
    const save = screen.getByRole("button", { name: "Guardar cambios" }) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    await userEvent.clear(screen.getByLabelText("Nombre"));
    expect(save.disabled).toBe(true);
  });
});

const accounts = [
  { id: "cash", name: "Billetera", detail: "Bs 1.000", balance: "1000.00", isDefault: false },
  { id: "card", name: "BNB débito •• 4821", detail: "Bs 500", balance: "500.00", isDefault: true },
];

const money = (over: Partial<Parameters<typeof GoalMoney>[0]> = {}) => (
  <GoalMoney
    contribute={contribute}
    withdraw={withdraw}
    goalId="g1"
    goalName="Viaje"
    currency="BOB"
    label="Bs"
    decimals={2}
    saved="2500.00"
    savedText="Bs 2.500"
    target="5000.00"
    today="2026-10-23"
    keys={{ contribute: "k1", withdraw: "k2" }}
    accounts={accounts}
    canContribute
    {...over}
  />
);

describe("GoalMoney", () => {
  it("Aportar abre su panel con las cuentas y su saldo, la predeterminada elegida", async () => {
    render(money());
    expect(screen.queryByTestId("goal-contribute-form")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Aportar" }));

    expect(screen.getByText("Aportar a Viaje")).toBeTruthy();
    expect(screen.getByText("¿De qué cuenta sale?")).toBeTruthy();
    expect(
      (screen.getByRole("radio", { name: /BNB débito •• 4821/ }) as HTMLInputElement).checked,
    ).toBe(true);
    expect(screen.getByText("Bs 500")).toBeTruthy();
    expect(screen.queryByText(/solo sumar a la meta/)).toBeNull();
    expect(screen.queryByLabelText("Fecha")).toBeNull();
  });

  it("no deja aportar más de lo que tiene la cuenta", async () => {
    render(money());
    await userEvent.click(screen.getByRole("button", { name: "Aportar" }));
    const form = screen.getByTestId("goal-contribute-form");
    const save = within(form).getByRole("button", { name: "Aportar" }) as HTMLButtonElement;

    await userEvent.type(screen.getByLabelText("Monto (Bs)"), "600");
    expect(screen.getByText("La cuenta no tiene saldo suficiente")).toBeTruthy();
    expect(save.disabled).toBe(true);
    await userEvent.click(screen.getByRole("radio", { name: /Billetera/ }));
    expect(save.disabled).toBe(false);
  });

  it("BUG-049 no deja aportar más de lo que le falta a la meta", async () => {
    render(money());
    await userEvent.click(screen.getByRole("button", { name: "Aportar" }));
    const form = screen.getByTestId("goal-contribute-form");
    const save = within(form).getByRole("button", { name: "Aportar" }) as HTMLButtonElement;
    await userEvent.click(screen.getByRole("radio", { name: /Billetera/ }));

    // A la meta (Bs 5.000) le faltan Bs 2.500.
    expect(screen.getByTestId("goal-remaining").textContent).toBe("Bs 2.500");
    await userEvent.type(screen.getByLabelText("Monto (Bs)"), "2500,01");
    expect(
      screen.getByText("La meta solo necesita lo que le falta: no puedes aportar más"),
    ).toBeTruthy();
    expect(save.disabled).toBe(true);
  });

  it("BUG-049 Completar meta pone justo lo que falta", async () => {
    render(money({ accounts: [{ ...accounts[0]!, balance: "9000.00", isDefault: true }] }));
    await userEvent.click(screen.getByRole("button", { name: "Aportar" }));
    const form = screen.getByTestId("goal-contribute-form");

    await userEvent.click(within(form).getByRole("button", { name: "Completar meta" }));

    expect((screen.getByLabelText("Monto (Bs)") as HTMLInputElement).value).toBe("2.500");
    expect(
      (within(form).getByRole("button", { name: "Aportar" }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("BUG-049 con la meta completa no ofrece Completar meta", async () => {
    render(money({ saved: "5000.00" }));
    await userEvent.click(screen.getByRole("button", { name: "Aportar" }));

    expect(screen.getByTestId("goal-remaining").textContent).toBe("Bs 0");
    expect(screen.queryByRole("button", { name: "Completar meta" })).toBeNull();
  });

  it("Retirar muestra lo ahorrado y no deja sacar más", async () => {
    render(money());
    await userEvent.click(screen.getByRole("button", { name: "Retirar" }));
    const form = screen.getByTestId("goal-withdraw-form");

    expect(screen.getByText("Retirar de Viaje")).toBeTruthy();
    expect(screen.getByText("Bs 2.500")).toBeTruthy();
    expect(screen.getByText("¿A qué cuenta vuelve?")).toBeTruthy();
    await userEvent.type(screen.getByLabelText("Monto (Bs)"), "3000");
    expect(screen.getByText("No puedes sacar más de lo que tiene la meta")).toBeTruthy();
    expect(
      (within(form).getByRole("button", { name: "Retirar" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("sin ahorro no hay Retirar; una meta cumplida no recibe aportes", () => {
    render(money({ saved: "0.00", canContribute: false }));
    expect(screen.queryByRole("button", { name: "Retirar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Aportar" })).toBeNull();
  });

  it("sin cuentas en la moneda de la meta, invita a crear una", async () => {
    render(money({ accounts: [] }));
    await userEvent.click(screen.getByRole("button", { name: "Aportar" }));

    expect(screen.getByText("No tienes una cuenta en BOB.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "+ Nueva cuenta" }).getAttribute("href")).toBe(
      "/accounts",
    );
  });

  it("respeta los decimales de la moneda", async () => {
    render(money({ currency: "CLP", label: "$", decimals: 0 }));
    await userEvent.click(screen.getByRole("button", { name: "Aportar" }));
    const save = within(screen.getByTestId("goal-contribute-form")).getByRole("button", {
      name: "Aportar",
    }) as HTMLButtonElement;

    await userEvent.type(screen.getByLabelText("Monto ($)"), "100,5");
    expect(save.disabled).toBe(true);
  });
});

describe("contribute", () => {
  it("manda la cuenta elegida al aportar", async () => {
    const gateway = await import("./data/goals-gateway");
    const session = await import("@/lib/auth/session");
    const spy = vi.fn();
    vi.spyOn(gateway, "goalsGateway").mockReturnValue({
      ...gateway.demoGoalsGateway,
      contribute: spy,
    });
    vi.mocked(session.withAccessToken).mockImplementation(async (call) => call("token"));

    await contribute(
      {},
      form({ id: "g1", amount: "100", date: "2026-10-23", key: "k1", account: "cash" }),
    ).catch(() => {});

    expect(spy).toHaveBeenCalledWith("token", "g1", "100.00", "2026-10-23", "k1", "cash");
  });
});

describe("withdraw", () => {
  it("vuelve a la cuenta elegida y sin cuenta no se manda", async () => {
    const gateway = await import("./data/goals-gateway");
    const session = await import("@/lib/auth/session");
    const spy = vi.fn();
    vi.spyOn(gateway, "goalsGateway").mockReturnValue({
      ...gateway.demoGoalsGateway,
      withdraw: spy,
    });
    vi.mocked(session.withAccessToken).mockImplementation(async (call) => call("token"));

    await withdraw(
      {},
      form({ id: "g1", amount: "100", date: "2026-10-23", key: "k2", account: "cash" }),
    ).catch(() => {});
    expect(spy).toHaveBeenCalledWith("token", "g1", "100.00", "2026-10-23", "k2", "cash");

    const result = await withdraw(
      {},
      form({ id: "g1", amount: "100", date: "2026-10-23", key: "k3" }),
    );
    expect(result).toEqual({ error: "validation_error" });
  });
});

describe("withdrawAndDelete", () => {
  it("devuelve todo lo ahorrado a la cuenta elegida y después borra la meta, como la app", async () => {
    const gateway = await import("./data/goals-gateway");
    const session = await import("@/lib/auth/session");
    const calls: string[] = [];
    const withdrawSpy = vi.fn(async () => {
      calls.push("withdraw");
    });
    const removeSpy = vi.fn(async () => {
      calls.push("remove");
    });
    vi.spyOn(gateway, "goalsGateway").mockReturnValue({
      ...gateway.demoGoalsGateway,
      withdraw: withdrawSpy,
      remove: removeSpy,
    });
    vi.mocked(session.withAccessToken).mockImplementation(async (call) => call("token"));

    await withdrawAndDelete(form({ id: "g1", saved: "350.00", key: "k9", account: "cash" })).catch(
      () => {},
    );

    expect(withdrawSpy).toHaveBeenCalledWith(
      "token",
      "g1",
      "350.00",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      "k9",
      "cash",
    );
    expect(removeSpy).toHaveBeenCalledWith("token", "g1");
    expect(calls).toEqual(["withdraw", "remove"]);
  });
});
