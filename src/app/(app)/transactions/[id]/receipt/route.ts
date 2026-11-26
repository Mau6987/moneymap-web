import { unstable_rethrow } from "next/navigation";

import { transactionsGateway } from "@/features/transactions/data/transactions-gateway";
import { withAccessToken } from "@/lib/auth/session";

/**
 * Spec 014 del back: la foto del comprobante de un gasto, pedida a la API con
 * la sesión. El token no llega al navegador y la foto no queda en cachés.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const receipt = await withAccessToken((token) => transactionsGateway().receipt(token, id));
    return new Response(receipt.bytes, {
      headers: {
        "Content-Type": receipt.type,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    unstable_rethrow(error);
    return new Response(null, { status: 404 });
  }
}
