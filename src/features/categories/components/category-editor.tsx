"use client";

import { CATEGORY_ICONS, CategoryIcon } from "@/components/category-icon";
import { useActionState, useRef, useState } from "react";

import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { cx } from "@/lib/cx";
import { categoriesErrorText } from "@/lib/i18n/categories-messages";

import type { CategoryFormState } from "../categories-actions";
import type { Category } from "../data/categories-gateway";
import { CATEGORY_COLORS, defaultIcon, inkOn } from "../domain/category-style";

import { useMessages } from "@/lib/i18n/client";
type Action = (state: CategoryFormState, form: FormData) => Promise<CategoryFormState>;

function ErrorMessage({ code }: { code?: string }) {
  const i18n = useMessages();
  if (!code) return null;
  return (
    <p
      role="alert"
      className="bg-coral-soft text-coral-text rounded-2xl px-4 py-3 text-sm font-bold"
    >
      {categoriesErrorText(code, i18n.locale)}
    </p>
  );
}

const option = (on: boolean) =>
  cx(
    "focus-ring inline-flex h-10 items-center rounded-full px-4 text-sm font-bold",
    on
      ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
      : "bg-well text-ink-2",
  );

/**
 * "Editar categoría" o "Nueva categoría" (RF-16): nombre, color y, en las de
 * gasto, el grupo de Money Flow. Al editar, "Eliminar" pide confirmarlo (RF-17).
 */
export function CategoryEditor({
  category,
  type,
  save,
  remove,
}: {
  /** Sin ella, es una nueva del tipo `type`. */
  category?: Category;
  type: "income" | "expense";
  save: Action;
  remove: Action;
}) {
  const i18n = useMessages();
  const t = i18n.categories;
  const [state, submit, pending] = useActionState(save, {});
  const [color, setColor] = useState(category?.color.toUpperCase() ?? CATEGORY_COLORS[0]);
  const [group, setGroup] = useState(category?.money_flow_group ?? "needs");
  const [icon, setIcon] = useState(
    category && CATEGORY_ICONS.includes(category.icon) ? category.icon : defaultIcon(type),
  );

  return (
    <div className="flex flex-col gap-4">
      <form action={submit} className="flex flex-col gap-4" noValidate>
        <h2 className="text-[15px] font-extrabold">{category ? t.editTitle : t.newTitle}</h2>
        <input type="hidden" name="id" value={category?.id ?? ""} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="color" value={color} />
        <input type="hidden" name="group" value={group} />
        <input type="hidden" name="icon" value={icon} />
        <TextField label={t.name} name="name" defaultValue={category?.name ?? ""} maxLength={60} />
        <fieldset className="flex flex-col gap-2">
          <legend className="text-muted mb-1.5 text-xs font-semibold">{t.icon}</legend>
          <div role="radiogroup" aria-label={t.icon} className="flex flex-wrap gap-2">
            {CATEGORY_ICONS.map((name) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={name === icon}
                aria-label={t.iconOption(name)}
                onClick={() => setIcon(name)}
                className={cx(
                  "focus-ring grid size-10 place-items-center rounded-[12px] border-2",
                  name === icon ? "border-ink" : "bg-well border-transparent",
                )}
                style={name === icon ? { backgroundColor: color, color: inkOn(color) } : undefined}
              >
                <CategoryIcon name={name} className="size-5" />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-muted mb-1.5 text-xs font-semibold">{t.color}</legend>
          <div role="radiogroup" aria-label={t.color} className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                role="radio"
                aria-checked={hex === color}
                aria-label={t.colorOption(hex)}
                onClick={() => setColor(hex)}
                className={cx(
                  "focus-ring size-9 rounded-full border-[3px]",
                  hex === color ? "border-ink" : "border-transparent",
                )}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </fieldset>
        {type === "expense" && (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-muted mb-1.5 text-xs font-semibold">{t.group}</legend>
            <div role="radiogroup" aria-label={t.group} className="flex flex-wrap gap-2">
              {(["needs", "lifestyle"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={g === group}
                  onClick={() => setGroup(g)}
                  className={option(g === group)}
                >
                  {t.groups[g]}
                </button>
              ))}
            </div>
            <p className="text-muted text-xs">{t.groupHint}</p>
          </fieldset>
        )}
        <ErrorMessage code={state.error} />
        <Button type="submit" size="md" disabled={pending}>
          {pending ? t.saving : category ? t.save : t.create}
        </Button>
      </form>
      {category && <DeleteCategory category={category} action={remove} />}
    </div>
  );
}

/** RF-17: confirma en un diálogo nativo y avisa que los movimientos quedan "Sin categoría". */
function DeleteCategory({ category, action }: { category: Category; action: Action }) {
  const i18n = useMessages();
  const t = i18n.categories;
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, submit, pending] = useActionState(action, {});
  return (
    <>
      <Button
        variant="secondary"
        size="md"
        className="text-coral-text"
        onClick={() => dialog.current?.showModal()}
      >
        {t.remove}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="delete-category-title"
        className="glass text-ink m-auto w-[min(420px,calc(100%-32px))] rounded-[26px] p-6 backdrop:bg-black/40"
      >
        <form action={submit} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={category.id} />
          <input type="hidden" name="type" value={category.type} />
          <h2 id="delete-category-title" className="text-xl font-extrabold">
            {t.removeTitle(category.name)}
          </h2>
          <p className="text-muted text-sm">{t.removeBody}</p>
          <ErrorMessage code={state.error} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" size="md" onClick={() => dialog.current?.close()}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="danger" size="md" disabled={pending}>
              {t.removeConfirm}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
