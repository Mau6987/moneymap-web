import { GlassCard } from "@/components/glass-card";
import { GoalForm } from "@/features/goals/components/goal-forms";
import { nearestPriority } from "@/features/goals/domain/goal";
import { updateGoal } from "@/features/goals/goals-actions";
import { loadGoals } from "@/features/goals/goals-data";

import { formatNumber } from "@/lib/money/money";

import { getMessages } from "@/lib/i18n/server";
/** Editar una meta (spec 005, RF-4): la moneda no cambia. */
export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const i18n = await getMessages();
  const t = i18n.goals;
  const { id } = await params;
  const { goals, catalog } = await loadGoals();
  const goal = goals.find((g) => g.id === id);

  return (
    <>
      <header>
        <h1 className="text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">{t.edit}</h1>
      </header>
      <GlassCard className="max-w-xl">
        {!goal ? (
          <p className="text-muted text-sm">{t.notFound}</p>
        ) : (
          <GoalForm
            action={updateGoal}
            currencies={[
              {
                code: goal.currency,
                name: catalog.get(goal.currency)?.name ?? goal.currency,
                label: catalog.labelOf(goal.currency),
                decimals: catalog.decimalsOf(goal.currency),
              },
            ]}
            initial={{
              id: goal.id,
              name: goal.name,
              target: formatNumber(goal.target_amount, catalog.decimalsOf(goal.currency)),
              date: goal.target_date ?? "",
              priority: nearestPriority(goal.priority),
            }}
          />
        )}
      </GlassCard>
    </>
  );
}
