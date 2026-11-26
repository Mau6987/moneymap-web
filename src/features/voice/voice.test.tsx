// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { VoiceEntry } from "./domain/voice-review";

vi.mock("./voice-actions", () => ({
  startVoiceEntry: vi.fn(),
  voiceEntryStatus: vi.fn(),
  discardVoiceEntry: vi.fn(),
}));
vi.mock("../quick-add/quick-add-action", () => ({
  registerTransaction: vi.fn(async () => ({})),
  registerVoiceMovements: vi.fn(async () => ({})),
}));

const { startVoiceEntry, voiceEntryStatus, discardVoiceEntry } = await import("./voice-actions");
const { registerTransaction } = await import("../quick-add/quick-add-action");
const { AddTabs } = await import("./components/add-tabs");
const { MAX_WAIT_MS, POLL_INTERVAL_MS, REQUEST_TIMEOUT_MS } =
  await import("./components/voice-panel");

const accounts = [
  { id: "cash", name: "Efectivo", currency: "BOB", label: "Bs", decimals: 2, isDefault: true },
  { id: "usd", name: "Tarjeta USD", currency: "USD", label: "$", decimals: 2, isDefault: false },
];
const categories = [
  { id: "food", name: "Comida", type: "expense", color: "#D25A42" },
  { id: "salary", name: "Salario", type: "income", color: "#2E8A62" },
];

const entry = (
  status: VoiceEntry["status"],
  extraction: Partial<NonNullable<VoiceEntry["extraction"]>> = {},
): VoiceEntry => ({
  id: "v1",
  created_at: "2026-10-24T12:00:00Z",
  input_type: "text",
  status,
  transcript: "Gasté 50 en almuerzo con efectivo",
  transaction_id: null,
  extraction:
    status === "extracted"
      ? {
          kind: "expense",
          amount: "50.00",
          currency: "BOB",
          category_id: "food",
          account_id: "cash",
          description: "Almuerzo",
          occurred_on: "2026-10-24",
          missing: [],
          ...extraction,
          multiple: extraction.multiple ?? false,
        }
      : null,
});

const renderTabs = () =>
  render(
    <AddTabs
      action={registerTransaction}
      accounts={accounts}
      categories={categories}
      today="2026-10-24"
      idempotencyKey="k1"
    />,
  );

async function writePhrase() {
  await userEvent.click(screen.getByRole("button", { name: "Dictar" }));
  await userEvent.type(screen.getByLabelText("O escríbelo"), "Gasté 50");
  await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
}

describe("registro por voz", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(startVoiceEntry).mockResolvedValue({ entry: entry("received") });
    vi.mocked(voiceEntryStatus).mockResolvedValue({ entry: entry("extracted") });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("RF-2 and RF-8 a written phrase is reviewed once the worker is done", async () => {
    renderTabs();
    await writePhrase();

    expect(await screen.findByText("Revisa y confirma")).toBeTruthy();
    const sent = vi.mocked(startVoiceEntry).mock.calls[0]![0];
    expect(sent.get("text")).toBe("Gasté 50");
    expect(voiceEntryStatus).toHaveBeenCalledWith("v1");
    expect(screen.getByText("−Bs 50,00")).toBeTruthy();
    expect(screen.getByText("Comida")).toBeTruthy();
    expect(screen.getByText("Efectivo")).toBeTruthy();
    expect(screen.getByText("Hoy")).toBeTruthy();
  });

  it("RF-9 Confirmar sends the movement linked to the dictation", async () => {
    renderTabs();
    await writePhrase();

    await userEvent.click(await screen.findByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(registerTransaction).toHaveBeenCalled());
    const form = vi.mocked(registerTransaction).mock.calls[0]![1];
    expect(Object.fromEntries(form.entries())).toMatchObject({
      kind: "expense",
      account: "cash",
      category: "food",
      amount: "50",
      date: "2026-10-24",
      description: "Almuerzo",
      voice: "v1",
      key: "k1",
    });
  });

  it("Corregir opens Quick Add with what was understood", async () => {
    renderTabs();
    await writePhrase();

    await userEvent.click(await screen.findByRole("button", { name: "Corregir" }));

    expect((screen.getByPlaceholderText("0") as HTMLInputElement).value).toBe("50");
    expect(screen.getByRole("button", { name: "Comida" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect((document.querySelector('input[name="voice"]') as HTMLInputElement).value).toBe("v1");
  });

  it("what is missing blocks Confirmar", async () => {
    vi.mocked(voiceEntryStatus).mockResolvedValue({
      entry: entry("extracted", { amount: null, missing: ["amount"] }),
    });
    renderTabs();
    await writePhrase();

    expect(await screen.findByText("Falta el monto")).toBeTruthy();
    const confirm = screen.getByRole("button", { name: "Confirmar" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });

  it("RF-12 a currency without accounts asks what to do", async () => {
    vi.mocked(voiceEntryStatus).mockResolvedValue({
      entry: entry("extracted", { currency: "EUR" }),
    });
    renderTabs();
    await writePhrase();

    expect(
      await screen.findByText(
        "No tienes una cuenta en EUR. ¿Crear una o registrarlo en otra cuenta?",
      ),
    ).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Otra cuenta" }));

    // El monto queda para lo que se pagó de verdad en esa cuenta.
    expect((screen.getByPlaceholderText("0") as HTMLInputElement).value).toBe("");
  });

  it("RF-9 Descartar discards the dictation", async () => {
    renderTabs();
    await writePhrase();

    await userEvent.click(await screen.findByRole("button", { name: "Descartar" }));

    expect(discardVoiceEntry).toHaveBeenCalledWith("v1");
    expect(screen.getByLabelText("O escríbelo")).toBeTruthy();
  });

  it("RF-7 a failed dictation says so", async () => {
    vi.mocked(voiceEntryStatus).mockResolvedValue({ entry: entry("failed") });
    renderTabs();
    await writePhrase();

    expect(
      await screen.findByText("No pudimos entender el dictado. Inténtalo de nuevo o escríbelo."),
    ).toBeTruthy();
  });

  it("BUG-045 a call that fails does not leave the screen processing", async () => {
    vi.mocked(startVoiceEntry).mockRejectedValue(new Error("server action failed"));
    renderTabs();
    await writePhrase();

    expect(
      await screen.findByText("No pudimos entender el dictado. Inténtalo de nuevo o escríbelo."),
    ).toBeTruthy();
    expect(screen.queryByText("Entendiendo lo que dijiste…")).toBeNull();
    expect((screen.getByLabelText("O escríbelo") as HTMLInputElement).disabled).toBe(false);
  });

  it("BUG-045 a call that never answers ends in a timeout", async () => {
    vi.mocked(startVoiceEntry).mockReturnValue(new Promise(() => {}));
    renderTabs();
    await writePhrase();
    expect(screen.getByText("Entendiendo lo que dijiste…")).toBeTruthy();

    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);

    expect(
      await screen.findByText("El dictado está tardando más de lo normal. Inténtalo de nuevo."),
    ).toBeTruthy();
  });

  it("BUG-045 a worker that never finishes stops waiting", async () => {
    vi.mocked(voiceEntryStatus).mockResolvedValue({ entry: entry("transcribed") });
    renderTabs();
    await writePhrase();

    await vi.advanceTimersByTimeAsync(MAX_WAIT_MS + POLL_INTERVAL_MS);

    expect(
      await screen.findByText("El dictado está tardando más de lo normal. Inténtalo de nuevo."),
    ).toBeTruthy();
  });

  it("BUG-045 Cancelar stops waiting and discards the dictation", async () => {
    vi.mocked(voiceEntryStatus).mockResolvedValue({ entry: entry("transcribed") });
    renderTabs();
    await writePhrase();
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(discardVoiceEntry).toHaveBeenCalledWith("v1");
    expect(screen.queryByText("Entendiendo lo que dijiste…")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("RF-3 an exhausted plan says so", async () => {
    vi.mocked(startVoiceEntry).mockResolvedValue({ error: "plan_limit" });
    renderTabs();
    await writePhrase();

    expect(await screen.findByText("Ya usaste los dictados de tu plan este mes.")).toBeTruthy();
  });

  it("BUG-033 the microphone and Transferir are round buttons by the title, like the app", async () => {
    renderTabs();

    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByRole("link", { name: "Transferir" }).getAttribute("href")).toBe("/transfer");
    const mic = screen.getByRole("button", { name: "Dictar" });
    expect(mic.getAttribute("aria-pressed")).toBe("false");

    await userEvent.click(mic);
    expect(screen.getByRole("button", { name: "Empezar a dictar" })).toBeTruthy();

    // El mismo botón vuelve a escribirlo.
    await userEvent.click(screen.getByRole("button", { name: "Escribir" }));
    expect(screen.getByRole("radio", { name: /Gasto/ })).toBeTruthy();
  });

  it("like the app, a phrase with several movements shows them in a list to confirm together", async () => {
    vi.mocked(voiceEntryStatus).mockResolvedValue({
      entry: entry("extracted", {
        multiple: true,
        movements: [
          {
            kind: "expense",
            amount: "35.00",
            currency: "BOB",
            category_id: "food",
            account_id: "cash",
            description: "Almuerzo",
            occurred_on: "2026-10-24",
            missing: [],
          },
          {
            kind: "income",
            amount: "100.00",
            currency: "BOB",
            category_id: "salary",
            account_id: "cash",
            description: "Venta",
            occurred_on: "2026-10-24",
            missing: [],
          },
          {
            kind: "expense",
            amount: null,
            currency: null,
            category_id: null,
            account_id: null,
            description: "Taxi",
            occurred_on: null,
            missing: ["amount"],
          },
        ],
      }),
    });
    const { container } = renderTabs();
    await writePhrase();

    expect(
      await screen.findByText("Tu frase tuvo 3 movimientos. Corrige el que haga falta."),
    ).toBeTruthy();
    expect(screen.getByText("−Bs 35,00")).toBeTruthy();
    expect(screen.getByText("+Bs 100,00")).toBeTruthy();
    expect(screen.getByText("Falta el monto")).toBeTruthy();
    // Solo los completos van juntos; el que falta se corrige en Quick Add.
    const confirm = screen.getByRole("button", { name: "Confirmar 2" });
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    const sent = JSON.parse(
      container.querySelector<HTMLInputElement>('input[name="movements"]')!.value,
    ) as { amount: string }[];
    expect(sent.map((m) => m.amount)).toEqual(["35", "100"]);
  });

  it("like the app, the free plan invites to the paid ones and the quota shows", async () => {
    const { rerender } = render(
      <AddTabs
        action={registerTransaction}
        accounts={accounts}
        categories={categories}
        today="2026-10-24"
        idempotencyKey="k1"
        voice={{ enabled: false, used: 0, limit: 0 }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Dictar" }));
    expect(screen.getByText("Dictar es de los planes pagos")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver planes" }).getAttribute("href")).toBe("/plans");

    rerender(
      <AddTabs
        action={registerTransaction}
        accounts={accounts}
        categories={categories}
        today="2026-10-24"
        idempotencyKey="k1"
        voice={{ enabled: true, used: 3, limit: 30 }}
      />,
    );
    expect(screen.getByTestId("voice-quota").textContent).toBe("3 de 30 dictados usados este mes");
  });

  it("without a microphone it asks for it", async () => {
    renderTabs();
    await userEvent.click(screen.getByRole("button", { name: "Dictar" }));

    await userEvent.click(screen.getByRole("button", { name: "Empezar a dictar" }));

    expect(
      await screen.findByText("Para dictar, permite el micrófono en el navegador."),
    ).toBeTruthy();
    expect(startVoiceEntry).not.toHaveBeenCalled();
  });
});
