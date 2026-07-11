import { redirect } from "next/navigation";

// La oficina abre siempre en la primera pestaña (Tareas).
export default function OficinaPage() {
  redirect("/oficina/tareas");
}
