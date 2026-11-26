// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { LinkResult } from "../verification-actions";
import { EmailStep } from "./email-step";

const link = {
  email: "ana@correo.com",
  status: "pending" as const,
  expiresAt: "2026-10-20T12:05:00Z",
  resendAvailableAt: "2026-10-20T12:01:00Z",
};

function renderStep(result: LinkResult) {
  const requestLink = vi.fn(async () => result);
  const onSent = vi.fn();
  render(<EmailStep initialEmail="" requestLink={requestLink} onSent={onSent} />);
  return { requestLink, onSent, user: userEvent.setup() };
}

describe("EmailStep", () => {
  it("asks only for the email and sends the link (RF-2)", async () => {
    const { requestLink, onSent, user } = renderStep({ link });

    await user.type(screen.getByLabelText("Correo"), "ana@correo.com");
    await user.click(screen.getByRole("button", { name: "Enviar link" }));

    expect(requestLink).toHaveBeenCalledWith("ana@correo.com");
    expect(onSent).toHaveBeenCalledWith(link);
  });

  it("flags an incomplete email and keeps Enviar link disabled (RF-2a)", async () => {
    const { user } = renderStep({ link });

    await user.type(screen.getByLabelText("Correo"), "ana@correo");

    expect(screen.getByRole("alert").textContent).toBe("Revisa el correo, falta algo");
    expect(screen.getByRole("button", { name: "Enviar link" })).toHaveProperty("disabled", true);
  });

  it("offers to sign in with that email when it already has an account (RF-6)", async () => {
    const { onSent, user } = renderStep({ error: "email_taken" });

    await user.type(screen.getByLabelText("Correo"), "ana@correo.com");
    await user.click(screen.getByRole("button", { name: "Enviar link" }));

    expect(onSent).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("Este correo ya tiene una cuenta");
    expect(screen.getByRole("link", { name: "Entrar" }).getAttribute("href")).toBe(
      "/login?email=ana%40correo.com",
    );
    expect(
      screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).getAttribute("href"),
    ).toBe("/forgot-password?email=ana%40correo.com");
  });

  it("keeps the email and says there is no connection", async () => {
    const { user } = renderStep({ error: "network_error" });

    await user.type(screen.getByLabelText("Correo"), "ana@correo.com");
    await user.click(screen.getByRole("button", { name: "Enviar link" }));

    expect(screen.getByRole("alert").textContent).toBe("Sin conexión");
    expect(screen.getByLabelText("Correo")).toHaveProperty("value", "ana@correo.com");
  });
});
