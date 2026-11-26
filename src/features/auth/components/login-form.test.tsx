// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { LoginState } from "../login-action";
import { LoginForm } from "./login-form";

function failingWith(code: string) {
  return vi.fn(async (_state: LoginState, form: FormData) => ({
    email: String(form.get("email")),
    error: code,
  }));
}

async function fillIn(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Correo"), email);
  await user.type(screen.getByLabelText("Contraseña"), password);
  return user;
}

describe("LoginForm", () => {
  it("keeps Entrar disabled until the email is valid and there is a password (RF-3)", async () => {
    render(<LoginForm action={failingWith("unknown")} />);
    const submit = screen.getByRole("button", { name: "Entrar" });

    expect(submit).toHaveProperty("disabled", true);
    const user = await fillIn("ana@correo", "secreta");
    expect(submit).toHaveProperty("disabled", true);
    await user.type(screen.getByLabelText("Correo"), ".com");
    expect(submit).toHaveProperty("disabled", false);
  });

  it("shows the email already written and focuses the password (RF-2)", () => {
    render(<LoginForm action={failingWith("unknown")} initialEmail="ana@correo.com" />);

    expect(screen.getByLabelText("Correo")).toHaveProperty("value", "ana@correo.com");
    expect(document.activeElement).toBe(screen.getByLabelText("Contraseña"));
  });

  it("sends the email and password to the action", async () => {
    const action = failingWith("unknown");
    render(<LoginForm action={action} />);

    const user = await fillIn("ana@correo.com", "secreta");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const form = action.mock.calls[0]?.[1];
    expect(form?.get("email")).toBe("ana@correo.com");
    expect(form?.get("password")).toBe("secreta");
  });

  it("clears the password and keeps the email on wrong credentials (RF-5)", async () => {
    render(<LoginForm action={failingWith("invalid_credentials")} />);

    const user = await fillIn("ana@correo.com", "incorrecta");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Correo o contraseña incorrectos");
    // La contraseña se vacía en un efecto, después de que aparece el error.
    await waitFor(() => expect(screen.getByLabelText("Contraseña")).toHaveProperty("value", ""));
    expect(screen.getByLabelText("Correo")).toHaveProperty("value", "ana@correo.com");
  });

  it("asks to wait after too many attempts (RF-6)", async () => {
    render(<LoginForm action={failingWith("too_many_requests")} />);

    const user = await fillIn("ana@correo.com", "secreta");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Demasiados intentos. Espera un momento e intenta de nuevo",
    );
  });

  it("explains that the previous session ended (RF-20)", () => {
    render(<LoginForm action={failingWith("unknown")} expired />);

    expect(screen.getByRole("status").textContent).toBe(
      "Tu sesión terminó. Inicia sesión de nuevo",
    );
  });

  it("takes the written email to the password recovery (spec 009, RF-1)", async () => {
    render(<LoginForm action={failingWith("unknown")} />);

    await userEvent.setup().type(screen.getByLabelText("Correo"), "ana@correo.com");

    expect(screen.getByRole("link", { name: "¿La olvidaste?" }).getAttribute("href")).toBe(
      "/forgot-password?email=ana%40correo.com",
    );
  });

  it("links to the registration (RF-7) and to the password recovery", () => {
    render(<LoginForm action={failingWith("unknown")} />);

    expect(screen.getByRole("link", { name: "Crear cuenta" }).getAttribute("href")).toBe(
      "/register",
    );
    expect(screen.getByRole("link", { name: "¿La olvidaste?" }).getAttribute("href")).toBe(
      "/forgot-password",
    );
  });
});
