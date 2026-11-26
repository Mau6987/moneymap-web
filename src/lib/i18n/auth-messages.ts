/** Textos del acceso: inicio de sesión, sesión y cierre (spec 008). */
import { byLocale, type Locale } from "./locale";

const es = {
  hero: {
    titleLine1: "Your money.",
    titleLine2: "Mapped.",
    subtitle: "Dónde está tu dinero, hacia dónde va y cuánto puedes gastar sin afectar tus metas.",
    points: [
      "Safe to Spend: cuánto queda libre después de tus obligaciones",
      "Registra por voz o escaneando una factura",
      "Simula una compra antes de hacerla",
    ],
  },
  login: {
    title: "Entrar",
    subtitle: "Usa la misma cuenta que en tu teléfono",
    email: "Correo",
    emailPlaceholder: "ana@correo.com",
    password: "Contraseña",
    forgot: "¿La olvidaste?",
    submit: "Entrar",
    submitting: "Entrando…",
    newHere: "¿Nuevo aquí?",
    createAccount: "Crear cuenta",
  },
  google: {
    divider: "o continúa con",
    demoButton: "Continuar con Google",
    signingIn: "Entrando con Google…",
    unavailable: "No pudimos abrir Google. Intenta de nuevo o entra con tu correo.",
  },
  completeProfile: {
    title: "Completa tu perfil",
    subtitle: "Solo falta tu nombre para crear tu cuenta con Google.",
    verified: (email: string) => `${email} verificado con Google`,
    email: "Correo",
    firstName: "Nombre",
    lastName: "Apellido",
    terms: "Acepto los Términos y la Privacidad",
    submit: "Crear cuenta",
    submitting: "Creando tu cuenta…",
    expired: "Pasó mucho tiempo desde que entraste con Google.",
    backToLogin: "Volver a entrar",
  },
  sessionExpired: "Tu sesión terminó. Inicia sesión de nuevo",
  logout: {
    action: "Cerrar sesión",
    title: "¿Cerrar sesión?",
    body: "Para volver a entrar en este navegador vas a necesitar tu contraseña.",
    confirm: "Cerrar sesión",
    cancel: "Cancelar",
  },
  errors: {
    invalid_credentials: "Correo o contraseña incorrectos",
    too_many_requests: "Demasiados intentos. Espera un momento e intenta de nuevo",
    email_not_verified: "Aún no vemos tu correo verificado",
    network_error: "Sin conexión",
    invalid_provider_token: "Google no confirmó tu cuenta. Intenta de nuevo.",
    email_required: "Tu cuenta de Google no comparte el correo. Entra con tu correo y contraseña.",
    email_taken: "Este correo ya tiene una cuenta: entra con tu contraseña.",
    name_required: "Escribe tu nombre y tu apellido",
    terms_required: "Acepta los Términos y la Privacidad para seguir",
    registration_expired: "Pasó mucho tiempo desde que entraste con Google. Vuelve a entrar.",
    unknown: "Algo salió mal. Intenta de nuevo.",
  } as Record<string, string>,
};

const en: typeof es = {
  hero: {
    titleLine1: "Your money.",
    titleLine2: "Mapped.",
    subtitle:
      "Where your money is, where it's going and how much you can spend without hurting your goals.",
    points: [
      "Safe to Spend: how much is left after what you owe",
      "Log by voice or by scanning a receipt",
      "Try out a purchase before you make it",
    ],
  },
  login: {
    title: "Sign in",
    subtitle: "Use the same account as on your phone",
    email: "Email",
    emailPlaceholder: "ana@email.com",
    password: "Password",
    forgot: "Forgot it?",
    submit: "Sign in",
    submitting: "Signing in…",
    newHere: "New here?",
    createAccount: "Create account",
  },
  google: {
    divider: "or continue with",
    demoButton: "Continue with Google",
    signingIn: "Signing in with Google…",
    unavailable: "We couldn't open Google. Try again or sign in with your email.",
  },
  completeProfile: {
    title: "Complete your profile",
    subtitle: "We only need your name to create your account with Google.",
    verified: (email: string) => `${email} verified with Google`,
    email: "Email",
    firstName: "First name",
    lastName: "Last name",
    terms: "I accept the Terms and the Privacy Policy",
    submit: "Create account",
    submitting: "Creating your account…",
    expired: "Too much time has passed since you signed in with Google.",
    backToLogin: "Sign in again",
  },
  sessionExpired: "Your session ended. Sign in again",
  logout: {
    action: "Sign out",
    title: "Sign out?",
    body: "To sign in again in this browser you'll need your password.",
    confirm: "Sign out",
    cancel: "Cancel",
  },
  errors: {
    invalid_credentials: "Wrong email or password",
    too_many_requests: "Too many attempts. Wait a moment and try again",
    email_not_verified: "We don't see your email verified yet",
    network_error: "You're offline",
    invalid_provider_token: "Google didn't confirm your account. Try again.",
    email_required:
      "Your Google account doesn't share its email. Sign in with your email and password.",
    email_taken: "This email already has an account: sign in with your password.",
    name_required: "Write your first and last name",
    terms_required: "Accept the Terms and the Privacy Policy to continue",
    registration_expired:
      "Too much time has passed since you signed in with Google. Sign in again.",
    unknown: "Something went wrong. Try again.",
  },
};

const pt: typeof es = {
  hero: {
    titleLine1: "Your money.",
    titleLine2: "Mapped.",
    subtitle:
      "Onde está seu dinheiro, para onde ele vai e quanto você pode gastar sem afetar suas metas.",
    points: [
      "Safe to Spend: quanto sobra depois das suas obrigações",
      "Registre por voz ou escaneando uma nota fiscal",
      "Simule uma compra antes de fazê-la",
    ],
  },
  login: {
    title: "Entrar",
    subtitle: "Use a mesma conta do seu celular",
    email: "E-mail",
    emailPlaceholder: "ana@email.com",
    password: "Senha",
    forgot: "Esqueceu?",
    submit: "Entrar",
    submitting: "Entrando…",
    newHere: "Novo aqui?",
    createAccount: "Criar conta",
  },
  google: {
    divider: "ou continue com",
    demoButton: "Continuar com o Google",
    signingIn: "Entrando com o Google…",
    unavailable: "Não conseguimos abrir o Google. Tente de novo ou entre com seu e-mail.",
  },
  completeProfile: {
    title: "Complete seu perfil",
    subtitle: "Só falta seu nome para criar sua conta com o Google.",
    verified: (email: string) => `${email} verificado com o Google`,
    email: "E-mail",
    firstName: "Nome",
    lastName: "Sobrenome",
    terms: "Aceito os Termos e a Privacidade",
    submit: "Criar conta",
    submitting: "Criando sua conta…",
    expired: "Passou muito tempo desde que você entrou com o Google.",
    backToLogin: "Entrar de novo",
  },
  sessionExpired: "Sua sessão terminou. Entre de novo",
  logout: {
    action: "Sair",
    title: "Sair da conta?",
    body: "Para entrar de novo neste navegador você vai precisar da sua senha.",
    confirm: "Sair",
    cancel: "Cancelar",
  },
  errors: {
    invalid_credentials: "E-mail ou senha incorretos",
    too_many_requests: "Muitas tentativas. Espere um momento e tente de novo",
    email_not_verified: "Ainda não vemos seu e-mail verificado",
    network_error: "Sem conexão",
    invalid_provider_token: "O Google não confirmou sua conta. Tente de novo.",
    email_required: "Sua conta do Google não compartilha o e-mail. Entre com seu e-mail e senha.",
    email_taken: "Este e-mail já tem uma conta: entre com sua senha.",
    name_required: "Escreva seu nome e sobrenome",
    terms_required: "Aceite os Termos e a Privacidade para continuar",
    registration_expired: "Passou muito tempo desde que você entrou com o Google. Entre de novo.",
    unknown: "Algo deu errado. Tente de novo.",
  },
};

export const authMessagesByLocale = byLocale({ es, en, pt });

/** El texto de un `code` de la API, o el genérico si no tiene uno propio. */
export function authErrorText(code: string, locale: Locale = "es"): string {
  const errors = authMessagesByLocale[locale].errors;
  return errors[code] ?? errors.unknown ?? "";
}
