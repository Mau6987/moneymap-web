/** Textos de recuperar la contraseña (spec 009, mockups Web 03f a 03i). */
import { byLocale, type Locale } from "./locale";

const es = {
  back: "Volver",
  email: {
    title: "¿Olvidaste tu contraseña?",
    subtitle: "Escribe tu correo y te enviamos un código de 6 dígitos para crear una nueva",
    label: "Correo",
    send: "Enviar código",
    sending: "Enviando…",
    backToLogin: "Volver a iniciar sesión",
  },
  code: {
    title: "Revisa tu correo",
    subtitle: (minutes: number) =>
      `Si tu correo tiene una cuenta, te enviaremos un código de 6 dígitos. Vence en ${minutes} min`,
    timeLeft: "Tiempo restante",
    label: "Código de 6 dígitos",
    placeholder: "123456",
    invalid: "El código no coincide o ya venció. Pídelo de nuevo",
    verify: "Verificar código",
    verifying: "Verificando…",
    resend: "Reenviar código",
    resendIn: (time: string) => `Reenviar en ${time}`,
    resent: "Código reenviado",
    changeEmail: "Cambiar correo",
    demo: "Modo demo: el código es 123456",
  },
  password: {
    title: "Crea tu nueva contraseña",
    subtitle: "Al guardarla, se cerrará tu sesión en los otros dispositivos",
    label: "Nueva contraseña",
    save: "Guardar contraseña",
    saving: "Guardando…",
  },
  done: {
    title: "Contraseña actualizada",
    body: "Ya puedes entrar con tu nueva contraseña",
    signIn: "Iniciar sesión",
  },
  errors: {
    network_error: "Sin conexión",
    too_many_requests: "Demasiados intentos. Espera un momento e intenta de nuevo",
    unknown: "Algo salió mal. Intenta de nuevo.",
  } as Record<string, string>,
};

const en: typeof es = {
  back: "Back",
  email: {
    title: "Forgot your password?",
    subtitle: "Type your email and we'll send you a 6-digit code to create a new one",
    label: "Email",
    send: "Send code",
    sending: "Sending…",
    backToLogin: "Back to sign in",
  },
  code: {
    title: "Check your email",
    subtitle: (minutes: number) =>
      `If your email has an account, we'll send you a 6-digit code. It expires in ${minutes} min`,
    timeLeft: "Time left",
    label: "6-digit code",
    placeholder: "123456",
    invalid: "The code doesn't match or has expired. Ask for a new one",
    verify: "Verify code",
    verifying: "Verifying…",
    resend: "Resend code",
    resendIn: (time: string) => `Resend in ${time}`,
    resent: "Code resent",
    changeEmail: "Change email",
    demo: "Demo mode: the code is 123456",
  },
  password: {
    title: "Create your new password",
    subtitle: "When you save it, you'll be signed out on your other devices",
    label: "New password",
    save: "Save password",
    saving: "Saving…",
  },
  done: {
    title: "Password updated",
    body: "You can now sign in with your new password",
    signIn: "Sign in",
  },
  errors: {
    network_error: "You're offline",
    too_many_requests: "Too many attempts. Wait a moment and try again",
    unknown: "Something went wrong. Try again.",
  },
};

const pt: typeof es = {
  back: "Voltar",
  email: {
    title: "Esqueceu sua senha?",
    subtitle: "Escreva seu e-mail e enviaremos um código de 6 dígitos para criar uma nova",
    label: "E-mail",
    send: "Enviar código",
    sending: "Enviando…",
    backToLogin: "Voltar para entrar",
  },
  code: {
    title: "Verifique seu e-mail",
    subtitle: (minutes: number) =>
      `Se seu e-mail tiver uma conta, enviaremos um código de 6 dígitos. Vence em ${minutes} min`,
    timeLeft: "Tempo restante",
    label: "Código de 6 dígitos",
    placeholder: "123456",
    invalid: "O código não confere ou já venceu. Peça de novo",
    verify: "Verificar código",
    verifying: "Verificando…",
    resend: "Reenviar código",
    resendIn: (time: string) => `Reenviar em ${time}`,
    resent: "Código reenviado",
    changeEmail: "Mudar e-mail",
    demo: "Modo demo: o código é 123456",
  },
  password: {
    title: "Crie sua nova senha",
    subtitle: "Ao salvá-la, sua sessão será encerrada nos outros dispositivos",
    label: "Nova senha",
    save: "Salvar senha",
    saving: "Salvando…",
  },
  done: {
    title: "Senha atualizada",
    body: "Agora você pode entrar com sua nova senha",
    signIn: "Entrar",
  },
  errors: {
    network_error: "Sem conexão",
    too_many_requests: "Muitas tentativas. Espere um momento e tente de novo",
    unknown: "Algo deu errado. Tente de novo.",
  },
};

export const resetMessagesByLocale = byLocale({ es, en, pt });

export function resetErrorText(code: string, locale: Locale = "es"): string {
  const errors = resetMessagesByLocale[locale].errors;
  return errors[code] ?? errors.unknown ?? "";
}
