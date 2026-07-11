-- ============================================================================
-- Obra OS — Hardening de seguridad (post-auditoría Fase 0)
--
-- 1. handle_new_user: todo usuario nuevo nace 'campo' (se elimina la lógica
--    "primer usuario = admin", que era una race y una escalación con signup
--    abierto). El admin se promueve a mano por SQL. El signup público además
--    se deshabilita en el Dashboard (paso manual).
-- 2. Políticas compartidas separadas por comando: DELETE físico queda solo
--    admin (las cascadas de FK ignoran el RLS de las tablas hijas: un DELETE
--    de campo en obras arrasaba las tablas económicas admin-only).
-- 3. Soft-delete filtrado en RLS: campo solo ve filas vivas; admin ve todo.
-- 4. is_admin() envuelto en (select ...) para que el planner lo evalúe una
--    vez por query (initPlan) y no por fila.
-- 5. Costos de pedidos_materiales ocultos a campo vía vista sin columnas de
--    plata (RLS por columna no existe en Postgres).
-- ============================================================================

-- ------------------------------------------------------------------
-- 1. Alta de usuarios: siempre 'campo'
-- ------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nombre, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    'campo'
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- ------------------------------------------------------------------
-- 2-4. profiles y admin-only: mismas reglas, con initPlan wrapping
-- ------------------------------------------------------------------
drop policy "profiles_select_self_or_admin" on public.profiles;
drop policy "profiles_admin_write"          on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles
  for select to authenticated using (id = auth.uid() or (select public.is_admin()));
create policy "profiles_admin_write" on public.profiles
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy "rubros_admin"             on public.rubros;
drop policy "gastos_admin"             on public.gastos;
drop policy "compromisos_admin"        on public.compromisos;
drop policy "adicionales_admin"        on public.adicionales;
drop policy "ingresos_admin"           on public.ingresos;
drop policy "vencimientos_admin_admin" on public.vencimientos_admin;
create policy "rubros_admin"             on public.rubros             for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "gastos_admin"             on public.gastos             for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "compromisos_admin"        on public.compromisos        for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "adicionales_admin"        on public.adicionales        for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "ingresos_admin"           on public.ingresos           for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "vencimientos_admin_admin" on public.vencimientos_admin for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ------------------------------------------------------------------
-- 2-4. Compartidas: select filtra soft-delete, delete solo admin
-- ------------------------------------------------------------------
-- Patrón por tabla:
--   select : filas vivas para todos; admin también ve las borradas.
--   insert : cualquier autenticado (captura de campo).
--   update : cualquier autenticado (incluye el soft-delete via deleted_at).
--   delete : solo admin (corta las cascadas destructivas desde campo).

-- obras
drop policy "obras_rw" on public.obras;
create policy "obras_select" on public.obras for select to authenticated
  using (deleted_at is null or (select public.is_admin()));
create policy "obras_insert" on public.obras for insert to authenticated with check (true);
create policy "obras_update" on public.obras for update to authenticated using (true) with check (true);
create policy "obras_delete" on public.obras for delete to authenticated
  using ((select public.is_admin()));

-- etapas
drop policy "etapas_rw" on public.etapas;
create policy "etapas_select" on public.etapas for select to authenticated
  using (deleted_at is null or (select public.is_admin()));
create policy "etapas_insert" on public.etapas for insert to authenticated with check (true);
create policy "etapas_update" on public.etapas for update to authenticated using (true) with check (true);
create policy "etapas_delete" on public.etapas for delete to authenticated
  using ((select public.is_admin()));

-- gremios
drop policy "gremios_rw" on public.gremios;
create policy "gremios_select" on public.gremios for select to authenticated
  using (deleted_at is null or (select public.is_admin()));
create policy "gremios_insert" on public.gremios for insert to authenticated with check (true);
create policy "gremios_update" on public.gremios for update to authenticated using (true) with check (true);
create policy "gremios_delete" on public.gremios for delete to authenticated
  using ((select public.is_admin()));

-- personal
drop policy "personal_rw" on public.personal;
create policy "personal_select" on public.personal for select to authenticated
  using (deleted_at is null or (select public.is_admin()));
create policy "personal_insert" on public.personal for insert to authenticated with check (true);
create policy "personal_update" on public.personal for update to authenticated using (true) with check (true);
create policy "personal_delete" on public.personal for delete to authenticated
  using ((select public.is_admin()));

-- tareas
drop policy "tareas_rw" on public.tareas;
create policy "tareas_select" on public.tareas for select to authenticated
  using (deleted_at is null or (select public.is_admin()));
create policy "tareas_insert" on public.tareas for insert to authenticated with check (true);
create policy "tareas_update" on public.tareas for update to authenticated using (true) with check (true);
create policy "tareas_delete" on public.tareas for delete to authenticated
  using ((select public.is_admin()));

-- dependencias_tareas (sin deleted_at: select abierto, delete solo admin)
drop policy "dep_tareas_rw" on public.dependencias_tareas;
create policy "dep_tareas_select" on public.dependencias_tareas for select to authenticated using (true);
create policy "dep_tareas_insert" on public.dependencias_tareas for insert to authenticated with check (true);
create policy "dep_tareas_update" on public.dependencias_tareas for update to authenticated using (true) with check (true);
create policy "dep_tareas_delete" on public.dependencias_tareas for delete to authenticated
  using ((select public.is_admin()));

-- asistencias
drop policy "asistencias_rw" on public.asistencias;
create policy "asistencias_select" on public.asistencias for select to authenticated
  using (deleted_at is null or (select public.is_admin()));
create policy "asistencias_insert" on public.asistencias for insert to authenticated with check (true);
create policy "asistencias_update" on public.asistencias for update to authenticated using (true) with check (true);
create policy "asistencias_delete" on public.asistencias for delete to authenticated
  using ((select public.is_admin()));

-- ingresos_gremios
drop policy "ingresos_gremios_rw" on public.ingresos_gremios;
create policy "ingresos_gremios_select" on public.ingresos_gremios for select to authenticated
  using (deleted_at is null or (select public.is_admin()));
create policy "ingresos_gremios_insert" on public.ingresos_gremios for insert to authenticated with check (true);
create policy "ingresos_gremios_update" on public.ingresos_gremios for update to authenticated using (true) with check (true);
create policy "ingresos_gremios_delete" on public.ingresos_gremios for delete to authenticated
  using ((select public.is_admin()));

-- materiales
drop policy "materiales_rw" on public.materiales;
create policy "materiales_select" on public.materiales for select to authenticated
  using (deleted_at is null or (select public.is_admin()));
create policy "materiales_insert" on public.materiales for insert to authenticated with check (true);
create policy "materiales_update" on public.materiales for update to authenticated using (true) with check (true);
create policy "materiales_delete" on public.materiales for delete to authenticated
  using ((select public.is_admin()));

-- stock_eventos
drop policy "stock_eventos_rw" on public.stock_eventos;
create policy "stock_eventos_select" on public.stock_eventos for select to authenticated
  using (deleted_at is null or (select public.is_admin()));
create policy "stock_eventos_insert" on public.stock_eventos for insert to authenticated with check (true);
create policy "stock_eventos_update" on public.stock_eventos for update to authenticated using (true) with check (true);
create policy "stock_eventos_delete" on public.stock_eventos for delete to authenticated
  using ((select public.is_admin()));

-- diario_obra
drop policy "diario_rw" on public.diario_obra;
create policy "diario_select" on public.diario_obra for select to authenticated
  using (deleted_at is null or (select public.is_admin()));
create policy "diario_insert" on public.diario_obra for insert to authenticated with check (true);
create policy "diario_update" on public.diario_obra for update to authenticated using (true) with check (true);
create policy "diario_delete" on public.diario_obra for delete to authenticated
  using ((select public.is_admin()));

-- fotos
drop policy "fotos_rw" on public.fotos;
create policy "fotos_select" on public.fotos for select to authenticated
  using (deleted_at is null or (select public.is_admin()));
create policy "fotos_insert" on public.fotos for insert to authenticated with check (true);
create policy "fotos_update" on public.fotos for update to authenticated using (true) with check (true);
create policy "fotos_delete" on public.fotos for delete to authenticated
  using ((select public.is_admin()));

-- ------------------------------------------------------------------
-- 5. pedidos_materiales: la plata (costos) solo admin
--    * SELECT directo a la tabla: solo admin.
--    * Campo lee por la vista pedidos_materiales_campo (sin columnas de costo).
--      La vista es "definer" (owner postgres, dueño de la tabla, sin RLS):
--      con security_invoker el RLS admin-only de la base la dejaría vacía
--      para campo. Filtra deleted_at ella misma.
--    * Campo puede insertar pedidos pero sin costos (los completa admin).
-- ------------------------------------------------------------------
drop policy "pedidos_rw" on public.pedidos_materiales;
create policy "pedidos_select_admin" on public.pedidos_materiales for select to authenticated
  using ((select public.is_admin()));
create policy "pedidos_insert" on public.pedidos_materiales for insert to authenticated
  with check (
    (select public.is_admin())
    or (costo_estimado is null and costo_real is null and gasto_id is null)
  );
create policy "pedidos_update" on public.pedidos_materiales for update to authenticated using (true) with check (true);
create policy "pedidos_delete" on public.pedidos_materiales for delete to authenticated
  using ((select public.is_admin()));

create view public.pedidos_materiales_campo as
  select id, obra_id, material_id, cantidad, fecha_necesidad, fecha_pedido,
         fecha_entrega_estimada, fecha_entrega_real, estado, proveedor, notas,
         created_at
  from public.pedidos_materiales
  where deleted_at is null;

revoke all on public.pedidos_materiales_campo from anon, public;
grant select on public.pedidos_materiales_campo to authenticated;

-- ------------------------------------------------------------------
-- Índices parciales para las consultas de filas vivas (alto uso)
-- ------------------------------------------------------------------
create index idx_tareas_vivas      on public.tareas(obra_id)             where deleted_at is null;
create index idx_asistencias_vivas on public.asistencias(obra_id, fecha) where deleted_at is null;
create index idx_gastos_vivos      on public.gastos(obra_id, fecha)      where deleted_at is null;
create index idx_pedidos_vivos     on public.pedidos_materiales(obra_id) where deleted_at is null;
create index idx_diario_vivo       on public.diario_obra(obra_id, fecha) where deleted_at is null;
create index idx_fotos_vivas       on public.fotos(obra_id)              where deleted_at is null;
