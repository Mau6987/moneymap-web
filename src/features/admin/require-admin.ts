import { notFound } from "next/navigation";

import { currentProfile } from "@/features/auth/profile";

/**
 * MM-190: el panel solo existe para el administrador (mismo login). Para
 * cualquier otro, 404, igual que la API: no se revela que hay un panel.
 */
export async function requireAdmin(): Promise<void> {
  const profile = await currentProfile();
  if (profile.is_admin !== true) notFound();
}
