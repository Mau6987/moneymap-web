"use server";

import { unstable_rethrow } from "next/navigation";

import { errorCode } from "@/lib/api/errors";
import { withAccessToken } from "@/lib/auth/session";

import { voiceGateway } from "./data/voice-gateway";
import type { VoiceEntry } from "./domain/voice-review";

export type VoiceResult = { entry: VoiceEntry; error?: never } | { entry?: never; error: string };

/** El límite de la API para el audio (spec 012 del back, RF-1). */
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

/** El de la frase escrita (RF-2). */
const MAX_TEXT_LENGTH = 500;

async function call(run: (token: string) => Promise<VoiceEntry>): Promise<VoiceResult> {
  try {
    return { entry: await withAccessToken(run) };
  } catch (error) {
    // La sesión vencida redirige; lo demás se explica en la pantalla.
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
}

/** Manda el audio grabado o la frase escrita. */
export async function startVoiceEntry(form: FormData): Promise<VoiceResult> {
  const audio = form.get("audio");
  if (audio instanceof Blob) {
    if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) return { error: "invalid_audio" };
    return call((token) => voiceGateway().dictate(token, audio));
  }
  const text = String(form.get("text") ?? "").trim();
  if (!text || text.length > MAX_TEXT_LENGTH) return { error: "validation_error" };
  return call((token) => voiceGateway().write(token, text));
}

/** RF-8: cómo va el dictado. */
export async function voiceEntryStatus(id: string): Promise<VoiceResult> {
  return call((token) => voiceGateway().fetch(token, id));
}

/** RF-9: el usuario se fue sin guardar. Si falla, el dictado queda sin usar. */
export async function discardVoiceEntry(id: string): Promise<void> {
  try {
    await withAccessToken((token) => voiceGateway().discard(token, id));
  } catch (error) {
    unstable_rethrow(error);
  }
}
