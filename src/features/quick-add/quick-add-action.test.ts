import { beforeEach, describe, expect, it, vi } from "vitest";

const gateway = vi.hoisted(() => ({ register: vi.fn(async () => "tx-1") }));

vi.mock("./data/quick-add-gateway", () => ({ quickAddGateway: () => gateway }));
vi.mock("@/lib/auth/session", () => ({
  withAccessToken: (call: (token: string) => unknown) => call("token"),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
  unstable_rethrow: () => {},
}));

const { registerTransaction } = await import("./quick-add-action");

const form = (description: string) => {
  const data = new FormData();
  const fields = {
    kind: "expense",
    account: "cash",
    category: "c-food",
    decimals: "2",
    date: "2026-10-30",
    key: "k1",
    amount: "35",
    description,
  };
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

beforeEach(() => vi.clearAllMocks());

describe("BUG-004", () => {
  it.each(["-", "...", "🐶"])("a description of only %j is not saved", async (description) => {
    expect(await registerTransaction({}, form(description))).toEqual({
      error: "description_text",
    });
    expect(gateway.register).not.toHaveBeenCalled();
  });

  it.each(["", "Almuerzo", "Café ☕"])("%j is fine: empty takes the category's name", async (d) => {
    await expect(registerTransaction({}, form(d))).rejects.toThrow("redirect:");
    expect(gateway.register).toHaveBeenCalled();
  });
});

describe("BUG-050", () => {
  it("the description is saved without extra spaces", async () => {
    await expect(registerTransaction({}, form("  Almuerzo   con	Ana  "))).rejects.toThrow(
      "redirect:",
    );
    expect(gateway.register).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({ description: "Almuerzo con Ana" }),
      expect.anything(),
    );
  });
});
