// Formato argentino (es-AR). Handoff §6.4 y §6.6.

const grupos = (decimales = 0) =>
  new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });

/** $1.250.000 (punto de miles, sin espacio). */
export function formatARS(n: number, decimales = 0): string {
  return "$" + grupos(decimales).format(n);
}

/** Compacto para dashboards: $1,25M / $12,5k / $250. */
export function formatARSCompacto(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000)
    return "$" + new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n / 1_000_000) + "M";
  if (abs >= 1_000)
    return "$" + new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(n / 1_000) + "k";
  return "$" + grupos().format(n);
}

/** 1.250.000 (número liso, sin símbolo). */
export function formatNumero(n: number, decimales = 0): string {
  return grupos(decimales).format(n);
}

/** Fecha de hoy en América/Argentina/Buenos_Aires, formato YYYY-MM-DD. */
export function fechaHoyISO(): string {
  // en-CA formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const rtf = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });

function aDate(fecha: string | Date): Date {
  if (typeof fecha !== "string") return fecha;
  // Un string solo-fecha (YYYY-MM-DD) lo parsea el motor como UTC medianoche;
  // al leerlo con getters locales en Argentina (UTC-3) retrocede un día. Lo
  // construimos como fecha local para que el día mostrado sea el guardado.
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (soloFecha) {
    const [, y, m, d] = soloFecha;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return new Date(fecha);
}

/** "mar 30/6" — día de la semana abreviado + día/mes. */
export function formatFechaCorta(fecha: string | Date): string {
  const d = aDate(fecha);
  const dia = new Intl.DateTimeFormat("es-AR", { weekday: "short" })
    .format(d)
    .replace(".", "");
  return `${dia} ${d.getDate()}/${d.getMonth() + 1}`;
}

/** "hoy" | "ayer" | "hace 3 días" | "en 2 días". */
export function formatRelativo(fecha: string | Date): string {
  const d = aDate(fecha);
  const hoy = new Date();
  const msPorDia = 86_400_000;
  const diff = Math.round(
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) -
      Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) /
      msPorDia,
  );
  return rtf.format(diff, "day");
}

/** "hace 3 días (mar 30/6)" — relativa + absoluta juntas (handoff §6.4). */
export function formatFecha(fecha: string | Date): string {
  return `${formatRelativo(fecha)} (${formatFechaCorta(fecha)})`;
}
