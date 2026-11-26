import { unstable_rethrow } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { currentProfile } from "@/features/auth/profile";
import { settingsGateway } from "@/features/settings/data/settings-gateway";
import { accentOf, accentStyle } from "@/features/settings/domain/accents";
import { withAccessToken } from "@/lib/auth/session";

function initialsOf(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [profile, preferences] = await Promise.all([
    currentProfile(),
    // Si no carga, queda el color de la marca.
    withAccessToken((token) => settingsGateway().preferences(token)).catch((error: unknown) => {
      unstable_rethrow(error);
      return null;
    }),
  ]);
  const accent = accentStyle(accentOf(preferences?.accent_color));

  return (
    <>
      {/* Como la app: el color de acento elegido en Ajustes. */}
      {accent && <style>{accent}</style>}
      <AppShell
        user={{
          initials: initialsOf(profile.first_name, profile.last_name),
          name: profile.display_name,
          detail: profile.email,
        }}
        isAdmin={profile.is_admin === true}
      >
        {children}
      </AppShell>
    </>
  );
}
