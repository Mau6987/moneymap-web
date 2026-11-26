export interface TransferAccount {
  id: string;
  name: string;
  currency: string;
  /** El símbolo o el código, según el catálogo (spec 002, RF-10). */
  label: string;
  decimals: number;
  isDefault: boolean;
  /** BUG-060: el saldo ya escrito, para mostrarlo junto al nombre. */
  balance?: string;
}

/** El origen elegido, o la cuenta por defecto. */
export function originOf(
  accounts: TransferAccount[],
  fromId?: string,
): TransferAccount | undefined {
  return accounts.find((a) => a.id === fromId) ?? accounts.find((a) => a.isDefault) ?? accounts[0];
}

/** Spec 002, RF-7: solo las otras cuentas de la moneda del origen. */
export function destinationsOf(
  accounts: TransferAccount[],
  from: TransferAccount | undefined,
): TransferAccount[] {
  if (!from) return [];
  return accounts.filter((a) => a.id !== from.id && a.currency === from.currency);
}
