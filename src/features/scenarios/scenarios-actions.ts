"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { errorCode } from "@/lib/api/errors";
import { withAccessToken } from "@/lib/auth/session";
import { parseAmount } from "@/lib/money/parse";

import {
  scenariosGateway,
  type Affordability,
  type BaseQuery,
  type PeriodType,
  type WhatIfBase,
} from "./data/scenarios-gateway";

export interface AffordState {
  result?: Affordability;
  error?: string;
}

export interface WhatIfBaseState {
  base?: WhatIfBase;
  error?: string;
}

/** Spec 005, RF-10: con un precio, en la moneda elegida, sin guardar nada. */
export async function checkAffordability(
  _previous: AffordState,
  form: FormData,
): Promise<AffordState> {
  const currency = String(form.get("currency") ?? "");
  const decimals = Number(form.get("decimals") ?? 2);
  const category = String(form.get("category") ?? "");
  const amount = parseAmount(String(form.get("amount") ?? ""), { decimals });
  if (!amount) return { error: "invalid_amount" };
  if (!currency) return { error: "validation_error" };

  try {
    const result = await withAccessToken((token) =>
      scenariosGateway().afford(token, { amount, currency, category_id: category || null }),
    );
    // MM-188: una consulta menos en el mes; la página vuelve a leer el plan.
    revalidatePath("/scenarios");
    return { result };
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
}

const PERIOD_TYPES: readonly PeriodType[] = ["weekly", "semi_monthly", "monthly"];

/**
 * La base del simulador de What If? (spec 009 del back, RF-20 a RF-23) de un
 * periodo, una moneda y, si se elige, una cuenta. Sirve al cambiar el periodo,
 * la moneda o la cuenta, y para refrescarla cuando se suelta un slider.
 */
export async function loadWhatIfBase(query: BaseQuery): Promise<WhatIfBaseState> {
  if (!query.currency || !PERIOD_TYPES.includes(query.period_type)) {
    return { error: "validation_error" };
  }
  try {
    const base = await withAccessToken((token) => scenariosGateway().baseline(token, query));
    return { base };
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
}
