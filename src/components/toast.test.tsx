// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let search = new URLSearchParams("saved=expense");
vi.mock("next/navigation", () => ({ useSearchParams: () => search }));

const { Toast, TOAST_MS } = await import("./toast");

describe("BUG-061 Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    search = new URLSearchParams("saved=expense");
    window.history.replaceState(null, "", "/transactions?saved=expense&kind=income");
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("goes away by itself and leaves the URL without the notice", () => {
    render(<Toast>Gasto registrado</Toast>);
    expect(screen.getByRole("status").textContent).toBe("Gasto registrado");
    // Al recargar no vuelve: el aviso ya no está en la URL; el resto de filtros, sí.
    expect(window.location.search).toBe("?kind=income");

    act(() => vi.advanceTimersByTime(TOAST_MS));

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows again when the screen notices a new save", () => {
    const { rerender } = render(<Toast>Gasto registrado</Toast>);
    search = new URLSearchParams("");
    rerender(<Toast>Gasto registrado</Toast>);
    act(() => vi.advanceTimersByTime(TOAST_MS));
    expect(screen.queryByRole("status")).toBeNull();

    search = new URLSearchParams("saved=expense");
    rerender(<Toast>Gasto registrado</Toast>);

    expect(screen.getByRole("status")).toBeTruthy();
  });
});
