// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { catalogs } from "@/lib/i18n/catalog";

import { allScreens } from "./all-screens-menu";
import { AppShell } from "./app-shell";
import { TextField } from "./text-field";

vi.mock("next/navigation", () => ({ usePathname: () => "/goals/123" }));
vi.mock("@/features/auth/logout-action", () => ({ logout: vi.fn() }));

describe("TextField", () => {
  it("links the label to its input", () => {
    render(<TextField label="Correo" type="email" />);

    expect(screen.getByLabelText("Correo").getAttribute("type")).toBe("email");
  });

  it("announces the error and marks the input invalid", () => {
    render(<TextField label="Correo" error="Revisa el correo, falta algo" />);

    const input = screen.getByLabelText("Correo");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Revisa el correo, falta algo");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(alert.id);
  });
});

describe("AppShell", () => {
  it("marks the section of the current page, including its sub-pages", () => {
    render(
      <AppShell user={{ initials: "AL", name: "Ana López", detail: "ana@correo.com" }}>
        <h1>Meta</h1>
      </AppShell>,
    );

    const current = screen.getByRole("link", { current: "page" });
    expect(current.getAttribute("href")).toBe("/goals");
    // En la barra del teléfono y arriba en el menú lateral, siempre a mano.
    const add = screen.getAllByRole("link", { name: "Registrar movimiento" });
    expect(add.map((link) => link.getAttribute("href"))).toEqual(["/add", "/add"]);
    expect(screen.getByRole("link", { name: "Transferir" }).getAttribute("href")).toBe("/transfer");
  });

  it("BUG-062 only the links scroll: the profile and Cerrar sesión stay out of it, always visible", () => {
    render(
      <AppShell user={{ initials: "AL", name: "Ana López", detail: "ana@correo.com" }}>
        <h1>Meta</h1>
      </AppShell>,
    );

    const links = screen.getByTestId("shell-links");
    expect(links.className).toContain("md:overflow-y-auto");
    expect(within(links).getByRole("link", { name: "Map" })).toBeTruthy();
    expect(links.contains(screen.getByText("Ana López"))).toBe(false);
    const nav = screen.getByRole("navigation", { name: "Menú" });
    const logout = within(nav).getByRole("button", { name: "Cerrar sesión" });
    expect(links.contains(logout)).toBe(false);
  });
});

describe("Cerrar sesión en el menú principal", () => {
  it("is in the sidebar and at the end of every all-screens menu, not only in Settings", () => {
    render(
      <AppShell user={{ initials: "AL", name: "Ana López", detail: "ana@correo.com" }}>
        <h1>Meta</h1>
      </AppShell>,
    );

    const label = catalogs.es.auth.logout.action;
    // El menú lateral y los dos "Todas las pantallas" (barra lateral y teléfono).
    // Sin contar el botón de confirmar que vive dentro de cada diálogo.
    const buttons = screen
      .getAllByRole("button", { name: label, hidden: true })
      .filter((b) => b.nextElementSibling?.tagName === "DIALOG");
    expect(buttons).toHaveLength(3);
    // Cada uno con su diálogo de confirmación y su propio título.
    const titles = buttons.map((b) => b.nextElementSibling?.getAttribute("aria-labelledby"));
    expect(new Set(titles).size).toBe(3);
  });
});

describe("Todas las pantallas (MM-175)", () => {
  it("lists every screen once, including the ones the bottom bar has no room for", () => {
    const hrefs = allScreens(catalogs.es.common.nav).flatMap((g) => g.screens.map((s) => s.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of [
      "/budgets",
      "/money-flow",
      "/safe-to-spend",
      "/accounts",
      "/plans",
      "/settings",
    ]) {
      expect(hrefs).toContain(href);
    }
  });

  it("opens from a button in the phone bar and in the sidebar, and marks the current page", () => {
    render(
      <AppShell user={{ initials: "AL", name: "Ana López", detail: "ana@correo.com" }}>
        <h1>Meta</h1>
      </AppShell>,
    );
    const buttons = screen.getAllByRole("button", { name: "Todas las pantallas" });
    expect(buttons).toHaveLength(2);
    const dialog = document.querySelector<HTMLElement>('dialog[aria-label="Todas las pantallas"]')!;
    const goals = within(dialog).getByRole("link", { name: "Metas", hidden: true });
    expect(goals.getAttribute("aria-current")).toBe("page");
  });
});
