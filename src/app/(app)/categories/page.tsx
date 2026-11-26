import { CategoryIcon } from "@/components/category-icon";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { ButtonLink } from "@/components/button";
import { GlassCard } from "@/components/glass-card";
import { Icon } from "@/components/icon";
import { Toast } from "@/components/toast";
import { deleteCategory, saveCategory } from "@/features/categories/categories-actions";
import { CategoryEditor } from "@/features/categories/components/category-editor";
import { categoriesGateway, type Category } from "@/features/categories/data/categories-gateway";
import { inkOn } from "@/features/categories/domain/category-style";
import { withAccessToken } from "@/lib/auth/session";
import { cx } from "@/lib/cx";

import type { Messages } from "@/lib/i18n/catalog";
import { getMessages } from "@/lib/i18n/server";
type Kind = "expense" | "income";

const SAVED = (t: Messages["categories"]): Record<string, string> => ({
  saved: t.saved,
  created: t.created,
  removed: t.removed,
});

/** Los gastos en Necesidades y Estilo de vida (RF-13); los ingresos, juntos. */
function groupsOf(categories: Category[], kind: Kind) {
  const ofKind = categories.filter((c) => c.type === kind);
  if (kind === "income") return [{ key: "income", items: ofKind }];
  return (["needs", "lifestyle"] as const).map((key) => ({
    key,
    items: ofKind.filter((c) => (c.money_flow_group ?? "needs") === key),
  }));
}

/**
 * Categorías (mockup "Web-Categorias"; spec 007, RF-13 a RF-17): gastos e
 * ingresos por separado y, al lado, la categoría elegida para editarla o una
 * nueva. Sin API todavía: la regla automática por comercio y el conteo de
 * movimientos del mockup.
 */
export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; id?: string; saved?: string }>;
}) {
  const i18n = await getMessages();
  const t = i18n.categories;
  const params = await searchParams;
  const kind: Kind = params.t === "income" ? "income" : "expense";

  let categories: Category[] | null = null;
  try {
    categories = await withAccessToken((token) => categoriesGateway().list(token));
  } catch (error) {
    unstable_rethrow(error);
  }

  const selected = categories?.find((c) => c.id === params.id && c.type === kind);
  const isNew = params.id === "new";
  const saved = params.saved ? SAVED(t)[params.saved] : undefined;
  // Con `#category-editor`: en el teléfono el editor queda debajo de la lista.
  const href = (id: string) => `/categories?t=${kind}&id=${id}#category-editor`;

  return (
    <>
      {saved && <Toast>{saved}</Toast>}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted text-[13px] font-semibold">{t.eyebrow}</p>
          <h1 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
            {t.title}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <nav aria-label={t.kindLabel} className="bg-well flex rounded-full p-1">
            {(["expense", "income"] as const).map((k) => (
              <Link
                key={k}
                href={`/categories?t=${k}`}
                aria-current={k === kind ? "page" : undefined}
                className={cx(
                  "focus-ring inline-flex h-9 items-center rounded-full px-4 text-[13px] font-bold",
                  k === kind
                    ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
                    : "text-ink-2",
                )}
              >
                {t.kinds[k]}
              </Link>
            ))}
          </nav>
          <ButtonLink href={href("new")} size="md" aria-label={t.addLabel}>
            <Icon name="plus" className="size-4" />
            {t.add}
          </ButtonLink>
        </div>
      </header>
      {!categories ? (
        <GlassCard role="alert">
          <h2 className="text-lg font-extrabold">{t.error}</h2>
          <ButtonLink href="/categories" size="md" className="mt-4">
            {t.retry}
          </ButtonLink>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-4">
            {groupsOf(categories, kind).map((group) => (
              <GlassCard key={group.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-[15px] font-extrabold">{t.groups[group.key]}</h2>
                  <span className="text-muted text-xs font-semibold">
                    {t.count(group.items.length)}
                  </span>
                </div>
                {group.items.length === 0 ? (
                  <p className="text-muted mt-3 text-sm">{t.empty}</p>
                ) : (
                  <ul className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                    {group.items.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={href(c.id)}
                          aria-current={c.id === selected?.id ? "true" : undefined}
                          className={cx(
                            "focus-ring flex items-center gap-2.5 rounded-[18px] p-2.5",
                            c.id === selected?.id ? "bg-primary-soft" : "bg-well",
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className="grid size-9 shrink-0 place-items-center rounded-[12px] text-sm font-extrabold"
                            style={{ backgroundColor: c.color, color: inkOn(c.color) }}
                          >
                            <CategoryIcon name={c.icon} className="size-[18px]" />
                          </span>
                          <span className="min-w-0 truncate text-sm font-bold">{c.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </GlassCard>
            ))}
          </div>
          <GlassCard id="category-editor" className="scroll-mt-4">
            {selected || isNew ? (
              <CategoryEditor
                key={selected?.id ?? `new-${kind}`}
                category={selected}
                type={kind}
                save={saveCategory}
                remove={deleteCategory}
              />
            ) : (
              <p className="text-muted text-sm">{t.pick}</p>
            )}
          </GlassCard>
        </div>
      )}
    </>
  );
}
