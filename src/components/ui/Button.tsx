import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

// Botón de acción base. Dos tamaños fijos por superficie: `campo` respeta el
// mínimo táctil de 48px (≥3 toques con guantes/sol); `oficina` es más compacto.
// Variantes con semántica de color fija (nada decorativo).
type Variante = "primary" | "secondary" | "danger" | "success";
type Tamano = "campo" | "oficina";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

const TAMANOS: Record<Tamano, string> = {
  campo: "min-h-12 px-4 text-base font-bold", // ≥48px
  oficina: "min-h-10 px-4 text-sm",
};

const VARIANTES: Record<Variante, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "border-2 border-line text-ink hover:bg-surface active:bg-surface",
  danger: "border-2 border-alert text-alert hover:bg-alert/10",
  success: "bg-ok text-white hover:bg-ok/90 active:bg-ok/80",
};

export default function Button({
  variante = "primary",
  tamano = "oficina",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamano?: Tamano;
}) {
  return (
    <button
      type={type}
      className={cx(BASE, TAMANOS[tamano], VARIANTES[variante], className)}
      {...props}
    />
  );
}
