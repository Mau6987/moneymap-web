import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/errors";
import { isDemo } from "@/lib/demo";

import type { VoiceEntry } from "../domain/voice-review";

/** `/v1/voice-entries` (spec 012 del back). */
export interface VoiceGateway {
  /** RF-1: el audio crudo; la API responde antes de procesarlo. */
  dictate(token: string, audio: Blob): Promise<VoiceEntry>;
  /** RF-2: la frase escrita en lugar de dicha. */
  write(token: string, text: string): Promise<VoiceEntry>;
  /** RF-8: cómo va el dictado. */
  fetch(token: string, id: string): Promise<VoiceEntry>;
  /** RF-9: enlaza el movimiento guardado. */
  confirm(token: string, id: string, transactionId: string): Promise<void>;
  /** RF-9: el usuario se fue sin guardar. */
  discard(token: string, id: string): Promise<void>;
}

const client = (token: string) => createApiClient({ baseUrl: apiBaseUrl(), accessToken: token });

export const apiVoiceGateway: VoiceGateway = {
  dictate: (token, audio) =>
    unwrap(
      client(token).POST("/v1/voice-entries", {
        body: audio as never,
        // El cuerpo es el audio tal cual, no JSON.
        bodySerializer: (body: unknown) => body as Blob,
        headers: { "Content-Type": audio.type.split(";")[0] || "audio/webm" },
      }),
    ),
  write: (token, text) =>
    unwrap(client(token).POST("/v1/voice-entries/text", { body: { text: text.trim() } })),
  fetch: (token, id) =>
    unwrap(
      client(token).GET("/v1/voice-entries/{entry_id}", { params: { path: { entry_id: id } } }),
    ),
  confirm: async (token, id, transactionId) => {
    await unwrap(
      client(token).POST("/v1/voice-entries/{entry_id}/confirm", {
        params: { path: { entry_id: id } },
        body: { transaction_id: transactionId },
      }),
    );
  },
  discard: async (token, id) => {
    await unwrap(
      client(token).POST("/v1/voice-entries/{entry_id}/discard", {
        params: { path: { entry_id: id } },
      }),
    );
  },
};

/** El demo entiende cualquier frase como el mismo almuerzo en efectivo. */
const demoEntry = (transcript: string): VoiceEntry => ({
  id: "demo-voice",
  created_at: new Date().toISOString(),
  input_type: "text",
  status: "extracted",
  transcript,
  transaction_id: null,
  extraction: {
    kind: "expense",
    amount: "50.00",
    currency: "BOB",
    category_id: null,
    account_id: null,
    description: "Almuerzo",
    occurred_on: null,
    missing: ["category_id"],
    multiple: false,
  },
});

export const demoVoiceGateway: VoiceGateway = {
  dictate: async () => demoEntry("Gasté 50 en almuerzo con efectivo"),
  write: async (_token, text) => demoEntry(text.trim()),
  fetch: async (_token, id) => ({ ...demoEntry(""), id }),
  confirm: async () => {},
  discard: async () => {},
};

export function voiceGateway(): VoiceGateway {
  return isDemo() ? demoVoiceGateway : apiVoiceGateway;
}
