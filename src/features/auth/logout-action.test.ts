import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, NETWORK_ERROR } from "@/lib/api/errors";

const gateway = vi.hoisted(() => ({
  login: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
}));
const session = vi.hoisted(() => ({
  clearSession: vi.fn(),
  refreshToken: vi.fn(),
}));
const navigation = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("./data/auth-gateway", () => ({ authGateway: () => gateway }));
vi.mock("@/lib/auth/session", () => session);
vi.mock("next/navigation", () => navigation);

const { logout } = await import("./logout-action");

beforeEach(() => vi.clearAllMocks());

describe("logout", () => {
  it("revokes the refresh token, clears the cookies and opens the login", async () => {
    session.refreshToken.mockResolvedValue("r1");

    await expect(logout()).rejects.toThrow("redirect:/login");

    expect(gateway.logout).toHaveBeenCalledWith("r1");
    expect(session.clearSession).toHaveBeenCalled();
  });

  it("clears the session even without connection", async () => {
    session.refreshToken.mockResolvedValue("r1");
    gateway.logout.mockRejectedValue(new ApiError(NETWORK_ERROR, 0));

    await expect(logout()).rejects.toThrow("redirect:/login");

    expect(session.clearSession).toHaveBeenCalled();
  });
});
