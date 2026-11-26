/**
 * Cliente de la API de MoneyMap.
 *
 * Los tipos salen de `generated/schema.ts`, que se regenera desde openapi.json
 * con `tool/generate-api.sh`. Este cliente solo se usa del lado del servidor
 * (route handlers, server actions y server components): el token de acceso
 * nunca llega al navegador (AGENTS.md, Reglas).
 */
import createClient from "openapi-fetch";

import type { paths } from "./generated/schema";

export type ApiClient = ReturnType<typeof createClient<paths>>;

export interface ApiClientOptions {
  /** Origen de la API, sin `/v1`: las rutas del contrato ya lo traen. */
  baseUrl: string;
  accessToken?: string;
  fetch?: typeof globalThis.fetch;
}

export function createApiClient({ baseUrl, accessToken, fetch }: ApiClientOptions): ApiClient {
  const client = createClient<paths>({ baseUrl, fetch });

  if (accessToken) {
    client.use({
      onRequest({ request }) {
        request.headers.set("Authorization", `Bearer ${accessToken}`);
        return request;
      },
    });
  }

  return client;
}

/** La URL de la API, que solo existe del lado del servidor. */
export function apiBaseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error("Falta API_BASE_URL: copia .env.example como .env.local");
  }
  return url;
}
