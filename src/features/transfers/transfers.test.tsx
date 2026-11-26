// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TransferForm } from "./components/transfer-form";
import { destinationsOf, originOf, type TransferAccount } from "./domain/transfer";

vi.mock("./transfer-action", () => ({ registerTransfer: vi.fn(async () => ({})) }));
const { registerTransfer } = await import("./transfer-action");

const accounts: TransferAccount[] = [
  { id: "cash", name: "Efectivo", currency: "BOB", label: "Bs", decimals: 2, isDefault: true },
  { id: "bnb", name: "Tarjeta BNB", currency: "BOB", label: "Bs", decimals: 2, isDefault: false },
  { id: "usd", name: "Tarjeta USD", currency: "USD", label: "$", decimals: 2, isDefault: false },
];

const destinations = () => screen.getByRole("radiogroup", { name: "Hacia" });

const renderForm = (list = accounts) =>
  render(
    <TransferForm
      action={registerTransfer}
      accounts={list}
      today="2026-10-24"
      idempotencyKey="k1"
    />,
  );

describe("transfer domain", () => {
  it("starts from the default account", () => {
    expect(originOf(accounts)?.id).toBe("cash");
    expect(originOf(accounts, "usd")?.id).toBe("usd");
  });

  it("RF-7 offers only other accounts of the same currency", () => {
    expect(destinationsOf(accounts, accounts[0]).map((a) => a.id)).toEqual(["bnb"]);
    expect(destinationsOf(accounts, accounts[2])).toEqual([]);
  });
});

describe("TransferForm", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("RF-7 the destinations are the origin's currency only", () => {
    renderForm();

    const to = screen.getByRole("radiogroup", { name: "Hacia" });
    expect(to.textContent).toContain("Tarjeta BNB · BOB");
    expect(to.textContent).not.toContain("USD");
    expect(to.textContent).not.toContain("Efectivo");
  });

  it("RF-7 without another account in that currency it offers to create one", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("radio", { name: "Tarjeta USD · USD" }));

    expect(screen.getByText("No tienes otra cuenta en USD")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Crear cuenta" }).getAttribute("href")).toBe(
      "/accounts",
    );
    expect(screen.getByText("USD")).toBeTruthy();
  });

  it("changing the origin's currency clears the destination", async () => {
    renderForm([
      ...accounts,
      {
        id: "usd2",
        name: "Ahorro USD",
        currency: "USD",
        label: "$",
        decimals: 2,
        isDefault: false,
      },
    ]);
    await userEvent.click(within(destinations()).getByRole("radio", { name: "Tarjeta BNB · BOB" }));
    await userEvent.type(screen.getByPlaceholderText("0"), "100");

    await userEvent.click(screen.getByRole("radio", { name: "Tarjeta USD · USD" }));

    const save = screen.getByRole("button", { name: "Transferir" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it("transfers with a valid amount and a destination", async () => {
    renderForm();
    const save = screen.getByRole("button", { name: "Transferir" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    await userEvent.type(screen.getByPlaceholderText("0"), "250,50");
    expect(save.disabled).toBe(true);
    await userEvent.click(within(destinations()).getByRole("radio", { name: "Tarjeta BNB · BOB" }));
    await userEvent.click(save);

    await waitFor(() => expect(registerTransfer).toHaveBeenCalled());
    const form = vi.mocked(registerTransfer).mock.calls[0]![1];
    expect(Object.fromEntries(form.entries())).toMatchObject({
      from: "cash",
      to: "bnb",
      amount: "250,50",
      date: "2026-10-24",
      key: "k1",
    });
  });

  it("RF-16 shows the API's error and keeps what was typed", async () => {
    vi.mocked(registerTransfer).mockResolvedValueOnce({ error: "transfer_currency_mismatch" });
    renderForm();
    await userEvent.type(screen.getByPlaceholderText("0"), "10");
    await userEvent.click(within(destinations()).getByRole("radio", { name: "Tarjeta BNB · BOB" }));

    await userEvent.click(screen.getByRole("button", { name: "Transferir" }));

    expect(
      await screen.findByText("Las dos cuentas tienen que estar en la misma moneda"),
    ).toBeTruthy();
    expect((screen.getByPlaceholderText("0") as HTMLInputElement).value).toBe("10");
  });

  it("without accounts it asks to create one", () => {
    renderForm([]);

    expect(screen.getByText("Para transferir, primero agrega una cuenta.")).toBeTruthy();
  });
});
