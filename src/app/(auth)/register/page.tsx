import { AuthShell } from "@/components/auth-shell";
import { RegisterFlow } from "@/features/auth/components/register-flow";
import { createAccount } from "@/features/auth/account-actions";
import { checkLink, requestLink, resendLink } from "@/features/auth/verification-actions";

import { useServerMessages } from "@/lib/i18n/server";
export default function RegisterPage() {
  const i18n = useServerMessages();
  const hero = i18n.register.hero;
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
      <RegisterFlow actions={{ requestLink, resendLink, checkLink, createAccount }} />
    </AuthShell>
  );
}
