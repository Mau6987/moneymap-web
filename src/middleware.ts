import { NextResponse, type NextRequest } from "next/server";

import { authGateway } from "@/features/auth/data/auth-gateway";
import { NETWORK_ERROR, errorCode } from "@/lib/api/errors";
import { PATH_HEADER } from "@/lib/api/unavailable";
import { createRefresher } from "@/lib/auth/refresh";
import { HOME_PATH, guard, isGuestPath } from "@/lib/auth/route-guard";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearedCookies,
  secureCookies,
  sessionCookies,
  type SessionCookie,
} from "@/lib/auth/tokens";

const refreshOnce = createRefresher((refreshToken) => authGateway().refresh(refreshToken));

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

function withCookies(response: NextResponse, cookies: readonly SessionCookie[]) {
  for (const { name, value, options } of cookies) response.cookies.set(name, value, options);
  return response;
}

/** Renueva la sesión y deja los tokens nuevos en esta petición y en la respuesta. */
async function refreshSession(request: NextRequest, refreshToken: string) {
  const guest = isGuestPath(request.nextUrl.pathname);
  try {
    const cookies = sessionCookies(await refreshOnce(refreshToken), secureCookies());
    for (const { name, value } of cookies) request.cookies.set(name, value);
    return withCookies(
      guest
        ? redirectTo(request, HOME_PATH)
        : NextResponse.next({ request: { headers: request.headers } }),
      cookies,
    );
  } catch (error) {
    // Sin conexión no se cierra la sesión: el refresh sigue valiendo.
    if (errorCode(error) === NETWORK_ERROR) {
      return NextResponse.next({ request: { headers: request.headers } });
    }
    // Spec 008, RF-20: la renovación falló y se vuelve al inicio de sesión.
    const response = guest ? NextResponse.next() : redirectTo(request, "/login?reason=expired");
    return withCookies(response, clearedCookies(secureCookies()));
  }
}

export async function middleware(request: NextRequest) {
  // MM-182: la ruta pedida, para que "MoneyMap no responde" sepa a dónde volver.
  request.headers.set(PATH_HEADER, request.nextUrl.pathname + request.nextUrl.search);
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  switch (guard(request.nextUrl.pathname, Boolean(access), Boolean(refresh))) {
    case "refresh":
      return refreshSession(request, refresh ?? "");
    case "to-login":
      return redirectTo(request, "/login");
    case "to-home":
      return redirectTo(request, HOME_PATH);
    case "continue":
      return NextResponse.next({ request: { headers: request.headers } });
  }
}

export const config = {
  // Todo menos los archivos estáticos de Next.js y los que tienen extensión.
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
