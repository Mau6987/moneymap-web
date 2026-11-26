import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { ApiError, unwrap } from "@/lib/api/errors";
import type { components } from "@/lib/api/generated/schema";
import type { TokenPair } from "@/lib/auth/tokens";
import { DEMO_GOOGLE_TOKEN, DEMO_NEW_USER_TOKEN, isDemo } from "@/lib/demo";

type Schemas = components["schemas"];
export type CompleteRegistration = Schemas["CompleteRegistrationRequest"];

/** Lo que responde la API al `id_token` de Google (spec 008, RF-9 y RF-10). */
export type GoogleSignIn =
  | { kind: "signed_in"; tokens: TokenPair }
  | {
      kind: "registration_required";
      registrationToken: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
    };

/** Entrar con Google y, si es nueva, crear la cuenta. Lanza `ApiError`. */
export interface GoogleGateway {
  /** `POST /v1/auth/oauth/google`. */
  signIn(idToken: string): Promise<GoogleSignIn>;
  /** `POST /v1/auth/oauth/complete`: "Completa tu perfil". */
  complete(registration: CompleteRegistration): Promise<TokenPair>;
}

const api = () => createApiClient({ baseUrl: apiBaseUrl() });

export const apiGoogleGateway: GoogleGateway = {
  signIn: async (idToken) => {
    const result = await unwrap(
      api().POST("/v1/auth/oauth/{provider}", {
        params: { path: { provider: "google" } },
        body: { id_token: idToken },
      }),
    );
    if ("registration_token" in result) {
      return {
        kind: "registration_required",
        registrationToken: result.registration_token,
        email: result.email ?? null,
        firstName: result.first_name ?? null,
        lastName: result.last_name ?? null,
      };
    }
    return { kind: "signed_in", tokens: result };
  },
  complete: (registration) => unwrap(api().POST("/v1/auth/oauth/complete", { body: registration })),
};

/**
 * Google en el modo demo, como en la app: la primera vez pide completar el
 * perfil y después entra con esa cuenta, que va al onboarding.
 */
const demo = { registered: false };

export const demoGoogleGateway: GoogleGateway = {
  signIn: async (idToken) => {
    if (idToken !== DEMO_GOOGLE_TOKEN) throw new ApiError("invalid_provider_token", 401);
    if (demo.registered) {
      return {
        kind: "signed_in",
        tokens: {
          access_token: DEMO_NEW_USER_TOKEN,
          refresh_token: "demo-refresh",
          expires_in: 900,
        },
      };
    }
    return {
      kind: "registration_required",
      registrationToken: "demo-registration",
      email: "google@demo.com",
      firstName: "Ana",
      lastName: null,
    };
  },
  complete: async (registration) => {
    if (registration.registration_token !== "demo-registration") {
      throw new ApiError("invalid_registration_token", 401);
    }
    demo.registered = true;
    return { access_token: DEMO_NEW_USER_TOKEN, refresh_token: "demo-refresh", expires_in: 900 };
  },
};

export function googleGateway(): GoogleGateway {
  return isDemo() ? demoGoogleGateway : apiGoogleGateway;
}
