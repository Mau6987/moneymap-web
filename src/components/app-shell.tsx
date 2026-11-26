"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { LogoutButton } from "@/features/auth/components/logout-button";
import { logout } from "@/features/auth/logout-action";
import { cx } from "@/lib/cx";
import type { Messages } from "@/lib/i18n/catalog";
import { useMessages } from "@/lib/i18n/client";

import { AllScreensMenu } from "./all-screens-menu";
import { Logo } from "./auth-shell";
import { Icon, type IconName } from "./icon";

type Nav = Messages["common"]["nav"];

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Se oculta en la barra inferior del teléfono, que solo tiene cinco lugares. */
  desktopOnly?: boolean;
}

const primary = (t: Nav): readonly NavItem[] => [
  { href: "/map", label: t.map, icon: "map" },
  { href: "/transactions", label: t.transactions, icon: "transactions" },
  { href: "/goals", label: t.goals, icon: "goals" },
  { href: "/scenarios", label: t.scenarios, icon: "scenarios" },
  { href: "/money-story", label: t.reports, icon: "reports", desktopOnly: true },
];

const secondary = (t: Nav): readonly NavItem[] => [
  { href: "/accounts", label: t.accounts, icon: "accounts", desktopOnly: true },
  { href: "/categories", label: t.categories, icon: "categories", desktopOnly: true },
  { href: "/settings", label: t.settings, icon: "settings", desktopOnly: true },
];

function NavLink({ item, current }: { item: NavItem; current: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      // En tablet solo se ve el ícono: el nombre aparece al pasar el mouse.
      title={item.label}
      className={cx(
        "focus-ring flex shrink-0 items-center rounded-[14px] text-sm font-bold",
        "max-md:h-14 max-md:w-16 max-md:flex-col max-md:justify-center max-md:gap-1 max-md:rounded-[28px] max-md:text-[10px]",
        "md:h-11 md:w-[52px] md:justify-center xl:w-auto xl:justify-start xl:gap-3 xl:px-3.5",
        item.desktopOnly && "max-md:hidden",
        current
          ? "bg-[rgb(21_25_54/0.9)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] dark:bg-white/90 dark:text-[#151936]"
          : "text-ink-2",
      )}
    >
      <Icon name={item.icon} />
      <span className="md:max-xl:sr-only">{item.label}</span>
    </Link>
  );
}

interface AppShellProps {
  user: { initials: string; name: string; detail: string };
  /** MM-190: el administrador ve el panel de planes en "Todas las pantallas". */
  isAdmin?: boolean;
  children: ReactNode;
}

/**
 * Marco de las pantallas con sesión (mockup W01): menú lateral en escritorio,
 * riel de íconos en tablet y barra inferior con el botón de registrar en el teléfono.
 * "Todas las pantallas" abre el resto, en la barra lateral y arriba en el teléfono.
 */
export function AppShell({ user, isAdmin = false, children }: AppShellProps) {
  const i18n = useMessages();
  const t = i18n.common.nav;
  const pathname = usePathname();
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-dvh gap-4 p-4 max-md:pb-28 md:gap-6 md:p-6">
      <nav
        aria-label={t.menu}
        className={cx(
          "glass z-10 flex gap-1",
          "max-md:fixed max-md:inset-x-3.5 max-md:bottom-5 max-md:h-[72px] max-md:items-center max-md:justify-between max-md:rounded-[36px] max-md:px-2",
          "md:sticky md:top-6 md:h-[calc(100dvh-48px)] md:w-[78px] md:shrink-0 md:flex-col md:items-center md:rounded-[30px] md:px-2.5 md:py-5",
          "xl:w-[240px] xl:items-stretch xl:px-3.5",
        )}
      >
        <div className="px-2 pb-4 max-md:hidden max-xl:[&_span:last-child]:hidden">
          <Logo />
        </div>
        {/*
          Lo que más se usa va arriba y siempre a la vista, no en una esquina de
          cada pantalla: registrar y transferir. En el teléfono, registrar es el
          botón del centro de la barra.
        */}
        <Link
          href="/add"
          aria-label={t.add}
          title={t.add}
          data-testid="shell-add"
          className={cx(
            "focus-ring bg-primary flex shrink-0 items-center justify-center rounded-full font-bold text-white max-md:hidden",
            "shadow-[0_10px_22px_-10px_rgb(62_75_210/0.6)]",
            "md:size-[52px] xl:h-12 xl:w-auto xl:gap-2.5 xl:px-4 xl:text-sm",
          )}
        >
          <Icon name="plus" className="size-[22px]" />
          <span className="md:max-xl:sr-only">{t.add}</span>
        </Link>
        {/*
          BUG-062: en una pantalla baja, solo la lista del medio hace scroll; el
          logo y Registrar quedan arriba, Cerrar sesión y el perfil abajo, siempre
          a la vista. En el teléfono no existe (contents): es la barra de abajo.
        */}
        <div
          data-testid="shell-links"
          className="max-md:contents md:flex md:min-h-0 md:flex-1 md:[scrollbar-width:thin] md:flex-col md:items-center md:gap-1 md:overflow-y-auto xl:items-stretch"
        >
          <NavLink
            item={{ href: "/transfer", label: t.transfer, icon: "transfer", desktopOnly: true }}
            current={isCurrent("/transfer")}
          />
          <div className="bg-line mx-2 my-2 h-px max-md:hidden md:w-10 xl:w-auto" />
          {primary(t)
            .slice(0, 2)
            .map((item) => (
              <NavLink key={item.href} item={item} current={isCurrent(item.href)} />
            ))}
          <Link
            href="/add"
            aria-label={t.add}
            className="focus-ring bg-primary grid size-[58px] shrink-0 place-items-center rounded-full text-white md:hidden"
          >
            <Icon name="plus" className="size-[26px]" />
          </Link>
          {primary(t)
            .slice(2)
            .map((item) => (
              <NavLink key={item.href} item={item} current={isCurrent(item.href)} />
            ))}
          <div className="bg-line mx-2 my-3 h-px max-md:hidden md:w-10 xl:w-auto" />
          {secondary(t).map((item) => (
            <NavLink key={item.href} item={item} current={isCurrent(item.href)} />
          ))}
          <AllScreensMenu
            isCurrent={isCurrent}
            admin={isAdmin}
            showLabel
            className={cx(
              "focus-ring text-ink-2 flex shrink-0 items-center rounded-[14px] text-sm font-bold max-md:hidden",
              "md:h-11 md:w-[52px] md:justify-center xl:w-auto xl:justify-start xl:gap-3 xl:px-3.5",
            )}
          />
        </div>
        {/* Cerrar sesión, a mano en el menú y no escondido en Ajustes. */}
        <div className="shrink-0 pt-2 max-md:hidden">
          <LogoutButton
            action={logout}
            className={cx(
              "focus-ring text-coral-text flex shrink-0 items-center rounded-[14px] text-sm font-bold",
              "md:h-11 md:w-[52px] md:justify-center xl:w-full xl:justify-start xl:gap-3 xl:px-3.5",
            )}
            labelClassName="md:max-xl:sr-only"
          />
        </div>
        <div className="bg-well mt-1.5 flex shrink-0 items-center gap-2.5 rounded-[18px] p-3 max-xl:p-1.5 max-md:hidden">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-[#fde3da] text-[13px] font-extrabold text-[#8a2e1e]"
          >
            {user.initials}
          </span>
          <span className="min-w-0 flex-1 max-xl:sr-only">
            <b className="block truncate text-[13px]">{user.name}</b>
            <span className="text-muted block truncate text-[11px] font-semibold">
              {user.detail}
            </span>
          </span>
        </div>
      </nav>
      {/*
        En pantallas anchas el contenido tiene un ancho máximo y queda centrado
        en el espacio que deja el menú, que sigue pegado a la izquierda: así no
        se estira de borde a borde.
      */}
      <main className="mx-auto flex w-full max-w-[1200px] min-w-0 flex-1 flex-col gap-4 md:gap-5">
        {/*
          En el teléfono: el logo y el menú con todas las pantallas (MM-175).
          Queda fija arriba al hacer scroll, con vidrio detrás (MM-185).
        */}
        <div className="sticky top-0 z-20 -mx-4 -mt-4 flex items-center justify-between gap-2 bg-[color-mix(in_srgb,var(--mm-bg)_72%,transparent)] px-4 pt-4 pb-3 backdrop-blur-xl md:hidden">
          <Logo />
          <AllScreensMenu
            isCurrent={isCurrent}
            admin={isAdmin}
            className="focus-ring glass grid size-11 place-items-center rounded-full"
          />
        </div>
        {children}
      </main>
    </div>
  );
}
