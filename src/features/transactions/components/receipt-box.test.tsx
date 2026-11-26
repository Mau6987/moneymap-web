// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Transaction } from "../../map/data/map-gateway";

vi.mock("../transactions-actions", () => ({ attachReceipt: vi.fn(), removeReceipt: vi.fn() }));

const { ReceiptBox } = await import("./receipt-box");

const expense = (hasReceipt: boolean): Transaction => ({
  id: "t1",
  kind: "expense",
  account_id: "demo-cash",
  category_id: "c-food",
  transfer_account_id: null,
  amount: "35.50",
  currency: "BOB",
  occurred_on: "2026-11-05",
  description: "Almuerzo",
  source: "manual",
  created_at: "2026-11-05T12:00:00Z",
  has_receipt: hasReceipt,
});

describe("ReceiptBox (spec 014 del back)", () => {
  it("sin foto ofrece subirla, solo imágenes", () => {
    render(<ReceiptBox movement={expense(false)} back="/transactions" />);

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByRole("button", { name: "Subir foto" })).toBeTruthy();
    expect(screen.getByLabelText("Foto del comprobante").getAttribute("accept")).toBe(
      "image/jpeg,image/png,image/webp",
    );
    expect(screen.queryByRole("button", { name: "Quitar foto" })).toBeNull();
  });

  it("con foto la muestra desde la web, para abrirla en grande, cambiarla o quitarla", () => {
    render(<ReceiptBox movement={expense(true)} back="/transactions" />);

    const photo = screen.getByRole("img", { name: "Foto del comprobante" });
    expect(photo.getAttribute("src")).toBe("/transactions/t1/receipt");
    expect(photo.closest("a")?.getAttribute("target")).toBe("_blank");
    expect(screen.getByRole("button", { name: "Cambiar foto" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Quitar foto" })).toBeTruthy();
  });
});
