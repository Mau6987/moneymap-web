import { unstable_rethrow } from "next/navigation";

import { ButtonLink } from "@/components/button";
import { GlassCard, Pill } from "@/components/glass-card";
import { changeSummary } from "@/features/admin/components/change-summary";
import { adminGateway } from "@/features/admin/data/admin-gateway";
import { requireAdmin } from "@/features/admin/require-admin";
import { withAccessToken } from "@/lib/auth/session";
import { shortDate } from "@/lib/dates";
import { formatNumber } from "@/lib/money/money";

import { getMessages } from "@/lib/i18n/server";

/**
 * Panel de planes (MM-190, spec 013 del back): los cuatro planes con sus
 * usuarios, precios y si se muestran, y el historial de cambios. Solo el
 * administrador lo ve; para el resto la ruta no existe.
 */
export default async function AdminPage() {
  await requireAdmin();
  const i18n = await getMessages();
  const t = i18n.admin;
  let data: Awaited<ReturnType<typeof load>> | null = null;
  try {
    data = await load();
  } catch (error) {
    unstable_rethrow(error);
  }

  return (
    <>
      <header>
        <p className="text-muted text-[13px] font-semibold">{t.eyebrow}</p>
        <h1 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
          {t.title}
        </h1>
        <p className="text-muted mt-1 text-sm font-medium">{t.subtitle}</p>
      </header>
      {!data ? (
        <GlassCard role="alert">
          <h2 className="text-lg font-extrabold">{t.error}</h2>
          <ButtonLink href="/admin" size="md" className="mt-4">
            {t.retry}
          </ButtonLink>
        </GlassCard>
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.plans.map((plan) => (
              <li key={plan.code}>
                <GlassCard
                  className="flex h-full flex-col gap-3"
                  data-testid={`admin-plan-${plan.code}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-extrabold">{plan.name}</h2>
                      <p className="text-muted text-xs font-semibold">{t.tier(plan.tier)}</p>
                    </div>
                    <Pill tone={plan.is_public ? "green" : "amber"}>
                      {plan.is_public ? t.visible : t.hidden}
                    </Pill>
                  </div>
                  <p className="text-sm font-bold">{t.subscribers(plan.subscribers)}</p>
                  <ul className="text-muted flex flex-col gap-0.5 text-sm font-semibold">
                    {plan.prices.length === 0 ? (
                      <li>{t.noPrice}</li>
                    ) : (
                      plan.prices.map((p) => (
                        <li key={`${p.currency}-${p.period}`} className="tabular-nums">
                          {p.currency} {formatNumber(p.amount, 2)}{" "}
                          {p.period === "month" ? t.perMonth : t.perYear}
                        </li>
                      ))
                    )}
                  </ul>
                  <ButtonLink
                    href={`/admin/plans/${plan.code}`}
                    size="md"
                    variant="secondary"
                    className="mt-auto"
                  >
                    {t.edit}
                  </ButtonLink>
                </GlassCard>
              </li>
            ))}
          </ul>
          <GlassCard>
            <h2 className="text-base font-extrabold">{t.history}</h2>
            {data.changes.length === 0 ? (
              <p className="text-muted mt-3 text-sm">{t.noHistory}</p>
            ) : (
              <table className="mt-3 w-full text-left text-sm">
                <thead className="text-muted text-xs font-bold">
                  <tr>
                    <th className="py-2 pr-3">{t.when}</th>
                    <th className="py-2 pr-3">{t.what}</th>
                    <th className="py-2">{t.change}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.changes.map((c, i) => (
                    <tr key={`${c.occurred_at}-${i}`} className="border-line border-t align-top">
                      <td className="py-2 pr-3 whitespace-nowrap tabular-nums">
                        {shortDate(c.occurred_at.slice(0, 10), i18n.locale)}
                      </td>
                      <td className="py-2 pr-3 font-semibold">
                        {t.entities[c.entity] ?? c.entity} · {t.actions[c.action] ?? c.action}
                      </td>
                      <td className="text-ink-2 py-2">{changeSummary(c, t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </GlassCard>
        </>
      )}
    </>
  );
}

async function load() {
  return withAccessToken(async (token) => {
    const gateway = adminGateway();
    const [plans, changes] = await Promise.all([gateway.plans(token), gateway.changes(token, 20)]);
    return { plans, changes };
  });
}
