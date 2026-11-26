import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { ApiError, unwrap } from "@/lib/api/errors";
import type { components } from "@/lib/api/generated/schema";
import { isDemo } from "@/lib/demo";

type Schemas = components["schemas"];
export type Profile = Schemas["UserProfileRead"];
export type ProfileChange = Pick<
  Schemas["ProfileUpdate"],
  "first_name" | "last_name" | "display_name" | "city" | "occupation"
>;
export type Preferences = Schemas["PreferencesRead"];
export type PreferencesChange = Schemas["PreferencesUpdate"];
export type MoneySettings = Schemas["SettingsRead"];
export type Currency = Schemas["CurrencyRead"];

/**
 * Lo que "Ajustes" le pide a la API: el perfil, las preferencias, la moneda
 * principal, Mis monedas, el ahorro planificado y el pedido de borrar la
 * cuenta (spec 001 RF-10 a RF-17; spec 002 RF-13 y RF-14). Lanza `ApiError`.
 */
export interface SettingsGateway {
  profile(token: string): Promise<Profile>;
  updateProfile(token: string, change: ProfileChange): Promise<Profile>;
  preferences(token: string): Promise<Preferences>;
  updatePreferences(token: string, change: PreferencesChange): Promise<Preferences>;
  money(token: string): Promise<MoneySettings>;
  /** Solo la moneda principal o el ahorro planificado: el periodo no se toca aquí. */
  updateMoney(
    token: string,
    change: { main_currency?: string; planned_savings?: string },
  ): Promise<MoneySettings>;
  /** El catálogo, con Mis monedas primero. */
  currencies(token: string): Promise<Currency[]>;
  addCurrency(token: string, code: string): Promise<void>;
  /** 409 `currency_in_use` si es la principal o tiene cuentas activas. */
  removeCurrency(token: string, code: string): Promise<void>;
  /**
   * Con la contraseña; la cuenta se borra a los 30 días si no vuelve a entrar.
   * Una contraseña equivocada es 403 `reauthentication_failed`.
   */
  requestDeletion(token: string, password: string): Promise<void>;
}

const api = (accessToken: string) => createApiClient({ baseUrl: apiBaseUrl(), accessToken });

export const apiSettingsGateway: SettingsGateway = {
  profile: (token) => unwrap(api(token).GET("/v1/me")),
  updateProfile: (token, change) => unwrap(api(token).PATCH("/v1/me", { body: change })),
  preferences: (token) => unwrap(api(token).GET("/v1/me/preferences")),
  updatePreferences: (token, change) =>
    unwrap(api(token).PATCH("/v1/me/preferences", { body: change })),
  money: (token) => unwrap(api(token).GET("/v1/me/settings")),
  updateMoney: (token, change) => unwrap(api(token).PUT("/v1/me/settings", { body: change })),
  currencies: (token) => unwrap(api(token).GET("/v1/currencies")),
  addCurrency: async (token, code) => {
    await unwrap(api(token).PUT("/v1/me/currencies/{code}", { params: { path: { code } } }));
  },
  removeCurrency: async (token, code) => {
    await unwrap(api(token).DELETE("/v1/me/currencies/{code}", { params: { path: { code } } }));
  },
  requestDeletion: async (token, password) => {
    await unwrap(api(token).POST("/v1/me/deletion", { body: { password } }));
  },
};

/** El modo demo guarda los cambios en memoria mientras corre el servidor. */
const demo = {
  profile: {
    id: "demo-user",
    email: "ana@demo.com",
    first_name: "Ana",
    last_name: "López",
    display_name: "Ana López",
    avatar_object_key: null,
    country_code: "BO",
    city: "La Paz",
    occupation: "employee",
    locale: "es-BO",
    timezone: "America/La_Paz",
  } as Profile,
  preferences: {
    theme: "system",
    accent_color: "#3E4BD2",
    hide_amounts: false,
    week_starts_on: 1,
  } as Preferences,
  money: {
    main_currency: "BOB",
    period_type: "monthly",
    period_start_day: 1,
    planned_savings: "500.00",
  } as MoneySettings,
  /** Las monedas con cuentas activas no se quitan. */
  withAccounts: new Set(["BOB", "USD"]),
  currencies: [
    ["BOB", "Boliviano", "Bs", true],
    ["USD", "Dólar estadounidense", "$", true],
    ["EUR", "Euro", "€", false],
    ["ARS", "Peso argentino", "$", false],
    ["PEN", "Sol peruano", "S/", false],
  ].map(([code, name, symbol, mine]) => ({
    code,
    name,
    symbol,
    decimals: 2,
    is_active: true,
    is_mine: mine,
    is_main_currency: code === "BOB",
  })) as Currency[],
};

const demoCurrencies = () => {
  const main = demo.money.main_currency;
  const list = demo.currencies.map((c) => ({ ...c, is_main_currency: c.code === main }));
  return [...list.filter((c) => c.is_mine), ...list.filter((c) => !c.is_mine)];
};

export const demoSettingsGateway: SettingsGateway = {
  profile: async () => ({ ...demo.profile }),
  updateProfile: async (_, change) => {
    const display = change.display_name?.trim();
    demo.profile = {
      ...demo.profile,
      ...change,
      display_name: display || `${change.first_name ?? demo.profile.first_name}`,
    } as Profile;
    return { ...demo.profile };
  },
  preferences: async () => ({ ...demo.preferences }),
  updatePreferences: async (_, change) => {
    demo.preferences = {
      theme: change.theme ?? demo.preferences.theme,
      accent_color: change.accent_color ?? demo.preferences.accent_color,
      hide_amounts: change.hide_amounts ?? demo.preferences.hide_amounts,
      week_starts_on: change.week_starts_on ?? demo.preferences.week_starts_on,
    };
    return { ...demo.preferences };
  },
  money: async () => ({ ...demo.money }),
  updateMoney: async (_, change) => {
    const mine = demo.currencies.find((c) => c.code === change.main_currency);
    if (change.main_currency && !mine?.is_mine) throw new ApiError("currency_unavailable", 422);
    demo.money = { ...demo.money, ...change };
    return { ...demo.money };
  },
  currencies: async () => demoCurrencies(),
  addCurrency: async (_, code) => {
    const currency = demo.currencies.find((c) => c.code === code);
    if (!currency) throw new ApiError("currency_unavailable", 422);
    currency.is_mine = true;
  },
  removeCurrency: async (_, code) => {
    if (code === demo.money.main_currency || demo.withAccounts.has(code)) {
      throw new ApiError("currency_in_use", 409);
    }
    const currency = demo.currencies.find((c) => c.code === code);
    if (currency) currency.is_mine = false;
  },
  requestDeletion: async (_, password) => {
    if (password === "incorrecta") throw new ApiError("reauthentication_failed", 403);
  },
};

export function settingsGateway(): SettingsGateway {
  return isDemo() ? demoSettingsGateway : apiSettingsGateway;
}
