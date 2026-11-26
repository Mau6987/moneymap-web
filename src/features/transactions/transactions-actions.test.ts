import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

const gateway = vi.hoisted(() => ({
  update: vi.fn(),
  remove: vi.fn(),
  attachReceipt: vi.fn(),
  removeReceipt: vi.fn(),
}));

vi.mock("./data/transactions-gateway", () => ({
  transactionsGateway: () => gateway,
  MAX_RECEIPT_BYTES: 5 * 1024 * 1024,
}));
vi.mock("@/lib/auth/session", () => ({
  withAccessToken: (call: (token: string) => unknown) => call("token"),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
  unstable_rethrow: () => {},
}));

const { attachReceipt, deleteMovement, removeReceipt, updateMovement } =
  await import("./transactions-actions");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

const valid = {
  id: "t1",
  decimals: "2",
  amount: "1.250,50",
  category: "c-food",
  account: "cash",
  date: "2026-11-02",
  description: "Almuerzo",
  back: "/transactions?kind=expense",
};

beforeEach(() => vi.clearAllMocks());

describe("editar un movimiento, como la app", () => {
  it("saves the amount, category, account, date and description and goes back with the filters", async () => {
    await expect(updateMovement({}, form(valid))).rejects.toThrow(
      "redirect:/transactions?kind=expense&saved=updated",
    );
    expect(gateway.update).toHaveBeenCalledWith("token", "t1", {
      amount: "1250.50",
      account_id: "cash",
      category_id: "c-food",
      occurred_on: "2026-11-02",
      description: "Almuerzo",
    });
  });

  it("checks the amount and the description before calling the API", async () => {
    expect(await updateMovement({}, form({ ...valid, amount: "abc" }))).toEqual({
      error: "invalid_amount",
    });
    expect(await updateMovement({}, form({ ...valid, description: "🐶" }))).toEqual({
      error: "description_text",
    });
    expect(gateway.update).not.toHaveBeenCalled();
  });

  it("a balance that does not reach says so", async () => {
    gateway.update.mockRejectedValueOnce(new ApiError("account_insufficient", 422));

    expect(await updateMovement({}, form(valid))).toEqual({ error: "account_insufficient" });
  });

  it("deletes it and goes back", async () => {
    await expect(deleteMovement(form({ id: "t1", back: "/transactions" }))).rejects.toThrow(
      "redirect:/transactions?saved=deleted",
    );
    expect(gateway.remove).toHaveBeenCalledWith("token", "t1");
  });
});

describe("la foto del comprobante (spec 014 del back)", () => {
  const withPhoto = (photo: Blob | string) => {
    const data = form({ id: "t1", back: "/transactions?kind=expense" });
    data.set("receipt", photo);
    return data;
  };

  it("la sube y vuelve al mismo gasto, con el panel abierto", async () => {
    const photo = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" });
    await expect(attachReceipt({}, withPhoto(photo))).rejects.toThrow(
      "redirect:/transactions?kind=expense&saved=receipt&movement=t1",
    );
    expect(gateway.attachReceipt).toHaveBeenCalledWith("token", "t1", expect.any(Blob));
  });

  it("sin archivo, vacía o de más de 5 MB no llama a la API", async () => {
    for (const photo of ["", new Blob([]), new Blob([new Uint8Array(5 * 1024 * 1024 + 1)])]) {
      expect(await attachReceipt({}, withPhoto(photo))).toEqual({ error: "invalid_receipt" });
    }
    expect(gateway.attachReceipt).not.toHaveBeenCalled();
  });

  it("muestra el error de la API, como un formato que no es una foto", async () => {
    gateway.attachReceipt.mockRejectedValueOnce(new ApiError("invalid_receipt", 422));
    expect(await attachReceipt({}, withPhoto(new Blob(["pdf"])))).toEqual({
      error: "invalid_receipt",
    });
  });

  it("la quita y vuelve al mismo gasto", async () => {
    await expect(removeReceipt(form({ id: "t1", back: "/transactions" }))).rejects.toThrow(
      "redirect:/transactions?saved=receipt_removed&movement=t1",
    );
    expect(gateway.removeReceipt).toHaveBeenCalledWith("token", "t1");
  });
});
