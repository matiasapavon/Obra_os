/** Une clases condicionales (descarta falsy). Sin dependencia: no necesitamos
 *  merge de conflictos Tailwind, solo concatenar. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
