// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ResetResult } from "../password-reset-actions";
import { ResetEmailStep } from "./reset-email-step";

const ok = async (): Promise<ResetResult> => ({});
const failing = (error: string) => async (): Promise<ResetResult> => ({ error });

describe("ResetEmailStep", () => {
  it("opens with the email already written (RF-1) and sends the code (RF-2)", async () => {
    const requestCode = vi.fn(ok);
    const onSent = vi.fn();
    render(
      <ResetEmailStep initialEmail="ana@correo.com" requestCode={requestCode} onSent={onSent} />,
    );

    expect(screen.getByLabelText("Correo")).toHaveProperty("value", "ana@correo.com");
    await userEvent.setup().click(screen.getByRole("button", { name: "Enviar código" }));

    expect(requestCode).toHaveBeenCalledWith("ana@correo.com");
    expect(onSent).toHaveBeenCalledWith("ana@correo.com");
  });

  it("keeps Enviar código disabled with an invalid email (RF-2)", () => {
    render(<ResetEmailStep initialEmail="ana@correo" requestCode={ok} onSent={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Enviar código" })).toHaveProperty("disabled", true);
  });

  it("says there is no connection and keeps the email (RF-7)", async () => {
    render(
      <ResetEmailStep
        initialEmail="ana@correo.com"
        requestCode={failing("network_error")}
        onSent={vi.fn()}
      />,
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Enviar código" }));

    expect(screen.getByRole("alert").textContent).toBe("Sin conexión");
    expect(screen.getByLabelText("Correo")).toHaveProperty("value", "ana@correo.com");
  });
});
