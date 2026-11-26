/** El código que llega al correo: exactamente 6 dígitos. */
export const RESET_CODE_PATTERN = /^\d{6}$/;

/** El código vence a los 30 minutos (spec 008 del backend). */
export const RESET_CODE_MINUTES = 30;

/** Se puede pedir otro código un minuto después de cada envío (spec 009, RF-4). */
export const RESET_RESEND_SECONDS = 60;
