import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

// Chip de selección (toggle) de campo: unidades, gremios, etiquetas del diario.
// Mismo patrón repetido en 3 pantallas. Activo = relleno brand; inactivo =
// contorno brand. Radio grande (contenedor), no full (eso es para pills de estado).
export default function ChipToggle({
  activo,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { activo: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={activo}
      className={cx(
        "min-h-12 rounded-lg border-2 px-3 font-semibold transition-colors",
        activo
          ? "border-brand bg-brand text-white"
          : "border-brand/40 text-brand hover:bg-brand/5",
        className,
      )}
      {...props}
    />
  );
}
