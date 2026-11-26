// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button, ButtonLink } from "./button";
import { ProgressTrack } from "./glass-card";

describe("Button", () => {
  it("is a plain button by default so it never submits by accident", () => {
    render(<Button>Entrar</Button>);

    expect(screen.getByRole("button", { name: "Entrar" }).getAttribute("type")).toBe("button");
  });

  it("keeps a disabled link out of the tab order", () => {
    render(
      <ButtonLink href="/map" disabled>
        Crear cuenta
      </ButtonLink>,
    );

    const link = screen.getByRole("link", { name: "Crear cuenta" });
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.getAttribute("tabindex")).toBe("-1");
  });
});

describe("ProgressTrack", () => {
  it("clamps the value it reports", () => {
    render(<ProgressTrack percent={140} label="Fondo de emergencia" />);

    expect(
      screen
        .getByRole("progressbar", { name: "Fondo de emergencia" })
        .getAttribute("aria-valuenow"),
    ).toBe("100");
  });
});
