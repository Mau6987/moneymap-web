/**
 * Lo que dice el chip de una cuenta al registrar, transferir o crear un fijo:
 * el nombre y la moneda y, debajo, el saldo (BUG-060, como la app), para saber
 * de dónde sale el dinero o a dónde va.
 */
export function AccountChipText({
  name,
  currency,
  balance,
}: {
  name: string;
  currency: string;
  /** El saldo ya escrito (oculto en modo privado). */
  balance?: string;
}) {
  return (
    <span className="flex flex-col items-start leading-tight">
      <span>
        {name} · {currency}
      </span>
      {balance && (
        <span className="text-xs font-bold opacity-75" data-testid="account-balance">
          {balance}
        </span>
      )}
    </span>
  );
}
