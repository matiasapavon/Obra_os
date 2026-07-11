-- ============================================================================
-- Obra OS — Fundaciones para la cola offline (pre-Fase 1)
--
-- 1. updated_at + trigger en todas las tablas de dominio: habilita sync
--    incremental ("dame lo cambiado desde X") y last-write-wins.
-- 2. Idempotencia del sync: SIN cambio de esquema. Convención: el cliente
--    (Dexie) genera el UUID del PK al capturar y sincroniza con
--    upsert on conflict (id) do nothing — el reintento no duplica.
-- 3. captured_at: instante real de la captura en obra (created_at pasa a ser
--    "momento del sync" cuando la carga viene de la cola offline).
-- 4. created_offline unificado: faltaba en tareas, pedidos_materiales, fotos.
-- 5. fotos offline: url nullable + estado_upload (el binario se sube después).
-- 6. personal.obra_id: habilita "quién trabaja en esta obra" para el flujo
--    de asistencia. Tabla puente multi-obra diferida hasta que haga falta.
-- ============================================================================

-- ------------------------------------------------------------------
-- 1. updated_at en las 19 tablas de dominio
-- ------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'obras','rubros','etapas','gremios','personal','tareas',
    'dependencias_tareas','asistencias','ingresos_gremios','adicionales',
    'gastos','compromisos','ingresos','materiales','pedidos_materiales',
    'stock_eventos','diario_obra','fotos','vencimientos_admin'
  ] loop
    execute format('alter table public.%I add column updated_at timestamptz not null default now()', t);
    execute format(
      'create trigger trg_%s_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- Índice de updated_at solo en las tablas que van a sincronizar incremental
-- (las económicas admin-only se usan siempre online).
create index idx_obras_updated_at       on public.obras(updated_at);
create index idx_etapas_updated_at      on public.etapas(updated_at);
create index idx_personal_updated_at    on public.personal(updated_at);
create index idx_tareas_updated_at      on public.tareas(updated_at);
create index idx_asistencias_updated_at on public.asistencias(updated_at);
create index idx_materiales_updated_at  on public.materiales(updated_at);
create index idx_pedidos_updated_at     on public.pedidos_materiales(updated_at);
create index idx_stock_updated_at       on public.stock_eventos(updated_at);
create index idx_diario_updated_at      on public.diario_obra(updated_at);
create index idx_fotos_updated_at       on public.fotos(updated_at);

-- ------------------------------------------------------------------
-- 3. captured_at en las tablas de captura de campo
-- ------------------------------------------------------------------
alter table public.asistencias   add column captured_at timestamptz not null default now();
alter table public.diario_obra   add column captured_at timestamptz not null default now();
alter table public.stock_eventos add column captured_at timestamptz not null default now();
alter table public.fotos         add column captured_at timestamptz not null default now();
alter table public.tareas        add column captured_at timestamptz not null default now();

-- ------------------------------------------------------------------
-- 4. created_offline unificado
-- ------------------------------------------------------------------
alter table public.tareas             add column created_offline boolean not null default false;
alter table public.pedidos_materiales add column created_offline boolean not null default false;
alter table public.fotos              add column created_offline boolean not null default false;

-- ------------------------------------------------------------------
-- 5. Fotos capturadas offline: la URL llega cuando sube el binario
-- ------------------------------------------------------------------
alter table public.fotos alter column url drop not null;
alter table public.fotos add column estado_upload text not null default 'subida'
  check (estado_upload in ('pendiente','subida','error'));
alter table public.fotos add constraint chk_fotos_url_subida
  check (estado_upload <> 'subida' or url is not null);

-- ------------------------------------------------------------------
-- 6. personal ↔ obra (flujo de asistencia)
-- ------------------------------------------------------------------
alter table public.personal add column obra_id uuid references public.obras(id) on delete set null;
create index idx_personal_obra on public.personal(obra_id);

-- ------------------------------------------------------------------
-- La vista de campo de pedidos gana las columnas nuevas
-- (create or replace solo puede AGREGAR columnas al final: ok acá).
-- ------------------------------------------------------------------
create or replace view public.pedidos_materiales_campo as
  select id, obra_id, material_id, cantidad, fecha_necesidad, fecha_pedido,
         fecha_entrega_estimada, fecha_entrega_real, estado, proveedor, notas,
         created_at, updated_at, created_offline
  from public.pedidos_materiales
  where deleted_at is null;
