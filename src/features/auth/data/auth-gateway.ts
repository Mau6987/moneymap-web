import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/errors";
import type { components } from "@/lib/api/generated/schema";
import type { TokenPair } from "@/lib/auth/tokens";
import { isDemo } from "@/lib/demo";

import { demoAuthGateway } from "./demo-auth-gateway";

export type Profile = components["schemas"]["UserProfileRead"];

/** Lo que la web le pide a la API sobre la sesión. Lanza `ApiError` con el `code`. */
export interface AuthGateway {
  login(email: string, password: string): Promise<TokenPair>;
  refresh(refreshToken: string): Promise<TokenPair>;
  logout(refreshToken: string): Promise<void>;
  me(accessToken: string): Promise<Profile>;
}

export const apiAuthGateway: AuthGateway = {
  login: (email, password) =>
    unwrap(
      createApiClient({ baseUrl: apiBaseUrl() }).POST("/v1/auth/login", {
        body: { email, password },
      }),
    ),
  refresh: (refreshToken) =>
    unwrap(
      createApiClient({ baseUrl: apiBaseUrl() }).POST("/v1/auth/refresh", {
        body: { refresh_token: refreshToken },
      }),
    ),
  logout: async (refreshToken) => {
    await unwrap(
      createApiClient({ baseUrl: apiBaseUrl() }).POST("/v1/auth/logout", {
        body: { refresh_token: refreshToken },
      }),
    );
  },
  me: (accessToken) =>
    unwrap(createApiClient({ baseUrl: apiBaseUrl(), accessToken }).GET("/v1/me")),
};

export function authGateway(): AuthGateway {
  return isDemo() ? demoAuthGateway : apiAuthGateway;
}
