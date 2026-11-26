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

const { checkLink, requestLink } = await import("./verification-actions");

const verification = {
  id: "v1",
  email: "ana@correo.com",
  status: "pending",
  expires_at: "2026-10-20T12:05:00Z",
  resend_available_at: "2026-10-20T12:01:00Z",
};

beforeEach(() => vi.clearAllMocks());

describe("requestLink", () => {
  it("keeps the verification id in a cookie, not in the page (RF-2)", async () => {
    gateway.requestVerification.mockResolvedValue(verification);

    const result = await requestLink(" ana@correo.com ");

    expect(gateway.requestVerification).toHaveBeenCalledWith("ana@correo.com");
    expect(session.saveVerification).toHaveBeenCalledWith("v1");
    expect(result.link).toEqual({
      email: "ana@correo.com",
      status: "pending",
      expiresAt: "2026-10-20T12:05:00Z",
      resendAvailableAt: "2026-10-20T12:01:00Z",
    });
    expect(JSON.stringify(result)).not.toContain("v1");
  });

  it("returns the API code (RF-6)", async () => {
    gateway.requestVerification.mockRejectedValue(new ApiError("email_taken", 409));

    expect(await requestLink("ana@correo.com")).toEqual({ error: "email_taken" });
  });
});

describe("checkLink", () => {
  it("says the verification is missing when the cookie is gone", async () => {
    session.verificationId.mockResolvedValue(undefined);

    expect(await checkLink()).toEqual({ error: "verification_missing" });
  });
});
