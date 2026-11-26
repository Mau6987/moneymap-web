import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { ButtonLink } from "@/components/button";
import { GlassCard } from "@/components/glass-card";
import { Icon } from "@/components/icon";
import { MarkReadForm } from "@/features/notifications/components/notice-forms";
import {
  notificationsGateway,
  type InboxItem,
} from "@/features/notifications/data/notifications-gateway";
import { noticeHref, noticeIcon } from "@/features/notifications/domain/notices";
import { markAllRead } from "@/features/notifications/notifications-actions";
import { withAccessToken } from "@/lib/auth/session";
import { cx } from "@/lib/cx";
import { shortDate } from "@/lib/dates";

import { getMessages, useServerMessages } from "@/lib/i18n/server";
const PAGE = 30;

/**
 * Avisos (spec 006; mockup "Web-Avisos"): lo que la API mandó, del más nuevo
 * al más viejo. Cada uno abre su pantalla si la web la tiene. Los textos los
 * arma la API; la web no calcula nada.
 */
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ before?: string }>;
}) {
  const i18n = await getMessages();
  const t = i18n.notifications;
  const { before } = await searchParams;
  const valid = before && !Number.isNaN(Date.parse(before)) ? before : undefined;

  let inbox: Awaited<ReturnType<typeof load>> | null = null;
  try {
    inbox = await load(valid);
  } catch (error) {
    unstable_rethrow(error);
  }
  const last = inbox?.items.at(-1);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {inbox && (
            <p className="text-muted text-[13px] font-semibold" data-testid="inbox-unread">
              {inbox.unread > 0 ? t.unread(inbox.unread) : t.allRead}
            </p>
          )}
          <h1 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
            {t.title}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {inbox && inbox.unread > 0 && <MarkReadForm action={markAllRead} />}
          <ButtonLink href="/notifications/settings" variant="secondary" size="md">
            <Icon name="settings" className="size-4" />
            {t.settingsLink}
          </ButtonLink>
        </div>
      </header>
      {!inbox ? (
        <GlassCard role="alert">
          <h2 className="text-lg font-extrabold">{t.error}</h2>
          <ButtonLink href="/notifications" size="md" className="mt-4">
            {t.retry}
          </ButtonLink>
        </GlassCard>
      ) : inbox.items.length === 0 ? (
        <GlassCard data-testid="inbox-empty">
          <p className="text-muted text-center text-sm">{t.empty}</p>
        </GlassCard>
      ) : (
        <GlassCard className="!p-2">
          <ul data-testid="inbox" className="flex flex-col">
            {inbox.items.map((item) => (
              <li key={item.id}>
                <Notice item={item} />
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
      {(valid || (last && inbox && inbox.items.length === PAGE)) && (
        <nav aria-label={t.title} className="flex flex-wrap gap-2">
          {valid && (
            <ButtonLink href="/notifications" variant="secondary" size="md">
              {t.newest}
            </ButtonLink>
          )}
          {last && inbox?.items.length === PAGE && (
            <ButtonLink
              href={`/notifications?before=${encodeURIComponent(last.created_at)}`}
              variant="secondary"
              size="md"
            >
              {t.more}
            </ButtonLink>
          )}
        </nav>
      )}
    </>
  );
}

function Notice({ item }: { item: InboxItem }) {
  const i18n = useServerMessages();
  const t = i18n.notifications;
  const href = noticeHref(item);
  const unread = !item.read_at;
  const body = (
    <>
      <span
        aria-hidden="true"
        className="bg-primary-soft text-primary-text grid size-10 shrink-0 place-items-center rounded-[14px]"
      >
        <Icon name={noticeIcon(item.type)} className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className={cx("text-[15px]", unread ? "font-extrabold" : "font-semibold")}>
            {item.title}
          </span>
          <span className="text-muted shrink-0 text-xs font-semibold">
            {shortDate(item.created_at, i18n.locale)}
          </span>
        </span>
        <span className="text-muted mt-0.5 block text-sm">{item.body}</span>
      </span>
      {unread ? (
        <span className="bg-primary mt-2 size-2.5 shrink-0 rounded-full">
          <span className="sr-only">{t.unreadLabel}</span>
        </span>
      ) : (
        <span className="size-2.5 shrink-0" />
      )}
    </>
  );
  const classes = cx(
    "flex items-start gap-3 rounded-[20px] px-3 py-3",
    unread && "bg-[var(--mm-well)]",
  );
  return href ? (
    <Link href={href} className={cx("focus-ring", classes)} data-testid={`notice-${item.id}`}>
      {body}
    </Link>
  ) : (
    <div className={classes} data-testid={`notice-${item.id}`}>
      {body}
    </div>
  );
}

async function load(before: string | undefined) {
  return withAccessToken((token) =>
    notificationsGateway().inbox(token, { limit: PAGE, ...(before ? { before } : {}) }),
  );
}
