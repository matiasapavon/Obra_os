import { redirect } from "next/navigation";

// La carga ahora cuelga de una etapa: /campo/etapa/[id]/asistencia.
// Esta ruta vieja (deep-links de la PWA instalada) manda a elegir etapa.
export default function AsistenciaRedirect() {
  redirect("/campo");
}
