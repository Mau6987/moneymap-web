"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { errorCode } from "@/lib/api/errors";
import { withAccessToken } from "@/lib/auth/session";

import { categoriesGateway } from "./data/categories-gateway";
import { defaultIcon, isCategoryColor, isCategoryIcon } from "./domain/category-style";

export interface CategoryFormState {
  error?: string;
}

const MAX_NAME = 60;

/**
 * Crea o corrige una categoría (spec 007, RF-16): nombre, color y, si es de
 * gasto, su grupo. El tipo se elige al crearla. Con un error, el formulario
 * queda abierto con lo escrito.
 */
export async function saveCategory(
  _previous: CategoryFormState,
  form: FormData,
): Promise<CategoryFormState> {
  const id = String(form.get("id") ?? "");
  const type = form.get("type") === "income" ? "income" : "expense";
  const name = String(form.get("name") ?? "").trim();
  const color = String(form.get("color") ?? "").toUpperCase();
  const group = form.get("group") === "lifestyle" ? "lifestyle" : "needs";
  // Como la app: el ícono se elige; uno desconocido usa el de siempre.
  const picked = String(form.get("icon") ?? "");
  const icon = isCategoryIcon(picked) ? picked : null;

  if (!name) return { error: "name_required" };
  if (name.length > MAX_NAME || !isCategoryColor(color)) return { error: "validation_error" };
  const money_flow_group = type === "expense" ? group : null;

  let savedId = id;
  try {
    await withAccessToken(async (token) => {
      const gateway = categoriesGateway();
      if (id) {
        await gateway.update(token, id, {
          name,
          color,
          money_flow_group,
          // Sin uno elegido, la categoría conserva el que tenía.
          ...(icon ? { icon } : {}),
        });
      } else {
        const created = await gateway.create(token, {
          name,
          type,
          color,
          money_flow_group,
          icon: icon ?? defaultIcon(type),
        });
        savedId = created.id;
      }
    });
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect(`/categories?t=${type}&id=${savedId}&saved=${id ? "saved" : "created"}`);
}

/** RF-17: borra la categoría; sus movimientos quedan "Sin categoría". */
export async function deleteCategory(
  _previous: CategoryFormState,
  form: FormData,
): Promise<CategoryFormState> {
  const id = String(form.get("id") ?? "");
  const type = form.get("type") === "income" ? "income" : "expense";
  if (!id) return { error: "validation_error" };
  try {
    await withAccessToken((token) => categoriesGateway().remove(token, id));
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect(`/categories?t=${type}&saved=removed`);
}
