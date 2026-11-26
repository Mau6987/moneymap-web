// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuickAddForm, type QuickAddAccount } from "./components/quick-add-form";
import { byUse, visibleCategories } from "./domain/categories";

vi.mock("./quick-add-action", () => ({ registerTransaction: vi.fn() }));
const { registerTransaction } = await import("./quick-add-action");

const accounts: QuickAddAccount[] = [
  {
    id: "cash",
    name: "Efectivo",
    currency: "BOB",
    label: "Bs",
    decimals: 2,
    isDefault: true,
    balance: "Bs 900",
  },
  { id: "usd", name: "Tarjeta USD", currency: "USD", label: "$", decimals: 2, isDefault: false },
  { id: "clp", name: "Pesos", currency: "CLP", label: "$", decimals: 0, isDefault: false },
];
const categories = [
  { id: "food", name: "Comida", type: "expense", color: "#D25A42" },
  { id: "salary", name: "Salario", type: "income", color: "#2E8A62" },
];

const renderForm = () =>
  render(
    <QuickAddForm
      action={registerTransaction}
      accounts={accounts}
      categories={categories}
      today="2026-10-23"
      idempotencyKey="k1"
    />,
  );

describe("QuickAddForm", () => {
  it("RF-4 the currency is the account's and there is no picker", async () => {
    renderForm();

    expect(screen.getByText("BOB")).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();

    await userEvent.click(screen.getByRole("radio", { name: "Tarjeta USD · USD" }));
    expect(screen.getByText("USD")).toBeTruthy();
    expect(screen.getByText("En USD, la moneda de la cuenta")).toBeTruthy();
  });

  it("BUG-060 each account shows its balance next to its name", () => {
    renderForm();

    const cash = screen.getByRole("radio", { name: /^Efectivo · BOB/ });
    expect(cash.textContent).toContain("Bs 900");
  });

  it("an income offers only income categories", async () => {
    renderForm();
    expect(screen.getByRole("button", { name: "Comida" })).toBeTruthy();

    await userEvent.click(screen.getByRole("radio", { name: "Ingreso" }));

    expect(screen.queryByRole("button", { name: "Comida" })).toBeNull();
    expect(screen.getByRole("button", { name: "Salario" })).toBeTruthy();
  });

  it("saves only with a valid amount and a category", async () => {
    renderForm();
    const save = screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    await userEvent.type(screen.getByPlaceholderText("0"), "35,50");
    expect(save.disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Comida" }));
    expect(save.disabled).toBe(false);
  });

  it("BUG-050 a description without letters or numbers shows the error as you type", async () => {
    renderForm();
    const save = screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement;
    await userEvent.type(screen.getByPlaceholderText("0"), "35");
    await userEvent.click(screen.getByRole("button", { name: "Comida" }));
    const description = screen.getByPlaceholderText("Por ejemplo, Hipermaxi");

    await userEvent.type(description, "...");
    expect(screen.getByTestId("quick-add-description-error")).toBeTruthy();
    expect(description.getAttribute("aria-invalid")).toBe("true");
    expect(save.disabled).toBe(true);

    await userEvent.clear(description);
    await userEvent.type(description, "   ");
    expect(screen.queryByTestId("quick-add-description-error")).toBeNull();
    expect(save.disabled).toBe(false);

    await userEvent.type(description, "Netflix 🎬");
    expect(save.disabled).toBe(false);
    expect((description as HTMLInputElement).maxLength).toBe(200);
  });

  it("RF-5 a currency without decimals refuses cents", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("radio", { name: "Pesos · CLP" }));
    await userEvent.click(screen.getByRole("button", { name: "Comida" }));
    await userEvent.type(screen.getByPlaceholderText("0"), "1500,5");

    expect((screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});

describe("Quick Add con las 4 categorías principales (MM-176)", () => {
  const many = ["Comida", "Transporte", "Casa", "Salud", "Ocio", "Ropa"].map((name) => ({
    id: name.toLowerCase(),
    name,
    type: "expense",
    color: "#D25A42",
  }));

  it("the most used go first; ties keep the order of the API", () => {
    const ordered = byUse(many, [
      { category_id: "ropa" },
      { category_id: "ropa" },
      { category_id: "salud" },
      { category_id: null },
    ]);
    expect(ordered.map((c) => c.id)).toEqual([
      "ropa",
      "salud",
      "comida",
      "transporte",
      "casa",
      "ocio",
    ]);
  });

  it("shows four, and the chosen one even if it is further down", () => {
    expect(visibleCategories(many, "", false).map((c) => c.id)).toEqual([
      "comida",
      "transporte",
      "casa",
      "salud",
    ]);
    expect(visibleCategories(many, "ropa", false).map((c) => c.id)).toContain("ropa");
    expect(visibleCategories(many, "", true)).toHaveLength(6);
  });

  it('"Más" opens the rest and "Menos" hides it again', async () => {
    render(
      <QuickAddForm
        action={registerTransaction}
        accounts={accounts}
        categories={many}
        today="2026-10-23"
        idempotencyKey="k1"
      />,
    );
    expect(screen.queryByRole("button", { name: "Ocio" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Más (2)" }));
    expect(screen.getByRole("button", { name: "Ocio" })).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Ocio" }));
    await userEvent.click(screen.getByRole("button", { name: "Menos" }));
    // La elegida sigue a la vista aunque no esté entre las cuatro.
    expect(screen.getByRole("button", { name: "Ocio" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("button", { name: "Ropa" })).toBeNull();
    expect(screen.getByRole("button", { name: "Más (1)" })).toBeTruthy();
  });
});
