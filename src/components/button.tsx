import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

const base = cx(
  "focus-ring inline-flex items-center justify-center gap-2 font-bold transition-opacity",
  "disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40",
);

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white shadow-[0_10px_22px_-10px_rgb(62_75_210/0.5)]",
  secondary: "border border-line bg-white text-[#151936] dark:bg-white/10 dark:text-ink",
  ghost: "bg-transparent text-primary-text",
  // Coral oscurecido: el texto blanco sobre el coral de la paleta no llega a AA.
  danger: "bg-[#b5422b] text-white",
};

const sizes: Record<Size, string> = {
  md: "h-11 rounded-full px-5 text-sm",
  lg: "h-[54px] rounded-full px-6 text-base",
};

interface StyleProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

function classes({
  variant = "primary",
  size = "lg",
  className = "",
}: Omit<StyleProps, "children">) {
  return cx(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: StyleProps & ComponentProps<"button">) {
  return <button type={type} className={classes({ variant, size, className })} {...props} />;
}

/** Un enlace con la forma de un botón. `disabled` lo deja visible pero inerte. */
export function ButtonLink({
  variant,
  size,
  className,
  disabled = false,
  href,
  ...props
}: StyleProps & ComponentProps<typeof Link> & { disabled?: boolean }) {
  return (
    <Link
      href={href}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      className={classes({ variant, size, className })}
      {...props}
    />
  );
}
