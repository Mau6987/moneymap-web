import { AuthShell } from "@/components/auth-shell";
import { ButtonLink } from "@/components/button";
import { CompleteProfileForm } from "@/features/auth/components/complete-profile-form";
import { completeGoogleProfile } from "@/features/auth/google-actions";
import { socialRegistration } from "@/lib/auth/session";

import { getMessages } from "@/lib/i18n/server";
/**
 * "Completa tu perfil" después de entrar con Google por primera vez (spec
 * 008, RF-10). Sin un token de registro vigente, se vuelve a entrar.
 */
export default async function CompleteProfilePage() {
  const i18n = await getMessages();
  const hero = i18n.register.hero;
  const t = i18n.auth.completeProfile;
  const registration = await socialRegistration();

  return (
    <AuthShell
      title={
        <>
          {hero.titleLine1}
          <br />
          {hero.titleLine2}
        </>
      }
      subtitle={hero.subtitle}
    >
      {registration ? (
        <CompleteProfileForm
          action={completeGoogleProfile}
          email={registration.email}
          firstName={registration.firstName}
          lastName={registration.lastName}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <h2 className="text-[28px] font-extrabold tracking-[-0.02em]">{t.title}</h2>
          <p role="alert" className="text-muted text-sm font-medium">
            {t.expired}
          </p>
          <ButtonLink href="/login">{t.backToLogin}</ButtonLink>
        </div>
      )}
    </AuthShell>
  );
}
