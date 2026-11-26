"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { errorCode } from "@/lib/api/errors";
import { withAccessToken } from "@/lib/auth/session";

import { notificationsGateway } from "./data/notifications-gateway";

export interface NoticesState {
  error?: string;
}

/** Todos los avisos sin leer pasan a leídos. */
export async function markAllRead(): Promise<NoticesState> {
  try {
    await withAccessToken((token) => notificationsGateway().markAllRead(token));
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect("/notifications");
}

/** RF-11 y RF-12: prende o apaga un tipo; los que no se apagan ni llegan aquí. */
export async function toggleNotice(_previous: NoticesState, form: FormData): Promise<NoticesState> {
  const type = String(form.get("type") ?? "");
  const enabled = form.get("enabled") === "true";
  if (!type) return { error: "validation_error" };
  try {
    await withAccessToken((token) => notificationsGateway().setEnabled(token, type, enabled));
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect("/notifications/settings?saved=1");
}
