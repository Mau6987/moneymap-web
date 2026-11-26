import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { recurringErrorText } from "@/lib/i18n/recurring-messages";

const gateway = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));

vi.mock("./data/recurring-gateway", () => ({ recurringGateway: () => gateway }));
vi.mock("@/lib/auth/session", () => ({
  withAccessToken: (call: (token: string) => unknown) => call("token"),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
  unstable_rethrow: () => {},
}));

const { createRule, updateRule } = await import("./recurring-actions");

const form = (description: string, extra: Record<string, string> = {}) => {
  const data = new FormData();
  const fields = { description, amount: "20", category: "c-home", currency: "BOB", ...extra };
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

beforeEach(() => vi.clearAllMocks());

describe("BUG-003", () => {
  it.each(["-", "...", "🐶", "🐶🐱"])("a fixed expense named %j is not saved", async (name) => {
    expect(await createRule({}, form(name))).toEqual({ error: "description_text" });
    expect(await updateRule({}, form(name, { id: "r1" }))).toEqual({ error: "description_text" });
    expect(gateway.create).not.toHaveBeenCalled();
    expect(gateway.update).not.toHaveBeenCalled();
  });

  it("a name with text, and with an emoji too, is saved", async () => {
    await expect(createRule({}, form("Veterinario 🐶"))).rejects.toThrow("redirect:");
    expect(gateway.create).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({ description: "Veterinario 🐶" }),
    );
  });
});

describe("BUG-012", () => {
  it("the same fixed expense twice says so, not 'Algo salió mal'", async () => {
    gateway.create.mockRejectedValueOnce(new ApiError("recurring_duplicate", 409));

    expect(await createRule({}, form("Alquiler"))).toEqual({ error: "recurring_duplicate" });
    expect(recurringErrorText("recurring_duplicate")).toBe(
      "Ya tienes uno igual: mismo nombre, monto y frecuencia",
    );
  });
});
