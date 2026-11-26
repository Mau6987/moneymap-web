import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/errors";
import { isDemo } from "@/lib/demo";

/** Lo que manda "Transferir". La moneda no va: es la de las dos cuentas (RF-7). */
export interface NewTransfer {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  occurredOn: string;
  description: string;
}

export interface TransfersGateway {
  /** `POST /v1/transactions`. Un reintento con la misma clave no mueve el dinero dos veces. */
  register(token: string, transfer: NewTransfer, idempotencyKey: string): Promise<void>;
}

export const apiTransfersGateway: TransfersGateway = {
  register: async (token, transfer, idempotencyKey) => {
    await unwrap(
      createApiClient({ baseUrl: apiBaseUrl(), accessToken: token }).POST("/v1/transactions", {
        body: {
          kind: "transfer",
          account_id: transfer.fromAccountId,
          transfer_account_id: transfer.toAccountId,
          amount: transfer.amount,
          occurred_on: transfer.occurredOn,
          description: transfer.description,
          source: "manual",
        },
        params: { header: { "Idempotency-Key": idempotencyKey } },
      }),
    );
  },
};

/** En el modo demo se acepta todo y no se guarda nada. */
export const demoTransfersGateway: TransfersGateway = { register: async () => {} };

export function transfersGateway(): TransfersGateway {
  return isDemo() ? demoTransfersGateway : apiTransfersGateway;
}
