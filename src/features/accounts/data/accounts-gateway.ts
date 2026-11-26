import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { ApiError, unwrap } from "@/lib/api/errors";
import { isDemo } from "@/lib/demo";

import { DEMO_ACCOUNTS } from "../../transactions/data/demo-transactions-gateway";

/** Lo que "Nueva cuenta" manda (spec 002, RF-1 a RF-3). */
export interface NewAccount {
  name: string;
  type: "cash" | "card";
  currency: string;
  opening_balance: string;
  last4?: string;
}

export interface AccountsGateway {
  /** `POST /v1/accounts`. */
  create(token: string, account: NewAccount): Promise<void>;
  /** `PATCH /v1/accounts/{id}` con solo el nombre. */
  rename(token: string, id: string, name: string): Promise<void>;
}

const api = (accessToken: string) => createApiClient({ baseUrl: apiBaseUrl(), accessToken });

export const apiAccountsGateway: AccountsGateway = {
  create: async (token, account) => {
    await unwrap(api(token).POST("/v1/accounts", { body: account }));
  },
  rename: async (token, id, name) => {
    await unwrap(
      api(token).PATCH("/v1/accounts/{account_id}", {
        params: { path: { account_id: id } },
        body: { name },
      }),
    );
  },
};

/** En el modo demo valen las mismas reglas de nombres; no se guarda nada. */
export const demoAccountsGateway: AccountsGateway = {
  create: async (_, account) => {
    if (DEMO_ACCOUNTS.some((a) => a.name.toLowerCase() === account.name.toLowerCase())) {
      throw new ApiError("account_name_taken", 409);
    }
  },
  rename: async () => {},
};

export function accountsGateway(): AccountsGateway {
  return isDemo() ? demoAccountsGateway : apiAccountsGateway;
}
