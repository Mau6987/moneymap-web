"use client";

import { useActionState } from "react";

import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { TextField } from "@/components/text-field";

import type { Profile } from "../data/settings-gateway";
import type { SettingsFormState } from "../settings-actions";
import { FormError } from "./form-error";

import { useMessages } from "@/lib/i18n/client";
type Action = (state: SettingsFormState, form: FormData) => Promise<SettingsFormState>;

/**
 * RF-11: los datos personales; el correo se muestra y no se edita. Vienen
 * plegados (MM-180): casi no cambian y abiertos llenaban media pantalla.
 */
export function ProfileForm({ profile, action }: { profile: Profile; action: Action }) {
  const i18n = useMessages();
  const t = i18n.settings.profile;
  const settingsMessages = i18n.settings;
  const [state, submit, pending] = useActionState(action, {});
  // Si `display_name` es el nombre, el campo queda vacío: "vacío, usamos tu nombre".
  const customName = profile.display_name !== profile.first_name ? profile.display_name : "";

  return (
    <details className="group" data-testid="profile-details">
      <summary className="focus-ring flex cursor-pointer list-none items-center gap-3 rounded-2xl [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <h2 className="text-[15px] font-extrabold">{t.title}</h2>
          <span className="text-muted block truncate text-xs font-semibold">
            {profile.first_name} {profile.last_name} · {profile.email}
          </span>
        </span>
        <Icon
          name="chevron"
          className="text-primary-text size-5 shrink-0 transition-transform group-open:rotate-90"
        />
      </summary>
      <form action={submit} className="mt-4 flex flex-col gap-4" noValidate>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label={t.firstName}
            name="first_name"
            defaultValue={profile.first_name}
            autoComplete="given-name"
            maxLength={80}
            required
          />
          <TextField
            label={t.lastName}
            name="last_name"
            defaultValue={profile.last_name}
            autoComplete="family-name"
            maxLength={80}
            required
          />
          <TextField
            label={t.displayName}
            name="display_name"
            defaultValue={customName}
            hint={<span className="text-muted">{t.displayNameHint}</span>}
            maxLength={80}
          />
          <TextField
            label={t.email}
            value={profile.email}
            readOnly
            hint={<span className="text-muted">{t.emailHint}</span>}
          />
          <TextField
            label={t.city}
            name="city"
            defaultValue={profile.city ?? ""}
            autoComplete="address-level2"
            maxLength={80}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-occupation" className="text-muted text-xs font-semibold">
              {t.occupation}
            </label>
            <select
              id="profile-occupation"
              name="occupation"
              defaultValue={profile.occupation ?? ""}
              className="bg-field border-line text-ink focus-ring h-[52px] rounded-2xl border-[1.5px] px-4 text-[15px] font-semibold"
            >
              <option value="">{t.noOccupation}</option>
              {Object.entries(t.occupations).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <FormError code={state.error} />
        <div>
          <Button type="submit" size="md" disabled={pending}>
            {pending ? settingsMessages.saving : t.save}
          </Button>
        </div>
      </form>
    </details>
  );
}
