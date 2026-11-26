import { beforeEach, describe, expect, it, vi } from "vitest";

const transfers = vi.hoisted(() => ({ register: vi.fn() }));

vi.mock("./data/transfers-gateway", () => ({ transfersGateway: () => transfers }));
vi.mock("@/lib/auth/session", () => ({
  withAccessToken: (call: (token: string) => unknown) => call("token"),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
  unstable_rethrow: () => {},
}));

const { registerTransfer } = await import("./transfer-action");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  const base = { amount: "100", date: "2026-10-24", key: "k1", decimals: "2" };
  for (const [key, value] of Object.entries({ ...base, ...fields })) data.set(key, value);
  return data;
};

beforeEach(() => vi.clearAllMocks());

describe("registerTransfer", () => {
  it("entre cuentas es una transferencia", async () => {
    await expect(registerTransfer({}, form({ from: "cash", to: "bnb" }))).rejects.toThrow(
      "redirect:/transactions?saved=transfer",
    );
    expect(transfers.register).toHaveBeenCalled();
  });

  it("a la misma cuenta no se puede", async () => {
    expect(await registerTransfer({}, form({ from: "cash", to: "cash" }))).toEqual({
      error: "validation_error",
    });
    expect(transfers.register).not.toHaveBeenCalled();
  });
});
