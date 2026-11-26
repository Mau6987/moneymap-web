import { AuthShell } from "@/components/auth-shell";
import { ResetFlow } from "@/features/auth/components/reset-flow";
import {
  confirmPasswordReset,
  requestResetCode,
  verifyResetCode,
} from "@/features/auth/password-reset-actions";
import { isDemo } from "@/lib/demo";

import { getMessages } from "@/lib/i18n/server";
interface ForgotPasswordPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const i18n = await getMessages();
  const hero = i18n.register.hero;
  const { email } = await searchParams;

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
      <ResetFlow
        initialEmail={email ?? ""}
        demo={isDemo()}
        actions={{
          requestCode: requestResetCode,
          verifyCode: verifyResetCode,
          confirm: confirmPasswordReset,
        }}
      />
    </AuthShell>
  );
}
