import { GlassCard } from "@/components/glass-card";
import { PlanLimitCard } from "@/features/billing/components/plan-limit-card";
import { reachedLimit } from "@/features/billing/plan-limits";
import { GoalForm } from "@/features/goals/components/goal-forms";
import { createGoal } from "@/features/goals/goals-actions";
import { goalCurrencies, loadGoals } from "@/features/goals/goals-data";

import { getMessages } from "@/lib/i18n/server";
/** "Nueva meta" (spec 005, RF-1; mockup "Web-Nueva-Meta"). */
export default async function NewGoalPage() {
  const i18n = await getMessages();
  const t = i18n.goals;
  const [{ catalog }, limit] = await Promise.all([loadGoals(), reachedLimit("goals.active")]);
  return (
    <>
      <header>
        <h1 className="text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">{t.new}</h1>
      </header>
      <GlassCard className="max-w-xl">
        {/* MM-188: al tope de metas del plan, el camino a Planes. */}
        {limit ? (
          <PlanLimitCard limit={limit} />
        ) : (
          <GoalForm action={createGoal} currencies={goalCurrencies(catalog)} />
        )}
      </GlassCard>
    </>
  );
}
