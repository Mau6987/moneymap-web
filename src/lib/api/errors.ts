/**
 * Errores de la API.
 *
 * La API responde los errores como `application/problem+json` con un `code`
 * estable en inglés (`email_taken`, `invalid_credentials`…). La interfaz decide
 * qué texto mostrar según ese `code`, nunca según el `detail`.
 */

/** Sin respuesta de la API: sin conexión o la API caída. */
export const NETWORK_ERROR = "network_error";

/** La API respondió algo que no es un problem+json con `code`. */
export const UNKNOWN_ERROR = "unknown_error";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(`API ${status}: ${code}`);
    this.name = "ApiError";
  }
}

interface FetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

function codeOf(body: unknown): string {
  if (typeof body === "object" && body !== null && "code" in body) {
    const { code } = body as { code: unknown };
    if (typeof code === "string" && code.length > 0) return code;
  }
  return UNKNOWN_ERROR;
}

/**
 * Espera una llamada de openapi-fetch y devuelve sus datos, o lanza un
 * `ApiError` con el `code` de la API.
 */
export async function unwrap<T>(call: Promise<FetchResult<T>>): Promise<T> {
  let result: FetchResult<T>;
  try {
    result = await call;
  } catch {
    throw new ApiError(NETWORK_ERROR, 0);
  }

  if (result.response.ok) return result.data as T;
  throw new ApiError(codeOf(result.error), result.response.status);
}

/** El `code` de cualquier error: el de la API, o desconocido. */
export function errorCode(error: unknown): string {
  return error instanceof ApiError ? error.code : UNKNOWN_ERROR;
}
