/** Textos de "Transferir" (spec 002, RF-7 y RF-16). */
import { byLocale, type Locale } from "./locale";

const es = {
  title: "Transferir",
  from: "Desde",
  to: "Hacia",
  amount: "Monto",
  date: "Fecha",
  description: "Descripción (opcional)",
  descriptionHint: "Por ejemplo, retiro del cajero",
  noDestination: (currency: string) => `No tienes otra cuenta en ${currency}`,
  createAccount: "Crear cuenta",
  note: "Solo entre cuentas de la misma moneda. No cambia tu Safe to Spend.",
  save: "Transferir",
  saving: "Transfiriendo…",
  cancel: "Cancelar",
  saved: "Transferencia registrada",
  noAccounts: "Para transferir, primero agrega una cuenta.",
  errors: {
    network_error: "Sin conexión. Tus datos siguen acá: vuelve a intentar.",
    invalid_amount: "Revisa el monto",
    currency_mismatch: "Las dos cuentas tienen que estar en la misma moneda",
    transfer_currency_mismatch: "Las dos cuentas tienen que estar en la misma moneda",
    not_found: "Una de las cuentas ya no existe. Elige otra.",
    invalid_transfer_target: "Una de las cuentas ya no existe. Elige otra.",
    validation_error: "Revisa los datos",
    account_insufficient: "La cuenta de origen no tiene saldo suficiente",
    unknown: "Algo salió mal. Vuelve a intentar.",
  } as Record<string, string>,
};

const en: typeof es = {
  title: "Transfer",
  from: "From",
  to: "To",
  amount: "Amount",
  date: "Date",
  description: "Description (optional)",
  descriptionHint: "For example, ATM withdrawal",
  noDestination: (currency: string) => `You don't have another account in ${currency}`,
  createAccount: "Create account",
  note: "Only between accounts in the same currency. It doesn't change your Safe to Spend.",
  save: "Transfer",
  saving: "Transferring…",
  cancel: "Cancel",
  saved: "Transfer saved",
  noAccounts: "To transfer, first add an account.",
  errors: {
    network_error: "You're offline. Your data is still here: try again.",
    invalid_amount: "Check the amount",
    currency_mismatch: "Both accounts must be in the same currency",
    transfer_currency_mismatch: "Both accounts must be in the same currency",
    not_found: "One of the accounts no longer exists. Pick another.",
    invalid_transfer_target: "One of the accounts no longer exists. Pick another.",
    validation_error: "Check the details",
    account_insufficient: "The source account doesn't have enough balance",
    unknown: "Something went wrong. Try again.",
  },
};

const pt: typeof es = {
  title: "Transferir",
  from: "De",
  to: "Para",
  amount: "Valor",
  date: "Data",
  description: "Descrição (opcional)",
  descriptionHint: "Por exemplo, saque no caixa eletrônico",
  noDestination: (currency: string) => `Você não tem outra conta em ${currency}`,
  createAccount: "Criar conta",
  note: "Só entre contas da mesma moeda. Não muda seu Safe to Spend.",
  save: "Transferir",
  saving: "Transferindo…",
  cancel: "Cancelar",
  saved: "Transferência registrada",
  noAccounts: "Para transferir, primeiro adicione uma conta.",
  errors: {
    network_error: "Sem conexão. Seus dados continuam aqui: tente de novo.",
    invalid_amount: "Confira o valor",
    currency_mismatch: "As duas contas precisam estar na mesma moeda",
    transfer_currency_mismatch: "As duas contas precisam estar na mesma moeda",
    not_found: "Uma das contas não existe mais. Escolha outra.",
    invalid_transfer_target: "Uma das contas não existe mais. Escolha outra.",
    validation_error: "Confira os dados",
    account_insufficient: "A conta de origem não tem saldo suficiente",
    unknown: "Algo deu errado. Tente de novo.",
  },
};

export const transferMessagesByLocale = byLocale({ es, en, pt });

/** El texto de una transferencia que no se guardó; lo escrito se queda (RF-16). */
export function transferErrorText(code: string, locale: Locale = "es"): string {
  const errors = transferMessagesByLocale[locale].errors;
  return errors[code] ?? errors.unknown ?? "";
}
