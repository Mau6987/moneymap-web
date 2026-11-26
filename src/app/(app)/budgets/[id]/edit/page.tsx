import { GlassCard } from "@/components/glass-card";
import { updateBudget } from "@/features/budgets/budgets-actions";
import { loadBudgets } from "@/features/budgets/budgets-data";
import { BudgetForm } from "@/features/budgets/components/budget-form";

import { formatNumber } from "@/lib/money/money";

import { getMessages } from "@/lib/i18n/server";
/** Editar un presupuesto (spec 009 del back, RF-2 y RF-10): el límite y los avisos. */
export default async function EditBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const i18n = await getMessages();
  const t = i18n.budgets;
  const { id } = await params;
  const { budgets, catalog } = await loadBudgets();
  const budget = budgets.find((b) => b.id === id);

  return (
    <>
      <header>
        <h1 className="text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
          {budget ? `${t.edit} · ${budget.category_name}` : t.edit}
        </h1>
      </header>
      <GlassCard className="max-w-xl">
        {!budget ? (
          <p className="text-muted text-sm">{t.notFound}</p>
        ) : (
          <BudgetForm
            action={updateBudget}
            currencies={[
              {
                code: budget.currency,
                name: catalog.get(budget.currency)?.name ?? budget.currency,
                label: catalog.labelOf(budget.currency),
                decimals: catalog.decimalsOf(budget.currency),
              },
            ]}
            freeByCurrency={{}}
            initial={{
              id: budget.id,
              name: budget.category_name,
              amount: formatNumber(budget.amount, catalog.decimalsOf(budget.currency)),
              alert80: budget.alert_at_80,
              alert100: budget.alert_at_100,
            }}
          />
        )}
      </GlassCard>
    </>
  );
}
