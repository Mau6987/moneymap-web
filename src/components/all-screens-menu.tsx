"use client";

import Link from "next/link";
import { useRef } from "react";

import { LogoutButton } from "@/features/auth/components/logout-button";
import { logout } from "@/features/auth/logout-action";
import { cx } from "@/lib/cx";
import type { Messages } from "@/lib/i18n/catalog";
import { useMessages } from "@/lib/i18n/client";

import { Icon, type IconName } from "./icon";

interface Screen {
  href: string;
  label: string;
  icon: IconName;
}

/** MM-190: el grupo que solo ve el administrador. */
export const adminScreens = (
  t: Messages["common"]["nav"],
): readonly { title: string; screens: readonly Screen[] }[] => [
  { title: t.groups.admin, screens: [{ href: "/admin", label: t.adminPlans, icon: "lock" }] },
];

/** Todas las pantallas, agrupadas como el menú de la app (MM-156). */
export const allScreens = (
  t: Messages["common"]["nav"],
): readonly { title: string; screens: readonly Screen[] }[] => [
  {
    title: t.groups.daily,
    screens: [
      { href: "/map", label: t.map, icon: "map" },
      { href: "/transactions", label: t.transactions, icon: "transactions" },
      { href: "/add", label: t.add, icon: "plus" },
      { href: "/transfer", label: t.transfer, icon: "transfer" },
      { href: "/notifications", label: t.notifications, icon: "bell" },
    ],
  },
  {
    title: t.groups.plan,
    screens: [
      { href: "/safe-to-spend", label: t.safeToSpend, icon: "safe" },
      { href: "/forecast", label: t.forecast, icon: "reports" },
      { href: "/goals", label: t.goals, icon: "goals" },
      { href: "/budgets", label: t.budgets, icon: "budgets" },
      { href: "/recurring/income", label: t.recurringIncome, icon: "transfer" },
      { href: "/recurring/expenses", label: t.recurringExpenses, icon: "accounts" },
      { href: "/scenarios", label: t.scenarios, icon: "scenarios" },
    ],
  },
  {
    title: t.groups.reports,
    screens: [
      { href: "/money-flow", label: t.moneyFlow, icon: "flow" },
      { href: "/money-story", label: t.moneyStory, icon: "reports" },
    ],
  },
  {
    title: t.groups.account,
    screens: [
      { href: "/accounts", label: t.accounts, icon: "accounts" },
      { href: "/categories", label: t.categories, icon: "categories" },
      { href: "/plans", label: t.plans, icon: "plans" },
      { href: "/settings", label: t.settings, icon: "settings" },
    ],
  },
];

/**
 * El botón que abre todas las pantallas (MM-175). En el teléfono la barra
 * inferior solo tiene cinco lugares, así que el resto se llega desde aquí.
 * Es un `<dialog>`: Escape lo cierra y el foco vuelve al botón.
 */
export function AllScreensMenu({
  isCurrent,
  className,
  showLabel = false,
  admin = false,
}: {
  isCurrent: (href: string) => boolean;
  className?: string;
  showLabel?: boolean;
  /** MM-190: suma el grupo de administración, solo para el administrador. */
  admin?: boolean;
}) {
  const i18n = useMessages();
  const t = i18n.common.nav;
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={showLabel ? undefined : t.allScreens}
        onClick={() => dialog.current?.showModal()}
        className={className}
      >
        <Icon name={showLabel ? "grid" : "menu"} />
        {showLabel && <span className="md:max-xl:sr-only">{t.allScreens}</span>}
      </button>
      <dialog
        ref={dialog}
        aria-label={t.allScreens}
        onClick={(event) => event.target === dialog.current && close()}
        className="glass text-ink m-auto w-[min(560px,calc(100vw-32px))] rounded-[28px] p-0 backdrop:bg-[rgb(21_25_54/0.45)] backdrop:backdrop-blur-sm max-md:mt-auto max-md:mb-4"
      >
        <div className="flex max-h-[85dvh] flex-col">
          {/* El título y la X quedan fijos; lo que se desplaza es la lista (MM-181). */}
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-1">
            <h2 className="text-lg font-extrabold">{t.allScreens}</h2>
            <button
              type="button"
              onClick={close}
              aria-label={t.closeMenu}
              className="focus-ring bg-well grid size-10 place-items-center rounded-full"
            >
              <Icon name="close" className="size-[18px]" />
            </button>
          </div>
          <div className="overflow-y-auto overscroll-contain px-5 pb-5">
            {[...allScreens(t), ...(admin ? adminScreens(t) : [])].map((group) => (
              <section key={group.title} className="mt-3">
                <h3 className="text-muted px-1 text-xs font-bold tracking-wide uppercase">
                  {group.title}
                </h3>
                <ul className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
                  {group.screens.map((screen) => (
                    <li key={screen.href}>
                      <Link
                        href={screen.href}
                        onClick={close}
                        aria-current={isCurrent(screen.href) ? "page" : undefined}
                        className={cx(
                          "focus-ring flex min-h-12 items-center gap-2 rounded-[16px] px-3 py-2 text-[13px] leading-tight font-bold sm:min-h-14 sm:gap-2.5 sm:rounded-[18px] sm:text-sm",
                          isCurrent(screen.href)
                            ? "bg-primary-soft text-primary-text"
                            : "bg-well text-ink-2",
                        )}
                      >
                        <Icon name={screen.icon} className="size-[18px] shrink-0" />
                        <span className="min-w-0">{screen.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {/* En el teléfono es el menú principal: cerrar sesión va al final. */}
            <LogoutButton
              action={logout}
              className="focus-ring bg-well text-coral-text mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] px-3 text-sm font-bold sm:min-h-14 sm:rounded-[18px]"
            />
          </div>
        </div>
      </dialog>
    </>
  );
}
