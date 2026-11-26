import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/errors";
import { isDemo } from "@/lib/demo";

/** Lo que Quick Add manda. La moneda no va: es la de la cuenta (spec 002, RF-4). */
export interface NewTransaction {
  kind: "expense" | "income";
  account_id: string;
  category_id: string;
  amount: string;
  occurred_on: string;
  description: string;
  /** Desde dónde se registró: Quick Add, o un dictado corregido o confirmado. */
  source?: "quick_add" | "voice";
}

export interface QuickAddGateway {
  /**
   * `POST /v1/transactions` y devuelve el id. Un reintento con la misma clave no
   * registra otro.
   */
  register(token: string, transaction: NewTransaction, idempotencyKey: string): Promise<string>;
}

export const apiQuickAddGateway: QuickAddGateway = {
  register: async (token, { source = "quick_add", ...transaction }, idempotencyKey) => {
    const saved = await unwrap(
      createApiClient({ baseUrl: apiBaseUrl(), accessToken: token }).POST("/v1/transactions", {
        body: { ...transaction, source },
        params: { header: { "Idempotency-Key": idempotencyKey } },
      }),
    );
    return saved.id;
  },
};

/** En el modo demo se acepta todo y no se guarda nada. */
export const demoQuickAddGateway: QuickAddGateway = { register: async () => "demo-transaction" };

export function quickAddGateway(): QuickAddGateway {
  return isDemo() ? demoQuickAddGateway : apiQuickAddGateway;
}
