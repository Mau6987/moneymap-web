// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { LinkResult, LinkState } from "../verification-actions";
import { VerifyStep } from "./verify-step";

const NOW = Date.parse("2026-10-20T12:00:00Z");
const link: LinkState = {
  email: "ana@correo.com",
  status: "pending",
  expiresAt: "2026-10-20T12:05:00Z",
  resendAvailableAt: "2026-10-20T11:59:00Z",
};

function renderStep(check: LinkResult, resend: LinkResult = { link }) {
  const props = {
    checkLink: vi.fn(async () => check),
    resendLink: vi.fn(async () => resend),
    onVerified: vi.fn(),
    onChangeEmail: vi.fn(),
  };
  render(<VerifyStep link={link} now={() => NOW} {...props} />);
  return { ...props, user: userEvent.setup() };
}

describe("VerifyStep", () => {
  it("shows the email, the minutes left and the three actions (RF-2b)", () => {
    renderStep({ link });

    expect(screen.getByRole("heading").textContent).toBe("Revisa tu correo");
    expect(screen.getByText("El link vence en 5 min")).toBeTruthy();
    expect(screen.getByText("ana@correo.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ya verifiqué · Continuar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reenviar link" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cambiar correo" })).toBeTruthy();
  });

  it("resends, announces it and counts down until the API allows another (RF-2c)", async () => {
    const later = { ...link, resendAvailableAt: "2026-10-20T12:00:59Z" };
    const { resendLink, user } = renderStep({ link }, { link: later });

    await user.click(screen.getByRole("button", { name: "Reenviar link" }));

    expect(resendLink).toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Link reenviado");
    expect(screen.getByRole("button", { name: "Reenviar en 0:59" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("says it does not see the verification yet (RF-2d)", async () => {
    const { user } = renderStep({ link });

    await user.click(screen.getByRole("button", { name: "Ya verifiqué · Continuar" }));

    expect(screen.getByRole("heading").textContent).toBe("Aún no lo vemos");
  });

  it("offers a new link when it expired (RF-2d)", async () => {
    const { user } = renderStep({ link: { ...link, status: "expired" } });

    await user.click(screen.getByRole("button", { name: "Ya verifiqué · Continuar" }));

    expect(screen.getByRole("heading").textContent).toBe("El link expiró");
    expect(screen.getByRole("button", { name: "Enviar nuevo link" })).toBeTruthy();
  });

  it("continues once the email is verified (RF-2e)", async () => {
    const { onVerified, user } = renderStep({ link: { ...link, status: "verified" } });

    await user.click(screen.getByRole("button", { name: "Ya verifiqué · Continuar" }));
    expect(screen.getByRole("heading").textContent).toBe("Correo verificado");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(onVerified).toHaveBeenCalled();
  });

  it("goes back to the email when the verification was lost", async () => {
    const { onChangeEmail, user } = renderStep({ error: "verification_missing" });

    await user.click(screen.getByRole("button", { name: "Ya verifiqué · Continuar" }));

    expect(onChangeEmail).toHaveBeenCalledWith("Vuelve a verificar tu correo");
  });
});
