"use client";

import { useState } from "react";

import { TextField } from "@/components/text-field";
import { cx } from "@/lib/cx";

import type { Institution } from "../data/onboarding-gateway";

import { useMessages } from "@/lib/i18n/client";
const chip = (on: boolean) =>
  cx(
    "focus-ring inline-flex h-10 items-center rounded-full px-4 text-sm font-bold",
    on
      ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
      : "bg-well text-ink-2",
  );

/**
 * "¿Dónde tienes tu dinero?" (RF-3 y RF-4): el efectivo y, si la tiene, una
 * tarjeta del catálogo del país o con otro nombre. El plan gratuito ofrece
 * una sola tarjeta.
 */
export function AccountFields({
  currency,
  countryName,
  institutions,
}: {
  currency: string;
  countryName: string;
  institutions: Institution[];
}) {
  const i18n = useMessages();
  const t = i18n.onboarding.accounts;
  const [hasCard, setHasCard] = useState(false);
  const [institution, setInstitution] = useState(institutions[0]?.code ?? "");
  const [custom, setCustom] = useState("");
  const isCustom = institution === "" || institutions.length === 0;
  const bankName = isCustom
    ? custom.trim()
    : (institutions.find((i) => i.code === institution)?.short_name ?? "");

  return (
    <div className="flex flex-col gap-5">
      <TextField
        label={t.cashAmount}
        name="cash"
        inputMode="decimal"
        placeholder="0"
        hint={<span className="text-muted">{t.cashHint(currency)}</span>}
      />
      <label className="flex items-center gap-3 text-[15px] font-bold">
        <input
          type="checkbox"
          checked={hasCard}
          onChange={(e) => setHasCard(e.target.checked)}
          className="accent-primary size-5"
        />
        {t.hasCard}
      </label>
      <input type="hidden" name="has_card" value={String(hasCard)} />
      {hasCard && (
        <fieldset className="flex flex-col gap-4 rounded-[22px] border border-[var(--mm-line)] p-4">
          <legend className="px-1 text-sm font-extrabold">
            {t.card} <span className="text-muted text-xs font-semibold">· {t.freePlan}</span>
          </legend>
          <input type="hidden" name="institution" value={isCustom ? "" : institution} />
          <input type="hidden" name="bank_name" value={bankName} />
          {institutions.length > 0 ? (
            <div role="radiogroup" aria-label={t.bank} className="flex flex-wrap gap-2">
              {institutions.map((i) => (
                <button
                  key={i.code}
                  type="button"
                  role="radio"
                  aria-checked={institution === i.code}
                  onClick={() => setInstitution(i.code)}
                  className={chip(institution === i.code)}
                >
                  {i.short_name}
                </button>
              ))}
              <button
                type="button"
                role="radio"
                aria-checked={isCustom}
                onClick={() => setInstitution("")}
                className={chip(isCustom)}
              >
                {t.custom}
              </button>
            </div>
          ) : (
            <p className="text-muted text-sm">{t.noCatalog(countryName)}</p>
          )}
          {isCustom && (
            <TextField
              label={t.customName}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              maxLength={40}
              required
            />
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label={t.last4}
              name="last4"
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              autoComplete="off"
              required
            />
            <TextField
              label={t.cardAmount}
              name="card"
              inputMode="decimal"
              placeholder="0"
              required
            />
          </div>
        </fieldset>
      )}
    </div>
  );
}
