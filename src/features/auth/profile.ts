import { cache } from "react";

import { withAccessToken } from "@/lib/auth/session";

import { authGateway } from "./data/auth-gateway";

/** El perfil de quien tiene la sesión, pedido una sola vez por página. */
export const currentProfile = cache(() => withAccessToken((token) => authGateway().me(token)));
