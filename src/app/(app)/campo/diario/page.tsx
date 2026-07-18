import { redirect } from "next/navigation";

// La carga ahora cuelga de una etapa: /campo/etapa/[id]/diario.
export default function DiarioRedirect() {
  redirect("/campo");
}
