"use client";

import { ButtonLink } from "@/components/button";
import { Icon } from "@/components/icon";

import { featureLabel } from "../domain/plans";
import type { PlanLimit } from "../plan-limits";

import { useMessages } from "@/lib/i18n/client";

/**
 * "Llegaste al límite de tu plan" (MM-188): la funcionalidad, cuánto lleva y
 * el camino a Planes, en lugar de un formulario que la API rechazaría.
 */
export function PlanLimitCard({ limit }: { limit: PlanLimit }) {
  const t = useMessages().plans;
  return (
    <div
      data-testid={`plan-limit-${limit.key}`}
      className="bg-primary-soft flex flex-col items-center gap-3 rounded-[22px] px-5 py-6 text-center"
    >
      <span
        aria-hidden="true"
        className="text-primary-text grid size-12 place-items-center rounded-[16px] bg-[var(--mm-glass)]"
      >
        <Icon name="lock" className="size-5" />
      </span>
      <div>
        <h2 className="text-base font-extrabold">{t.limitTitle}</h2>
        <p className="text-muted mt-1 text-sm font-semibold">
          {t.limitBody(
            featureLabel(limit.key, limit.description, t.features),
            limit.used,
            limit.limit,
          )}
        </p>
      </div>
      <ButtonLink href="/plans" size="md">
        {t.seePlans}
      </ButtonLink>
    </div>
  );
}
