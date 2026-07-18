import { redirect } from "next/navigation";

// La carga ahora cuelga de una etapa: /campo/etapa/[id]/materiales.
export default function MaterialesRedirect() {
  redirect("/campo");
}
