/** Guarda la cookie del tema. Solo desde server actions y route handlers. */
import { cookies } from "next/headers";

import { secureCookies } from "@/lib/auth/tokens";

import { themeCookie, type Theme } from "./theme";

export async function saveTheme(theme: Theme): Promise<void> {
  const { name, value, options } = themeCookie(theme, secureCookies());
  (await cookies()).set(name, value, options);
}
