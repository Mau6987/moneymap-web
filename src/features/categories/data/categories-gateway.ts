import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { ApiError, unwrap } from "@/lib/api/errors";
import type { components } from "@/lib/api/generated/schema";
import { isDemo } from "@/lib/demo";
import { apiTextLocale } from "@/lib/i18n/server";
import { withCategoryNames } from "@/lib/i18n/api-texts";

type Schemas = components["schemas"];
export type Category = Schemas["CategoryRead"];
export type NewCategory = Schemas["CategoryCreate"];
export type CategoryChange = Schemas["CategoryUpdate"];

/**
 * Las categorías del usuario (spec 007, RF-13 a RF-17). Lanza `ApiError`:
 * `category_name_taken`, `category_type_in_use` o `category_in_use`.
 */
export interface CategoriesGateway {
  list(token: string): Promise<Category[]>;
  create(token: string, category: NewCategory): Promise<Category>;
  update(token: string, id: string, change: CategoryChange): Promise<Category>;
  /** Sus movimientos quedan "Sin categoría" (RF-17). */
  remove(token: string, id: string): Promise<void>;
}

const api = (accessToken: string) => createApiClient({ baseUrl: apiBaseUrl(), accessToken });

export const apiCategoriesGateway: CategoriesGateway = {
  list: (token) => unwrap(api(token).GET("/v1/categories")),
  create: (token, category) => unwrap(api(token).POST("/v1/categories", { body: category })),
  update: (token, id, change) =>
    unwrap(
      api(token).PATCH("/v1/categories/{category_id}", {
        params: { path: { category_id: id } },
        body: change,
      }),
    ),
  remove: async (token, id) => {
    await unwrap(
      api(token).DELETE("/v1/categories/{category_id}", {
        params: { path: { category_id: id } },
      }),
    );
  },
};

const row = (
  id: string,
  name: string,
  type: "income" | "expense",
  group: "needs" | "lifestyle" | null,
  icon: string,
  color: string,
): Category => ({ id, name, type, money_flow_group: group, icon, color, template_key: null });

/** El modo demo guarda los cambios en memoria mientras corre el servidor. */
const demo: { categories: Category[]; next: number } = {
  categories: [
    row("c-food", "Comida", "expense", "needs", "restaurant", "#D25A42"),
    row("c-home", "Vivienda", "expense", "needs", "home", "#3E4BD2"),
    row("c-transport", "Transporte", "expense", "needs", "directions_bus", "#2E8A62"),
    row("c-health", "Salud", "expense", "needs", "medical_services", "#0E7C86"),
    row("c-subs", "Suscripciones", "expense", "lifestyle", "subscriptions", "#7C3AED"),
    row("c-out", "Salidas", "expense", "lifestyle", "movie", "#E2A93C"),
    row("c-salary", "Salario", "income", null, "payments", "#2E8A62"),
    row("c-freelance", "Trabajo independiente", "income", null, "work", "#0E7C86"),
  ],
  next: 1,
};

/** Un recurrente usa Suscripciones: no se borra, como en la API. */
const IN_USE = new Set(["c-subs"]);

const taken = (name: string, except?: string) =>
  demo.categories.some((c) => c.id !== except && c.name.toLowerCase() === name.toLowerCase());

export const demoCategoriesGateway: CategoriesGateway = {
  list: async () => demo.categories.map((c) => ({ ...c })),
  create: async (_, category) => {
    if (taken(category.name)) throw new ApiError("category_name_taken", 409);
    const created = row(
      `c-new-${demo.next++}`,
      category.name,
      category.type,
      category.type === "expense" ? (category.money_flow_group ?? "needs") : null,
      category.icon,
      category.color,
    );
    demo.categories.push(created);
    return { ...created };
  },
  update: async (_, id, change) => {
    const current = demo.categories.find((c) => c.id === id);
    if (!current) throw new ApiError("not_found", 404);
    if (change.name && taken(change.name, id)) throw new ApiError("category_name_taken", 409);
    Object.assign(current, Object.fromEntries(Object.entries(change).filter(([, v]) => v != null)));
    return { ...current };
  },
  remove: async (_, id) => {
    if (IN_USE.has(id)) throw new ApiError("category_in_use", 409);
    demo.categories = demo.categories.filter((c) => c.id !== id);
  },
};

export function categoriesGateway(): CategoriesGateway {
  const gateway = isDemo() ? demoCategoriesGateway : apiCategoriesGateway;
  // MM-191: las categorías iniciales se muestran en el idioma elegido.
  return {
    ...gateway,
    list: async (token) => withCategoryNames(await gateway.list(token), await apiTextLocale()),
  };
}
