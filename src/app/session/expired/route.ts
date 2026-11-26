import { NextResponse } from "next/server";

import { clearedCookies, secureCookies } from "@/lib/auth/tokens";

/**
 * La sesión terminó mientras se armaba una página: borra las cookies y abre el
 * inicio de sesión con el aviso (spec 008, RF-20). Es un route handler porque
 * un server component no puede escribir cookies.
 *
 * La redirección es relativa: detrás de Docker, `request.url` trae el host en
 * el que escucha el servidor (0.0.0.0), no el que usó el navegador.
 */
export function GET() {
  const response = new NextResponse(null, {
    status: 307,
    headers: { Location: "/login?reason=expired" },
  });
  for (const { name, value, options } of clearedCookies(secureCookies())) {
    response.cookies.set(name, value, options);
  }
  return response;
}
