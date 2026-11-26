import { notFound, unstable_rethrow } from "next/navigation";

import { ButtonLink } from "@/components/button";
import { GlassCard } from "@/components/glass-card";
import { Icon } from "@/components/icon";
import { Toast } from "@/components/toast";
import { setFeature, setPrice, updatePlan } from "@/features/admin/admin-actions";
import {
  PlanDetailsForm,
  PlanFeaturesForm,
  PlanPricesForm,
} from "@/features/admin/components/plan-editor";
import { adminGateway, type AdminPlan } from "@/features/admin/data/admin-gateway";
import { requireAdmin } from "@/features/admin/require-admin";
import { withAccessToken } from "@/lib/auth/session";

import { getMessages } from "@/lib/i18n/server";

/**
 * Editar un plan (MM-190): datos, precios y qué funcionalidades tiene con qué
 * límite. Cada parte se guarda sola. Solo para el administrador.
 */
export default async function AdminPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const i18n = await getMessages();
  const t = i18n.admin;
  const { code } = await params;
  const { saved } = await searchParams;

  let plan: AdminPlan | undefined;
  let failed = false;
  try {
    plan = (await withAccessToken((token) => adminGateway().plans(token))).find(
      (p) => p.code === code,
    );
  } catch (error) {
    unstable_rethrow(error);
    failed = true;
  }
  if (!failed && !plan) notFound();

  return (
    <>
      {saved && t.saved[saved] && <Toast>{t.saved[saved]}</Toast>}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted text-[13px] font-semibold">{t.title}</p>
          <h1 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
            {plan?.name ?? code}
          </h1>
          {plan && (
            <p className="text-muted mt-1 text-sm font-medium">
              {t.tier(plan.tier)} · {t.subscribers(plan.subscribers)}
            </p>
          )}
        </div>
        <ButtonLink href="/admin" variant="secondary" size="md">
          <Icon name="back" className="size-4" />
          {t.back}
        </ButtonLink>
      </header>
      {!plan ? (
        <GlassCard role="alert">
          <h2 className="text-lg font-extrabold">{t.error}</h2>
          <ButtonLink href={`/admin/plans/${code}`} size="md" className="mt-4">
            {t.retry}
          </ButtonLink>
        </GlassCard>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="flex flex-col gap-4">
            <GlassCard>
              <h2 className="mb-4 text-base font-extrabold">{t.details}</h2>
              <PlanDetailsForm plan={plan} action={updatePlan} />
            </GlassCard>
            <GlassCard>
              <h2 className="mb-4 text-base font-extrabold">{t.prices}</h2>
              <PlanPricesForm plan={plan} action={setPrice} />
            </GlassCard>
          </div>
          <GlassCard>
            <h2 className="mb-4 text-base font-extrabold">{t.features}</h2>
            <PlanFeaturesForm plan={plan} action={setFeature} />
          </GlassCard>
        </div>
      )}
    </>
  );
}
