// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DataStep } from "./data-step";

function renderStep(error = "unknown") {
  const createAccount = vi.fn(async () => ({ error }));
  const onVerificationLost = vi.fn();
  render(
    <DataStep
      email="ana@correo.com"
      createAccount={createAccount}
      onVerificationLost={onVerificationLost}
    />,
  );
  return { createAccount, onVerificationLost, user: userEvent.setup() };
}

async function fillAll(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nombre"), "  Ana  ");
  await user.type(screen.getByLabelText("Apellido"), "Rojas");
  await user.type(screen.getByLabelText("Contraseña"), "contrasena12");
  await user.type(screen.getByLabelText("Confirmar contraseña"), "contrasena12");
}

describe("DataStep", () => {
  it("shows the verified email and the password strength (RF-2f)", async () => {
    const { user } = renderStep();

    expect(screen.getByText("ana@correo.com verificado")).toBeTruthy();
    await user.type(screen.getByLabelText("Contraseña"), "contrasena12");

    expect(screen.getByRole("img", { name: "Contraseña segura, 3 de 4" })).toBeTruthy();
  });

  it("keeps Crear cuenta disabled until everything is filled and the terms accepted (RF-3)", async () => {
    const { user } = renderStep();
    const submit = screen.getByRole("button", { name: "Crear cuenta" });

    await fillAll(user);
    expect(submit).toHaveProperty("disabled", true);
    await user.click(screen.getByRole("checkbox"));

    expect(submit).toHaveProperty("disabled", false);
  });

  it("says when the passwords do not match (RF-3)", async () => {
    const { user } = renderStep();

    await user.type(screen.getByLabelText("Contraseña"), "contrasena12");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "contrasena13");

    expect(screen.getByRole("alert").textContent).toBe("No coinciden");
  });

  it("sends the data to create the account (RF-5)", async () => {
    const { createAccount, user } = renderStep();

    await fillAll(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(createAccount).toHaveBeenCalledWith({
      firstName: "  Ana  ",
      lastName: "Rojas",
      password: "contrasena12",
      confirm: "contrasena12",
    });
  });

  it("goes back when the verification expired while filling the form", async () => {
    const { onVerificationLost, user } = renderStep("verification_expired");

    await fillAll(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(onVerificationLost).toHaveBeenCalledWith("verification_expired");
  });
});
