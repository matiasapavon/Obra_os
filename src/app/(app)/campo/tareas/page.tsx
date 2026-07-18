import { redirect } from "next/navigation";

// La carga ahora cuelga de una etapa: /campo/etapa/[id]/tareas.
export default function TareasRedirect() {
  redirect("/campo");
}
