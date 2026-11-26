import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/errors";
import type { components } from "@/lib/api/generated/schema";
import { isDemo } from "@/lib/demo";

import type { Transaction } from "../../map/data/map-gateway";
import { demoTransactionsGateway } from "./demo-transactions-gateway";

/** `GET /v1/accounts`: si es tarjeta, con su banco y sus últimos 4 dígitos. */
export type Account = components["schemas"]["AccountListItemRead"];

/** Lo que se le pasa a `GET /v1/transactions` (spec 002 del back, RF-32). */
export interface TransactionsQuery {
  from?: string;
  to?: string;
  q?: string;
  category_id?: string;
  account_id?: string;
  currency?: string;
  cursor?: string;
  limit?: number;
}

/** Lo que se corrige de un gasto o un ingreso (`PATCH /v1/transactions/{id}`). */
export type TransactionChanges = components["schemas"]["TransactionUpdate"];

export interface TransactionsPage {
  items: Transaction[];
  next_cursor: string | null;
}

/** REQ-056: un aporte a una meta (salió de la cuenta) o un retiro (volvió a ella). */
export type GoalMovement = components["schemas"]["GoalMovementRead"];

/** Lo que se le pasa a `GET /v1/goals/movements`: los mismos filtros, sin búsqueda ni categoría. */
export type GoalMovementsQuery = Omit<TransactionsQuery, "q" | "category_id">;

export interface GoalMovementsPage {
  items: GoalMovement[];
  next_cursor: string | null;
}

/** El historial y las cuentas que lo filtran. Lanza `ApiError` con el `code`. */
export interface TransactionsGateway {
  list(token: string, query: TransactionsQuery): Promise<TransactionsPage>;
  /** REQ-056: el filtro "Metas", los aportes y retiros de las metas. */
  goalMovements(token: string, query: GoalMovementsQuery): Promise<GoalMovementsPage>;
  accounts(token: string): Promise<Account[]>;
  /** Corrige un movimiento; la API recalcula los saldos. */
  update(token: string, id: string, changes: TransactionChanges): Promise<void>;
  /** Lo borra: el monto vuelve al saldo de su cuenta. */
  remove(token: string, id: string): Promise<void>;
  /** Spec 014 del back: la foto del comprobante de un gasto, con su tipo. */
  receipt(token: string, id: string): Promise<Receipt>;
  /** La adjunta o reemplaza: JPEG, PNG o WebP de hasta 5 MB. */
  attachReceipt(token: string, id: string, photo: Blob): Promise<void>;
  removeReceipt(token: string, id: string): Promise<void>;
}

export interface Receipt {
  bytes: ArrayBuffer;
  type: string;
}

/** El límite de la API para la foto del comprobante. */
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

const api = (accessToken: string) => createApiClient({ baseUrl: apiBaseUrl(), accessToken });

export const apiTransactionsGateway: TransactionsGateway = {
  list: (token, query) => unwrap(api(token).GET("/v1/transactions", { params: { query } })),
  goalMovements: (token, query) =>
    unwrap(api(token).GET("/v1/goals/movements", { params: { query } })),
  accounts: (token) => unwrap(api(token).GET("/v1/accounts")),
  update: async (token, id, changes) => {
    await unwrap(
      api(token).PATCH("/v1/transactions/{transaction_id}", {
        params: { path: { transaction_id: id } },
        body: changes,
      }),
    );
  },
  remove: async (token, id) => {
    await unwrap(
      api(token).DELETE("/v1/transactions/{transaction_id}", {
        params: { path: { transaction_id: id } },
      }),
    );
  },
  receipt: async (token, id) => {
    const call = api(token).GET("/v1/transactions/{transaction_id}/receipt", {
      params: { path: { transaction_id: id } },
      parseAs: "arrayBuffer",
    });
    const bytes = (await unwrap(call)) as unknown as ArrayBuffer;
    return { bytes, type: (await call).response.headers.get("content-type") ?? "image/jpeg" };
  },
  attachReceipt: async (token, id, photo) => {
    await unwrap(
      api(token).PUT("/v1/transactions/{transaction_id}/receipt", {
        params: { path: { transaction_id: id } },
        // La imagen cruda: el contrato la tipa como texto binario. La API
        // reconoce el tipo por los primeros bytes.
        body: photo as unknown as string,
        bodySerializer: (body) => body as unknown as BodyInit,
        headers: { "Content-Type": photo.type || "application/octet-stream" },
      }),
    );
  },
  removeReceipt: async (token, id) => {
    await unwrap(
      api(token).DELETE("/v1/transactions/{transaction_id}/receipt", {
        params: { path: { transaction_id: id } },
      }),
    );
  },
};

export function transactionsGateway(): TransactionsGateway {
  return isDemo() ? demoTransactionsGateway : apiTransactionsGateway;
}
