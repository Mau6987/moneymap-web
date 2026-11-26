import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { ApiError, unwrap } from "@/lib/api/errors";
import type { components } from "@/lib/api/generated/schema";
import { isDemo } from "@/lib/demo";
import { apiTextLocale } from "@/lib/i18n/server";
import { noticeText } from "@/lib/i18n/api-texts";

type Schemas = components["schemas"];
export type Inbox = Schemas["InboxRead"];
export type InboxItem = Schemas["InboxItemRead"];
export type NoticeSetting = Schemas["NotificationSettingRead"];

/** Los avisos recibidos y sus ajustes (spec 006, RF-11 y RF-12). Lanza `ApiError`. */
export interface NotificationsGateway {
  /** Del más nuevo al más viejo; `before` es el `created_at` del último de la página anterior. */
  inbox(token: string, options?: { before?: string; limit?: number }): Promise<Inbox>;
  markAllRead(token: string): Promise<void>;
  settings(token: string): Promise<NoticeSetting[]>;
  /** Solo el tipo enviado; uno que no se puede apagar es 422. */
  setEnabled(token: string, type: string, enabled: boolean): Promise<NoticeSetting[]>;
}

const api = (accessToken: string) => createApiClient({ baseUrl: apiBaseUrl(), accessToken });

export const apiNotificationsGateway: NotificationsGateway = {
  inbox: (token, options = {}) =>
    unwrap(api(token).GET("/v1/me/notifications", { params: { query: options } })),
  markAllRead: async (token) => {
    await unwrap(api(token).POST("/v1/me/notifications/read"));
  },
  settings: async (token) => (await unwrap(api(token).GET("/v1/me/notification-settings"))).items,
  setEnabled: async (token, type, enabled) =>
    (
      await unwrap(
        api(token).PUT("/v1/me/notification-settings", { body: { items: [{ type, enabled }] } }),
      )
    ).items,
};

const daysAgo = (days: number, hour = 9) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour + 4, 0, 0, 0);
  return d.toISOString();
};

/** El modo demo guarda los cambios en memoria mientras corre el servidor. */
const demo = {
  read: false,
  items: (): InboxItem[] => [
    {
      id: "n1",
      type: "budget.threshold",
      title: "Comida llegó al 80 %",
      body: "Llevas Bs 2.480 de Bs 3.100 y faltan 8 días.",
      data: { screen: "budgets", budget_id: "b1" },
      created_at: daysAgo(0, 11),
      read_at: demo.read ? daysAgo(0, 12) : null,
    },
    {
      id: "n2",
      type: "goal.milestone",
      title: "Fondo de emergencia va por la mitad",
      body: "Ya juntaste Bs 2.500 de Bs 5.000.",
      data: { screen: "goal", goal_id: "g1" },
      created_at: daysAgo(2),
      read_at: demo.read ? daysAgo(1) : null,
    },
    {
      id: "n3",
      type: "money_story.ready",
      title: "Tu Money Story de septiembre está lista",
      body: "Mira cómo te fue el mes pasado.",
      data: { screen: "money_story", period: "2026-09" },
      created_at: daysAgo(22),
      read_at: daysAgo(21),
    },
    {
      id: "n4",
      type: "recurring.due_soon",
      title: "Netflix vence en 3 días",
      body: "Bs 70 desde tu cuenta Banco Unión.",
      data: { screen: "recurring", due_on: "2026-10-01" },
      created_at: daysAgo(25),
      read_at: daysAgo(24),
    },
  ],
  settings: [
    ["money_story.ready", "Cuando tu Money Story del mes está lista", true, true],
    ["recurring.due_soon", "Tres días antes de un pago fijo", true, true],
    ["goal.milestone", "Al llegar al 25, 50 y 75 % de una meta", true, true],
    ["goal.achieved", "Cuando cumples una meta", true, true],
    ["budget.threshold", "Cuando un presupuesto llega al 80 %", true, true],
    ["budget.exceeded", "Cuando un presupuesto se pasa", false, true],
    ["security.new_login", "Un inicio de sesión desde otro dispositivo", true, false],
  ].map(([type, description, enabled, can_disable]) => ({
    type,
    description,
    enabled,
    can_disable,
  })) as NoticeSetting[],
};

export const demoNotificationsGateway: NotificationsGateway = {
  inbox: async () => {
    const items = demo.items();
    return { items, unread: items.filter((i) => !i.read_at).length };
  },
  markAllRead: async () => {
    demo.read = true;
  },
  settings: async () => demo.settings.map((s) => ({ ...s })),
  setEnabled: async (_, type, enabled) => {
    const setting = demo.settings.find((s) => s.type === type);
    if (!setting || !setting.can_disable) throw new ApiError("validation_error", 422);
    setting.enabled = enabled;
    return demo.settings.map((s) => ({ ...s }));
  },
};

export function notificationsGateway(): NotificationsGateway {
  const gateway = isDemo() ? demoNotificationsGateway : apiNotificationsGateway;
  // MM-191: los avisos llegan en español; se muestran en el idioma elegido.
  return {
    ...gateway,
    inbox: async (token, options) => {
      const [inbox, locale] = await Promise.all([gateway.inbox(token, options), apiTextLocale()]);
      return {
        ...inbox,
        items: inbox.items.map((item) => ({ ...item, ...noticeText(item.type, item, locale) })),
      };
    },
  };
}
