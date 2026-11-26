// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ResetResult } from "../password-reset-actions";
import { ResetCodeStep } from "./reset-code-step";

const ok = async (): Promise<ResetResult> => ({});
const failing = (error: string) => async (): Promise<ResetResult> => ({ error });

describe("ResetCodeStep", () => {
  const NOW = Date.parse("2026-10-20T12:00:00Z");

  function renderStep(verifyCode: () => Promise<ResetResult>, requestCode = vi.fn(ok)) {
    const onVerified = vi.fn();
    render(
      <ResetCodeStep
        email="ana@correo.com"
        verifyCode={verifyCode}
        requestCode={requestCode}
        onVerified={onVerified}
        onChangeEmail={vi.fn()}
        now={() => NOW}
      />,
    );
    return { onVerified, requestCode, user: userEvent.setup() };
  }

  it("never says whether the email has an account and shows the time left (RF-2)", () => {
    renderStep(ok);

    expect(
      screen.getByText(
        "Si tu correo tiene una cuenta, te enviaremos un código de 6 dígitos. Vence en 30 min",
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText("Tiempo restante").textContent).toBe("30:00");
  });

  it("verifies only with six digits and then continues (RF-5)", async () => {
    const { onVerified, user } = renderStep(ok);
    const verify = screen.getByRole("button", { name: "Verificar código" });

    await user.type(screen.getByLabelText("Código de 6 dígitos"), "12a345");
    expect(verify).toHaveProperty("disabled", true);
    await user.type(screen.getByLabelText("Código de 6 dígitos"), "6");
    await user.click(verify);

    expect(onVerified).toHaveBeenCalledWith("123456");
  });

  it("empties the field on a wrong or expired code (RF-3)", async () => {
    const { user } = renderStep(failing("invalid_reset_code"));

    await user.type(screen.getByLabelText("Código de 6 dígitos"), "999999");
    await user.click(screen.getByRole("button", { name: "Verificar código" }));

    expect(screen.getByRole("alert").textContent).toBe(
      "El código no coincide o ya venció. Pídelo de nuevo",
    );
    expect(screen.getByLabelText("Código de 6 dígitos")).toHaveProperty("value", "");
    expect(screen.getByRole("button", { name: "Verificar código" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("waits a minute before offering another code (RF-4)", () => {
    renderStep(ok);

    expect(screen.getByRole("button", { name: "Reenviar en 1:00" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("asks to wait after too many attempts (RF-8)", async () => {
    const { user } = renderStep(failing("too_many_requests"));

    await user.type(screen.getByLabelText("Código de 6 dígitos"), "123456");
    await user.click(screen.getByRole("button", { name: "Verificar código" }));

    expect(screen.getByRole("alert").textContent).toBe(
      "Demasiados intentos. Espera un momento e intenta de nuevo",
    );
  });
});
