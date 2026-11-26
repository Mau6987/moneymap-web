import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

const gateway = vi.hoisted(() => ({
  requestVerification: vi.fn(),
  resendVerification: vi.fn(),
  verification: vi.fn(),
  register: vi.fn(),
}));
const session = vi.hoisted(() => ({
  saveSession: vi.fn(),
  saveVerification: vi.fn(),
  verificationId: vi.fn(),
  clearVerification: vi.fn(),
}));

vi.mock("./data/registration-gateway", () => ({ registrationGateway: () => gateway }));
vi.mock("@/lib/auth/session", () => session);
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

const { createAccount } = await import("./account-actions");

beforeEach(() => vi.clearAllMocks());

describe("createAccount", () => {
  it("registers with the verified email, saves the session and opens the app (RF-5)", async () => {
    const tokens = { access_token: "a", refresh_token: "r", expires_in: 900 };
    session.verificationId.mockResolvedValue("v1");
    gateway.register.mockResolvedValue(tokens);

    await expect(
      createAccount({ firstName: "  Ana  María ", lastName: "Rojas", password: "contrasena12" }),
    ).rejects.toThrow("redirect:/");

    expect(gateway.register).toHaveBeenCalledWith({
      verification_id: "v1",
      first_name: "Ana María",
      last_name: "Rojas",
      password: "contrasena12",
      terms_version: "2026-10",
    });
    expect(session.saveSession).toHaveBeenCalledWith(tokens);
    expect(session.clearVerification).toHaveBeenCalled();
  });

  it("returns the API code when the verification expired", async () => {
    session.verificationId.mockResolvedValue("v1");
    gateway.register.mockRejectedValue(new ApiError("verification_expired", 410));

    expect(
      await createAccount({ firstName: "Ana", lastName: "Rojas", password: "contrasena12" }),
    ).toEqual({ error: "verification_expired" });
  });
});
