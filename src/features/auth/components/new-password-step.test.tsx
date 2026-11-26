// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ResetResult } from "../password-reset-actions";
import { NewPasswordStep } from "./new-password-step";
import { ResetFlow } from "./reset-flow";

const ok = async (): Promise<ResetResult> => ({});
const failing = (error: string) => async (): Promise<ResetResult> => ({ error });

describe("NewPasswordStep", () => {
  it("enables Guardar contraseña only when both passwords match (RF-5)", async () => {
    const save = vi.fn(ok);
    const onSaved = vi.fn();
    render(<NewPasswordStep save={save} onSaved={onSaved} onCodeRejected={vi.fn()} />);
    const user = userEvent.setup();
    const button = screen.getByRole("button", { name: "Guardar contraseña" });

    await user.type(screen.getByLabelText("Nueva contraseña"), "contrasena12");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "contrasena1");
    expect(button).toHaveProperty("disabled", true);
    await user.type(screen.getByLabelText("Confirmar contraseña"), "2");
    await user.click(button);

    expect(save).toHaveBeenCalledWith("contrasena12");
    expect(onSaved).toHaveBeenCalled();
  });

  it("goes back to the code when the API rejects it on save (RF-3)", async () => {
    const onCodeRejected = vi.fn();
    render(
      <NewPasswordStep
        save={failing("invalid_reset_code")}
        onSaved={vi.fn()}
        onCodeRejected={onCodeRejected}
      />,
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Nueva contraseña"), "contrasena12");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "contrasena12");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(onCodeRejected).toHaveBeenCalled();
  });
});

describe("ResetFlow", () => {
  it("ends with Iniciar sesión and the email written (RF-6)", async () => {
    render(
      <ResetFlow
        initialEmail="ana@correo.com"
        actions={{ requestCode: ok, verifyCode: ok, confirm: ok }}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Enviar código" }));
    await user.type(screen.getByLabelText("Código de 6 dígitos"), "123456");
    await user.click(screen.getByRole("button", { name: "Verificar código" }));
    await user.type(screen.getByLabelText("Nueva contraseña"), "contrasena12");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "contrasena12");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(screen.getByRole("heading").textContent).toBe("Contraseña actualizada");
    expect(screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")).toBe(
      "/login?email=ana%40correo.com",
    );
  });
});
