"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon } from "@/components/icon";
import { cx } from "@/lib/cx";

/** Un tipo de cuenta ya armado en el servidor, con sus montos escritos. */
export interface AccountKind {
  isCard: boolean;
  title: string;
  balance: string;
  zero: boolean;
  subtitle: string;
  more: string | null;
  others: { id: string; name: string; badge: string; detail: string; balance: string }[];
}

/** Las tarjetas de Efectivo y Tarjeta; con más de una cuenta, un toque despliega las otras. */
export function AccountsTiles({
  kinds,
  label,
  seeAll,
}: {
  kinds: AccountKind[];
  label: string;
  seeAll: string;
}) {
  const [open, setOpen] = useState<boolean | null>(null);
  const others = kinds.find((k) => k.isCard === open)?.others ?? [];
  return (
    <section aria-label={label} data-testid="map-accounts" className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        {kinds.map((kind) => {
          const tint = kind.isCard ? "text-primary-text" : "text-green-text";
          const content = (
            <>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cx(
                    "grid size-8 place-items-center rounded-[11px]",
                    kind.isCard ? "bg-primary-soft" : "bg-green-soft",
                    tint,
                  )}
                >
                  <Icon name={kind.isCard ? "accounts" : "cash"} className="size-4" />
                </span>
                <span className="flex-1 text-sm font-extrabold">{kind.title}</span>
                {kind.others.length > 0 && (
                  <span
                    aria-hidden="true"
                    className={cx(
                      "text-muted transition-transform",
                      open === kind.isCard && "rotate-180",
                    )}
                  >
                    <Icon name="expand" className="size-5" />
                  </span>
                )}
              </span>
              <span
                className={cx(
                  "mt-2.5 block truncate text-lg font-extrabold tabular-nums",
                  kind.zero && "text-muted",
                )}
              >
                {kind.balance}
              </span>
              <span className="text-muted block truncate text-xs font-semibold">
                {kind.subtitle}
              </span>
              {kind.more && (
                <span className={cx("mt-1.5 block text-[11px] font-extrabold", tint)}>
                  {kind.more}
                </span>
              )}
            </>
          );
          const tile = "glass block min-w-0 rounded-3xl p-3.5 text-left";
          return kind.others.length === 0 ? (
            <div
              key={String(kind.isCard)}
              className={tile}
              data-testid={kind.isCard ? "map-accounts-card" : "map-accounts-cash"}
            >
              {content}
            </div>
          ) : (
            <button
              key={String(kind.isCard)}
              type="button"
              aria-expanded={open === kind.isCard}
              onClick={() => setOpen(open === kind.isCard ? null : kind.isCard)}
              className={cx(
                tile,
                "focus-ring",
                open === kind.isCard &&
                  (kind.isCard ? "ring-primary/60 ring-2" : "ring-green/60 ring-2"),
              )}
              data-testid={kind.isCard ? "map-accounts-card" : "map-accounts-cash"}
            >
              {content}
            </button>
          );
        })}
      </div>
      {others.length > 0 && (
        <div className="glass rounded-3xl px-4 py-1" data-testid="map-accounts-more">
          <ul>
            {others.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 border-b border-[var(--mm-line)] py-2.5 text-sm"
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    "grid size-9 shrink-0 place-items-center rounded-xl text-[10px] font-extrabold",
                    open ? "bg-primary-soft text-primary-text" : "bg-green-soft text-green-text",
                  )}
                >
                  {open ? a.badge : <Icon name="cash" className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{a.name}</span>
                  <span className="text-muted block truncate text-xs font-semibold">
                    {a.detail}
                  </span>
                </span>
                <span className="font-extrabold tabular-nums">{a.balance}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end py-1.5">
            <Link
              href="/accounts"
              className="focus-ring text-primary-text rounded-full text-xs font-bold"
            >
              {seeAll}
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
