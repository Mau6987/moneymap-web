"use client";

import type { ReactNode } from "react";

import { Icon, type IconName } from "./icon";

import { useMessages } from "@/lib/i18n/client";
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const i18n = useMessages();
  const messages = i18n.common;
  const box =
    size === "lg"
      ? "size-[46px] rounded-[15px] bg-white/15"
      : "bg-primary size-10 rounded-[13px] text-white";
  return (
    <div className="flex items-center gap-2.5">
      <span className={`grid place-items-center ${box}`}>
        <Icon name="pin" className={size === "lg" ? "size-6" : "size-5"} />
      </span>
      <span
        className={`font-extrabold tracking-[-0.03em] ${size === "lg" ? "text-2xl" : "text-[21px]"}`}
      >
        {messages.appName}
      </span>
    </div>
  );
}

interface AuthShellProps {
  title: ReactNode;
  subtitle: string;
  points?: readonly { icon: IconName; text: string }[];
  children: ReactNode;
}

/**
 * La pantalla partida del acceso (mockups W02 y W03): a la izquierda el panel
 * índigo con la promesa, a la derecha el formulario de vidrio. En una ventana
 * angosta los dos se apilan.
 */
export function AuthShell({ title, subtitle, points = [], children }: AuthShellProps) {
  return (
    <div className="flex min-h-dvh flex-wrap items-stretch gap-4 p-4 sm:gap-6 sm:p-6">
      <section className="bg-primary flex min-w-0 flex-[1_1_420px] flex-col rounded-[26px] px-6 py-7 text-white sm:rounded-[32px] sm:p-12">
        <Logo size="lg" />
        <h1 className="mt-auto pt-8 text-[32px] leading-[1.06] font-extrabold tracking-[-0.03em] sm:pt-16 sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-[420px] text-[17px] leading-normal opacity-90">{subtitle}</p>
        {points.length > 0 && (
          <ul className="mt-8 flex flex-col gap-3.5">
            {points.map((point) => (
              <li
                key={point.text}
                className="flex items-start gap-3 text-[15px] leading-snug font-semibold"
              >
                <span className="grid size-[30px] shrink-0 place-items-center rounded-[10px] bg-white/15">
                  <Icon name={point.icon} className="size-4" />
                </span>
                {point.text}
              </li>
            ))}
          </ul>
        )}
      </section>
      <main className="grid min-w-0 flex-[1_1_420px] place-items-center">
        <div className="glass flex w-full max-w-[460px] flex-col gap-2.5 rounded-[30px] px-5 py-6 sm:px-9 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
