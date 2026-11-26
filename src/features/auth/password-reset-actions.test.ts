import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, NETWORK_ERROR } from "@/lib/api/errors";

const gateway = vi.hoisted(() => ({
  requestCode: vi.fn(),
  verifyCode: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock("./data/password-reset-gateway", () => ({ passwordResetGateway: () => gateway }));

const { confirmPasswordReset, requestResetCode, verifyResetCode } =
  await import("./password-reset-actions");

beforeEach(() => vi.clearAllMocks());

describe("requestResetCode", () => {
  it("asks the API for a code with the trimmed email (RF-2)", async () => {
    expect(await requestResetCode(" ana@correo.com ")).toEqual({});
    expect(gateway.requestCode).toHaveBeenCalledWith("ana@correo.com");
  });

  it("returns the API code when it fails (RF-7 and RF-8)", async () => {
    gateway.requestCode.mockRejectedValueOnce(new ApiError(NETWORK_ERROR, 0));
    gateway.requestCode.mockRejectedValueOnce(new ApiError("too_many_requests", 429));

    expect(await requestResetCode("ana@correo.com")).toEqual({ error: NETWORK_ERROR });
    expect(await requestResetCode("ana@correo.com")).toEqual({ error: "too_many_requests" });
  });
});

describe("verifyResetCode", () => {
  it("only asks the API with six digits (RF-5)", async () => {
    expect(await verifyResetCode("ana@correo.com", "12345")).toEqual({
      error: "invalid_reset_code",
    });
    expect(gateway.verifyCode).not.toHaveBeenCalled();

    expect(await verifyResetCode("ana@correo.com", "123456")).toEqual({});
    expect(gateway.verifyCode).toHaveBeenCalledWith("ana@correo.com", "123456");
  });

  it("passes on a wrong or expired code (RF-3)", async () => {
    gateway.verifyCode.mockRejectedValue(new ApiError("invalid_reset_code", 400));

    expect(await verifyResetCode("ana@correo.com", "999999")).toEqual({
      error: "invalid_reset_code",
    });
  });
});

describe("confirmPasswordReset", () => {
  it("sends the email, the code and the new password in one call (RF-6)", async () => {
    expect(await confirmPasswordReset("ana@correo.com", "123456", "contrasena12")).toEqual({});
    expect(gateway.confirm).toHaveBeenCalledWith("ana@correo.com", "123456", "contrasena12");
  });

  it("refuses a short password before calling the API", async () => {
    expect(await confirmPasswordReset("ana@correo.com", "123456", "corta")).toEqual({
      error: "validation_error",
    });
    expect(gateway.confirm).not.toHaveBeenCalled();
  });
});
