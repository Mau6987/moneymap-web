import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/icon";
import { cx } from "@/lib/cx";

interface StepHeaderProps {
  icon: IconName;
  /** Color del ícono central: `bg-primary`, `bg-green`… */
  tone?: string;
  title: string;
  subtitle: string;
  /** Lo que va debajo del subtítulo, como el correo y el tiempo restante. */
  children?: ReactNode;
}

/** El encabezado centrado de los pasos del acceso: anillos, ícono, título y subtítulo. */
export function StepHeader({
  icon,
  tone = "bg-primary",
  title,
  subtitle,
  children,
}: StepHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-2.5 text-center">
      <div className="relative grid size-32 place-items-center" aria-hidden="true">
        <span className="bg-primary-soft absolute inset-0 rounded-full" />
        <span className="bg-primary-soft absolute inset-4 rounded-full" />
        <span
          className={cx(
            "relative grid size-[68px] place-items-center rounded-[22px] text-white",
            tone,
          )}
        >
          <Icon name={icon} className="size-8" />
        </span>
      </div>
      <h2 className="mt-2 text-[28px] font-extrabold tracking-[-0.02em]">{title}</h2>
      <p className="text-muted text-[15px] font-medium">{subtitle}</p>
      {children}
    </div>
  );
}
