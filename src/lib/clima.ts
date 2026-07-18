// Clima automático best-effort para el diario de obra (client-only).
// Open-Meteo: gratis, sin API key, sin dependencia. Cualquier fallo (sin
// permiso de geo, sin señal, timeout) devuelve null y no bloquea la carga.

const DESCRIPCION: [codigos: number[], texto: string][] = [
  [[0], "Despejado"],
  [[1, 2], "Algo nublado"],
  [[3], "Nublado"],
  [[45, 48], "Niebla"],
  [[51, 53, 55, 56, 57], "Llovizna"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "Lluvia"],
  [[71, 73, 75, 77, 85, 86], "Nieve"],
  [[95, 96, 99], "Tormenta"],
];

function describir(codigo: number): string {
  for (const [codigos, texto] of DESCRIPCION) {
    if (codigos.includes(codigo)) return texto;
  }
  return "";
}

function posicionActual(timeoutMs: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("sin geolocalización"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: timeoutMs,
      maximumAge: 10 * 60 * 1000, // una posición de hace minutos alcanza
    });
  });
}

/** "Lluvia 18°" | "Despejado 24°" | null si no se pudo (nunca lanza). */
export async function obtenerClima(): Promise<string | null> {
  try {
    const pos = await posicionActual(4000);
    const { latitude, longitude } = pos.coords;
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const temp = data.current?.temperature_2m;
    const codigo = data.current?.weather_code;
    if (temp === undefined || codigo === undefined) return null;
    const texto = describir(codigo);
    const grados = `${Math.round(temp)}°`;
    return texto ? `${texto} ${grados}` : grados;
  } catch {
    return null;
  }
}
