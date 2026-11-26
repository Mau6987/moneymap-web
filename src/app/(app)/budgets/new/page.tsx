import { GlassCard } from "@/components/glass-card";
import { PlanLimitCard } from "@/features/billing/components/plan-limit-card";
import { reachedLimit } from "@/features/billing/plan-limits";
import { createBudget } from "@/features/budgets/budgets-actions";
import { byRecentUse, freeByCurrency, loadBudgets } from "@/features/budgets/budgets-data";
import { BudgetForm } from "@/features/budgets/components/budget-form";

import { getMessages } from "@/lib/i18n/server";
/** "Nuevo presupuesto" (spec 009 del back, RF-1; mockup "Web-Nuevo-Presupuesto"). */
export default async function NewBudgetPage() {
  const i18n = await getMessages();
  const t = i18n.budgets;
  const [{ budgets, categories, catalog }, limit] = await Promise.all([
    loadBudgets(),
    reachedLimit("planning.budgets"),
  ]);
  const currencies = catalog.mine.map((c) => ({
    code: c.code,
    name: c.name,
    label: catalog.labelOf(c.code),
    decimals: c.decimals,
  }));
  return (
    <>
      <header>
        <h1 className="text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">{t.new}</h1>
      </header>
      <GlassCard className="max-w-xl">
        {/* MM-188: al tope de presupuestos del plan, el camino a Planes. */}
        {limit ? (
          <PlanLimitCard limit={limit} />
        ) : (
          <BudgetForm
            action={createBudget}
            currencies={currencies}
            freeByCurrency={freeByCurrency(
              await byRecentUse(categories),
              budgets,
              currencies.map((c) => c.code),
            )}
          />
        )}
      </GlassCard>
    </>
  );
}
