import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

const jar = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => jar.set(name, value),
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

const { withAccessToken } = await import("./session");

beforeEach(() => jar.clear());

describe("withAccessToken", () => {
  it("passes the access token from the cookie to the call", async () => {
    jar.set("mm_access", "a1");

    await expect(withAccessToken(async (token) => `got ${token}`)).resolves.toBe("got a1");
  });

  it("ends the session when there is no access token (RF-20)", async () => {
    await expect(withAccessToken(async () => "never")).rejects.toThrow("redirect:/session/expired");
  });

  it("ends the session when the API answers 401 (RF-20)", async () => {
    jar.set("mm_access", "revoked");
    const call = async () => {
      throw new ApiError("unauthorized", 401);
    };

    await expect(withAccessToken(call)).rejects.toThrow("redirect:/session/expired");
  });

  it("lets any other error through", async () => {
    jar.set("mm_access", "a1");
    const call = async () => {
      throw new ApiError("plan_limit", 403);
    };

    await expect(withAccessToken(call)).rejects.toEqual(new ApiError("plan_limit", 403));
  });
});
