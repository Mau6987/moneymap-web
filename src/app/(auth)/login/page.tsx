import { AuthShell } from "@/components/auth-shell";
import type { IconName } from "@/components/icon";
import { GoogleButton } from "@/features/auth/components/google-button";
import { LoginForm } from "@/features/auth/components/login-form";
import { signInWithGoogle } from "@/features/auth/google-actions";
import { login } from "@/features/auth/login-action";
import { isDemo } from "@/lib/demo";

import { getMessages } from "@/lib/i18n/server";
const pointIcons: readonly IconName[] = ["compass", "mic", "scenarios"];

interface LoginPageProps {
  searchParams: Promise<{ email?: string; reason?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const i18n = await getMessages();
  const hero = i18n.auth.hero;
  const { email, reason } = await searchParams;

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
      points={hero.points.map((text, index) => ({ text, icon: pointIcons[index] ?? "goals" }))}
    >
      <LoginForm
        action={login}
        initialEmail={email ?? ""}
        expired={reason === "expired"}
        social={
          <GoogleButton
            action={signInWithGoogle}
            clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || undefined}
            demo={isDemo()}
          />
        }
      />
    </AuthShell>
  );
}
