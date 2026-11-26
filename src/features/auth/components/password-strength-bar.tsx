"use client";

import { cx } from "@/lib/cx";

import { passwordStrength } from "../domain/register-validation";
import { useMessages } from "@/lib/i18n/client";
const segmentTone = ["", "bg-coral", "bg-amber", "bg-green", "bg-green"];

/** La fuerza de la contraseña en cuatro segmentos, con su texto (spec 001, RF-2f). */
export function PasswordStrengthBar({ password }: { password: string }) {
  const i18n = useMessages();
  const t = i18n.register.data;
  const level = passwordStrength(password);
  if (level === 0) return null;
  const label = t.strength[level] ?? "";
  return (
    <div className="flex flex-col gap-1">
      <div
        className="grid grid-cols-4 gap-1.5"
        role="img"
        aria-label={t.strengthLabel(label, level)}
      >
        {[1, 2, 3, 4].map((segment) => (
          <div
            key={segment}
            className={cx(
              "h-[5px] rounded-full",
              segment <= level ? segmentTone[level] : "bg-well",
            )}
          />
        ))}
      </div>
      <span className="text-muted text-xs font-bold">{label}</span>
    </div>
  );
}
