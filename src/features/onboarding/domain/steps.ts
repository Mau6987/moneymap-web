import type { OnboardingStatus } from "../data/onboarding-gateway";

/** Los pasos del mockup "Web-Onboarding", en orden. */
export const STEPS = [
  "country",
  "currency",
  "accounts",
  "period",
  "income",
  "expenses",
  "ready",
] as const;

export type Step = (typeof STEPS)[number];

export function stepNumber(step: Step): number {
  return STEPS.indexOf(step) + 1;
}

export function parseStep(value: unknown): Step | undefined {
  return STEPS.find((s) => s === value);
}

/**
 * RF-10: dónde retomar, según lo que la API tiene guardado. El periodo no
 * figura en el estado: si no hay reglas todavía, se vuelve a preguntar.
 */
export function resumeStep(status: OnboardingStatus): Step {
  if (!status.main_currency) return "country";
  if (status.accounts === 0) return "accounts";
  if (status.income_rules === 0 && status.expense_rules === 0) return "period";
  if (status.expense_rules === 0) return "expenses";
  return "ready";
}

/**
 * Se puede volver a cualquier paso anterior, pero no saltar adelante de lo
 * guardado. País y moneda van juntos: el país solo sugiere la moneda. Con
 * una cuenta ya se llega hasta el final: el periodo no figura en el estado y
 * el ingreso y los gastos son opcionales (RF-9).
 */
export function canOpen(step: Step, status: OnboardingStatus): boolean {
  if (status.accounts > 0) return true;
  const resume = resumeStep(status);
  const reach = Math.max(STEPS.indexOf(resume), STEPS.indexOf("currency"));
  return step !== "ready" && STEPS.indexOf(step) <= reach;
}

/** Los gastos fijos de ejemplo (RF-6), con la plantilla de su categoría. */
export const EXAMPLE_EXPENSES = ["housing", "utilities", "transport"] as const;

/** Las categorías de ingreso que se ofrecen (RF-15). */
/** Los orígenes del ingreso; "Otro ingreso" usa la categoría de otros ingresos (BUG-020). */
export const INCOME_KINDS = ["salary", "freelance", "family_support", "other_income"] as const;
