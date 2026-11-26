import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/errors";
import type { components } from "@/lib/api/generated/schema";
import type { TokenPair } from "@/lib/auth/tokens";
import { isDemo } from "@/lib/demo";

import { demoRegistrationGateway } from "./demo-registration-gateway";

export type Verification = components["schemas"]["EmailVerificationRead"];
export type RegisterRequest = components["schemas"]["RegisterRequest"];

/** El registro con correo (spec 001 del backend, RF-22 a RF-26). Lanza `ApiError`. */
export interface RegistrationGateway {
  requestVerification(email: string): Promise<Verification>;
  resendVerification(verificationId: string): Promise<Verification>;
  verification(verificationId: string): Promise<Verification>;
  register(request: RegisterRequest): Promise<TokenPair>;
}

const api = () => createApiClient({ baseUrl: apiBaseUrl() });

export const apiRegistrationGateway: RegistrationGateway = {
  requestVerification: (email) =>
    unwrap(api().POST("/v1/auth/email-verifications", { body: { email } })),
  resendVerification: (verificationId) =>
    unwrap(
      api().POST("/v1/auth/email-verifications/{verification_id}/resend", {
        params: { path: { verification_id: verificationId } },
      }),
    ),
  verification: (verificationId) =>
    unwrap(
      api().GET("/v1/auth/email-verifications/{verification_id}", {
        params: { path: { verification_id: verificationId } },
      }),
    ),
  register: (request) => unwrap(api().POST("/v1/auth/register", { body: request })),
};

export function registrationGateway(): RegistrationGateway {
  return isDemo() ? demoRegistrationGateway : apiRegistrationGateway;
}
