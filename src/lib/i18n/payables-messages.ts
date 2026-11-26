/** Textos de las cuentas por pagar: los fijos que ya vencieron, como aviso. */
import { byLocale } from "./locale";

const es = {
  title: "Cuentas por pagar",
  overdue: "Vencido",
  dueOn: (date: string) => `Venció el ${date}`,
  dueToday: "Vence hoy",
  toCollect: "Por cobrar",
  pay: "Pagar",
  collect: "Cobrar",
  payLabel: (name: string) => `Registrar el pago de ${name}`,
  collectLabel: (name: string) => `Registrar que entró ${name}`,
  section: "Programados vencidos",
  paid: "Registrado",
  skipped: "Pasó al siguiente vencimiento",
};

const en: typeof es = {
  title: "Bills to pay",
  overdue: "Overdue",
  dueOn: (date: string) => `Was due ${date}`,
  dueToday: "Due today",
  toCollect: "To collect",
  pay: "Pay",
  collect: "Collect",
  payLabel: (name: string) => `Log the payment of ${name}`,
  collectLabel: (name: string) => `Log that ${name} came in`,
  section: "Overdue payments",
  paid: "Logged",
  skipped: "Moved to the next due date",
};

const pt: typeof es = {
  title: "Contas a pagar",
  overdue: "Vencido",
  dueOn: (date: string) => `Venceu em ${date}`,
  dueToday: "Vence hoje",
  toCollect: "A receber",
  pay: "Pagar",
  collect: "Receber",
  payLabel: (name: string) => `Registrar o pagamento de ${name}`,
  collectLabel: (name: string) => `Registrar que ${name} entrou`,
  section: "Programados vencidos",
  paid: "Registrado",
  skipped: "Passou para o próximo vencimento",
};

export const payablesMessagesByLocale = byLocale({ es, en, pt });
