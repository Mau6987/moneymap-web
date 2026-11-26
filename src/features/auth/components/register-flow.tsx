"use client";

import { useState } from "react";

import { registerErrorText } from "@/lib/i18n/register-messages";

import type { AccountInput } from "../account-actions";
import type { LinkResult, LinkState } from "../verification-actions";
import { DataStep } from "./data-step";
import { EmailStep } from "./email-step";
import { VerifyStep } from "./verify-step";

import { useMessages } from "@/lib/i18n/client";
export interface RegisterActions {
  requestLink: (email: string) => Promise<LinkResult>;
  resendLink: () => Promise<LinkResult>;
  checkLink: () => Promise<LinkResult>;
  createAccount: (input: AccountInput) => Promise<{ error: string }>;
}

type Step =
  | { name: "email"; email: string; error?: string; taken?: boolean }
  | { name: "verify"; link: LinkState }
  | { name: "data"; link: LinkState };

/** El registro con correo en tres pasos: correo, verificación y "Tus datos" (spec 001). */
export function RegisterFlow({ actions }: { actions: RegisterActions }) {
  const i18n = useMessages();
  const [step, setStep] = useState<Step>({ name: "email", email: "" });

  switch (step.name) {
    case "email":
      return (
        <EmailStep
          key={`${step.email}-${step.error ?? ""}-${step.taken ? "taken" : ""}`}
          initialEmail={step.email}
          initialError={step.error}
          initialTaken={step.taken}
          requestLink={actions.requestLink}
          onSent={(link) => setStep({ name: "verify", link })}
        />
      );
    case "verify":
      return (
        <VerifyStep
          link={step.link}
          resendLink={actions.resendLink}
          checkLink={actions.checkLink}
          onVerified={() => setStep({ name: "data", link: step.link })}
          onChangeEmail={(error) => setStep({ name: "email", email: step.link.email, error })}
        />
      );
    case "data":
      return (
        <DataStep
          email={step.link.email}
          createAccount={actions.createAccount}
          onVerificationLost={(code) =>
            code === "verification_expired"
              ? setStep({ name: "verify", link: { ...step.link, status: "expired" } })
              : setStep({
                  name: "email",
                  email: step.link.email,
                  taken: code === "email_taken",
                  error: code === "email_taken" ? undefined : registerErrorText(code, i18n.locale),
                })
          }
        />
      );
  }
}
