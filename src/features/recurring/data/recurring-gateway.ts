import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { ApiError, unwrap } from "@/lib/api/errors";
import type { components } from "@/lib/api/generated/schema";
import { isDemo } from "@/lib/demo";

type Schemas = components["schemas"];
export type RecurringRule = Schemas["RecurringRuleRead"];
export type Frequency = NonNullable<Schemas["RecurringRuleCreate"]["frequency"]>;

export interface RuleDraft {
  /** BUG-027: el fijo va en una moneda; la cuenta se elige al pagarlo. */
  currency: string;
  category_id: string;
  amount: string;
  description: string;
  frequency: Frequency;
  start_date?: string;
}

export interface Receipt {
  bytes: ArrayBuffer;
  type: string;
}

/**
 * Ingresos y gastos fijos (spec 002 del back, RF-29 a RF-31; spec 003, RF-17
 * y RF-20). Lanza `ApiError` con el `code`.
 */
export interface RecurringGateway {
  rules(token: string): Promise<RecurringRule[]>;
  create(token: string, draft: RuleDraft): Promise<RecurringRule>;
  update(
    token: string,
    id: string,
    draft: Omit<RuleDraft, "start_date" | "currency">,
  ): Promise<RecurringRule>;
  remove(token: string, id: string): Promise<void>;
  /**
   * Lo registra hoy con su monto y pasa al siguiente vencimiento. Con
   * `accountId`, con esa cuenta de su moneda; sin ella, la del fijo (BUG-027).
   */
  pay(token: string, id: string, idempotencyKey: string, accountId?: string): Promise<void>;
  /** Ya se pagó por fuera: pasa al siguiente vencimiento sin registrar nada (spec 003, RF-22). */
  skip(token: string, id: string): Promise<void>;
  receipt(token: string, id: string): Promise<Receipt>;
  attachReceipt(token: string, id: string, photo: Blob): Promise<void>;
  removeReceipt(token: string, id: string): Promise<void>;
}

const api = (accessToken: string) => createApiClient({ baseUrl: apiBaseUrl(), accessToken });

export const apiRecurringGateway: RecurringGateway = {
  rules: (token) => unwrap(api(token).GET("/v1/recurring-rules")),
  create: (token, draft) =>
    unwrap(api(token).POST("/v1/recurring-rules", { body: { ...draft, auto_post: false } })),
  update: (token, id, draft) =>
    unwrap(
      api(token).PATCH("/v1/recurring-rules/{rule_id}", {
        params: { path: { rule_id: id } },
        body: draft,
      }),
    ),
  remove: async (token, id) => {
    await unwrap(
      api(token).DELETE("/v1/recurring-rules/{rule_id}", { params: { path: { rule_id: id } } }),
    );
  },
  pay: async (token, id, idempotencyKey, accountId) => {
    await unwrap(
      api(token).POST("/v1/recurring-rules/{rule_id}/payments", {
        params: { path: { rule_id: id }, header: { "Idempotency-Key": idempotencyKey } },
        body: accountId ? { account_id: accountId } : {},
      }),
    );
  },
  skip: async (token, id) => {
    await unwrap(
      api(token).POST("/v1/recurring-rules/{rule_id}/skip", { params: { path: { rule_id: id } } }),
    );
  },
  receipt: async (token, id) => {
    const call = api(token).GET("/v1/recurring-rules/{rule_id}/receipt" as any, {
      params: { path: { rule_id: id } } as any,
      parseAs: "arrayBuffer",
    });
    const bytes = (await unwrap(call)) as unknown as ArrayBuffer;
    return { bytes, type: (await call).response.headers.get("content-type") ?? "image/jpeg" };
  },
  attachReceipt: async (token, id, photo) => {
    await unwrap(
      api(token).PUT("/v1/recurring-rules/{rule_id}/receipt" as any, {
        params: { path: { rule_id: id } } as any,
        body: photo as unknown as string,
        bodySerializer: (body) => body as unknown as BodyInit,
        headers: { "Content-Type": photo.type || "application/octet-stream" },
      }),
    );
  },
  removeReceipt: async (token, id) => {
    await unwrap(
      api(token).DELETE("/v1/recurring-rules/{rule_id}/receipt" as any, {
        params: { path: { rule_id: id } } as any,
      }),
    );
  },
};

const inDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const CURRENCY: Record<string, string> = { "demo-usd": "USD" };
const TYPE: Record<string, "income" | "expense"> = { "c-salary": "income" };

/** El sueldo y dos gastos fijos de Ana (el alquiler, vencido); vive mientras corre el servidor demo. */
const demoRules: RecurringRule[] = [
  ["r-salary", "demo-bnb", "c-salary", "12000.00", "Sueldo", 6],
  ["r-rent", "demo-bnb", "c-subs", "700.00", "Alquiler", -2],
  ["r-netflix", "demo-usd", "c-subs", "15.00", "Netflix", 3],
].map(([id, account, category, amount, description, due]) => ({
  id: id as string,
  account_id: account as string,
  category_id: category as string,
  type: TYPE[category as string] ?? "expense",
  amount: amount as string,
  currency: CURRENCY[account as string] ?? "BOB",
  description: description as string,
  frequency: "monthly",
  next_due_on: inDays(due as number),
  auto_post: false,
  // El alquiler sin pagar debe también el de este mes (spec 003 del back, RF-23).
  pending_dates: id === "r-rent" ? [inDays(-2), inDays(28)] : [inDays(due as number)],
}));

/** Pasa al siguiente vencimiento, como el back. */
const advance = (rule: RecurringRule) => {
  const later = rule.pending_dates.slice(1);
  rule.next_due_on = later[0] ?? inDays(30);
  rule.pending_dates = later.length ? later : [rule.next_due_on];
};

const demoReceipts = new Map<string, ArrayBuffer>();

export const demoRecurringGateway: RecurringGateway = {
  rules: async () => demoRules,
  create: async (_, draft) => {
    const rule: RecurringRule = {
      id: `r-${demoRules.length + 1}`,
      ...draft,
      type: TYPE[draft.category_id] ?? "expense",
      account_id: null,
      next_due_on: draft.start_date ?? inDays(30),
      auto_post: false,
      pending_dates: [draft.start_date ?? inDays(30)],
    };
    demoRules.push(rule);
    return rule;
  },
  update: async (_, id, draft) => {
    const rule = demoRules.find((r) => r.id === id);
    if (!rule) throw new ApiError("not_found", 404);
    Object.assign(rule, draft);
    return rule;
  },
  remove: async (_, id) => {
    const i = demoRules.findIndex((r) => r.id === id);
    if (i < 0) throw new ApiError("not_found", 404);
    demoRules.splice(i, 1);
  },
  pay: async (_, id) => {
    const rule = demoRules.find((r) => r.id === id);
    if (!rule) throw new ApiError("not_found", 404);
    advance(rule);
  },
  skip: async (_, id) => {
    const rule = demoRules.find((r) => r.id === id);
    if (!rule) throw new ApiError("not_found", 404);
    advance(rule);
  },
  receipt: async (_, id) => {
    const bytes = demoReceipts.get(id);
    if (!bytes) throw new ApiError("not_found", 404);
    return { bytes, type: "image/jpeg" };
  },
  attachReceipt: async (_, id, photo) => {
    const rule = demoRules.find((r) => r.id === id);
    if (!rule) throw new ApiError("not_found", 404);
    (rule as any).has_receipt = true;
    demoReceipts.set(id, await photo.arrayBuffer());
  },
  removeReceipt: async (_, id) => {
    const rule = demoRules.find((r) => r.id === id);
    if (!rule) throw new ApiError("not_found", 404);
    (rule as any).has_receipt = false;
    demoReceipts.delete(id);
  },
};

export function recurringGateway(): RecurringGateway {
  return isDemo() ? demoRecurringGateway : apiRecurringGateway;
}
