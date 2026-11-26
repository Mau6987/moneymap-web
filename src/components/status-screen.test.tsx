// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ErrorScreen } from "./error-screen";
import { StatusScreen } from "./status-screen";

describe("StatusScreen", () => {
  it("MM-182 shows the title, what happened and the actions", () => {
    render(
      <StatusScreen
        fullScreen
        icon="map-off"
        code="404"
        title="Esta página no existe"
        body="Puede que el enlace esté mal."
        actions={<a href="/map">Ir al Map</a>}
      />,
    );

    expect(screen.getByRole("heading", { name: "Esta página no existe" })).toBeTruthy();
    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ir al Map" })).toBeTruthy();
  });

  it("the error screen retries and shows the reference", () => {
    const reset = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorScreen error={Object.assign(new Error("x"), { digest: "abc123" })} reset={reset} />,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Referencia: abc123")).toBeTruthy();
    screen.getByRole("button", { name: "Reintentar" }).click();
    expect(reset).toHaveBeenCalledOnce();
  });
});
