import { redirect } from "next/navigation";

// La oficina abre siempre en la primera pestaña (Resumen).
export default function OficinaPage() {
  redirect("/oficina/resumen");
}
