import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    get: (name: string) => (values.has(name) ? { value: values.get(name) } : undefined),
    set: (name: string, value: string) => values.set(name, value),
    delete: (name: string) => values.delete(name),
  };
});

vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

const { amountsHidden } = await import("./privacy");
const { toggleAmounts } = await import("@/features/map/map-actions");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe("el ojo del modo privado, como la app", () => {
  beforeEach(() => jar.values.clear());

  it("without private mode nothing is hidden", async () => {
    expect(await amountsHidden({ hide_amounts: false })).toBe(false);
    expect(await amountsHidden(null)).toBe(false);
  });

  it("the eye shows the amounts until the browser closes, and hides them again", async () => {
    expect(await amountsHidden({ hide_amounts: true })).toBe(true);

    await expect(toggleAmounts(form({ reveal: "1", back: "/map?currency=USD" }))).rejects.toThrow(
      "redirect:/map?currency=USD",
    );
    expect(await amountsHidden({ hide_amounts: true })).toBe(false);

    await expect(toggleAmounts(form({ reveal: "0", back: "https://otro.sitio" }))).rejects.toThrow(
      "redirect:/map",
    );
    expect(await amountsHidden({ hide_amounts: true })).toBe(true);
  });
});
