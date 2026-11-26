"use client";

import { useState } from "react";

import { ButtonLink } from "@/components/button";

import type { ResetResult } from "../password-reset-actions";
import { NewPasswordStep } from "./new-password-step";
import { ResetCodeStep } from "./reset-code-step";
import { ResetEmailStep } from "./reset-email-step";
import { StepHeader } from "./step-header";

import { useMessages } from "@/lib/i18n/client";
export interface ResetActions {
  requestCode: (email: string) => Promise<ResetResult>;
  verifyCode: (email: string, code: string) => Promise<ResetResult>;
  confirm: (email: string, code: string, password: string) => Promise<ResetResult>;
}

type Step =
  | { name: "email" }
  | { name: "code"; email: string; error?: string }
  | { name: "password"; email: string; code: string }
  | { name: "done"; email: string };

interface ResetFlowProps {
  actions: ResetActions;
  initialEmail: string;
  demo?: boolean;
}

/** Recuperar la contraseña: correo, código, contraseña nueva y listo (spec 009). */
export function ResetFlow({ actions, initialEmail, demo = false }: ResetFlowProps) {
  const i18n = useMessages();
  const resetMessages = i18n.reset;
  const [email, setEmail] = useState(initialEmail);
  const [step, setStep] = useState<Step>({ name: "email" });

  switch (step.name) {
    case "email":
      return (
        <ResetEmailStep
          initialEmail={email}
          requestCode={actions.requestCode}
          onSent={(sentTo) => {
            setEmail(sentTo);
            setStep({ name: "code", email: sentTo });
          }}
        />
      );
    case "code":
      return (
        <ResetCodeStep
          key={step.error ?? "code"}
          email={step.email}
          initialError={step.error}
          demo={demo}
          verifyCode={actions.verifyCode}
          requestCode={actions.requestCode}
          onVerified={(code) => setStep({ name: "password", email: step.email, code })}
          onChangeEmail={() => setStep({ name: "email" })}
        />
      );
    case "password":
      return (
        <NewPasswordStep
          save={(password) => actions.confirm(step.email, step.code, password)}
          onSaved={() => setStep({ name: "done", email: step.email })}
          onCodeRejected={() =>
            setStep({ name: "code", email: step.email, error: resetMessages.code.invalid })
          }
        />
      );
    case "done":
      return (
        <div className="flex flex-col gap-3">
          <StepHeader
            icon="check"
            tone="bg-green"
            title={resetMessages.done.title}
            subtitle={resetMessages.done.body}
          />
          <ButtonLink href={`/login?email=${encodeURIComponent(step.email)}`} className="mt-2">
            {resetMessages.done.signIn}
          </ButtonLink>
        </div>
      );
  }
}
