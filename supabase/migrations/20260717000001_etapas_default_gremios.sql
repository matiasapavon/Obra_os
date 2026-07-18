-- ============================================================================
-- Obra OS — Etapas default por obra + gremio por etapa + carga de campo por etapa
--
-- 1. etapas.gremio_id: cada etapa la ejecuta un contratista (gremio). Lo único
--    que cambia entre obras es quién hace cada etapa; las etapas se repiten.
-- 2. etapa_id en las tablas de captura de campo (asistencias, pedidos_materiales,
--    diario_obra): toda la carga de mobile queda imputada a la etapa activa.
--    Nullable: datos históricos y payloads viejos de la cola offline siguen válidos.
-- 3. Seed: al crear una obra se precargan las 10 etapas estándar (con orden) y
--    los mismos 10 rubros de plata. Convive con el trigger existente
--    `crear_rubro_sin_clasificar` (que crea el rubro sistema "Sin clasificar").
--    Idempotente vía `where not exists (obra_id, nombre)`: reejecutar no duplica.
-- 4. Backfill: siembra las obras vivas ya existentes.
-- ============================================================================

-- ------------------------------------------------------------------
-- 1. etapas ↔ gremio
-- ------------------------------------------------------------------
alter table public.etapas
  add column gremio_id uuid references public.gremios(id) on delete set null;
create index idx_etapas_gremio on public.etapas(gremio_id);

-- ------------------------------------------------------------------
-- 2. etapa_id en la captura de campo
-- ------------------------------------------------------------------
alter table public.asistencias
  add column etapa_id uuid references public.etapas(id) on delete set null;
create index idx_asistencias_etapa on public.asistencias(etapa_id);

alter table public.pedidos_materiales
  add column etapa_id uuid references public.etapas(id) on delete set null;
create index idx_pedidos_etapa on public.pedidos_materiales(etapa_id);

alter table public.diario_obra
  add column etapa_id uuid references public.etapas(id) on delete set null;
create index idx_diario_etapa on public.diario_obra(etapa_id);

-- ------------------------------------------------------------------
-- 3. Seed de etapas + rubros default
--    Función reutilizable (trigger + backfill la comparten). Idempotente.
-- ------------------------------------------------------------------
create or replace function public.sembrar_defaults_obra(p_obra_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  nombres text[] := array[
    'Hormigón', 'Mampostería', 'Carpeta monolítica', 'Revoques exteriores',
    'Yeso interior', 'Pintura exterior', 'Pintura interior',
    'Colocación de cerámicos', 'Instalación sanitaria', 'Instalación eléctrica'
  ];
  item record;
begin
  for item in
    select n as nombre, i as orden
    from unnest(nombres) with ordinality as t(n, i)
  loop
    -- Etapa del cronograma (orden = posición en la lista).
    insert into public.etapas (obra_id, nombre, orden)
    select p_obra_id, item.nombre, item.orden
    where not exists (
      select 1 from public.etapas
      where obra_id = p_obra_id and nombre = item.nombre and deleted_at is null
    );
    -- Rubro de plata homónimo (presupuesto en 0; NO es rubro sistema).
    insert into public.rubros (obra_id, nombre, presupuesto_base, es_sistema)
    select p_obra_id, item.nombre, 0, false
    where not exists (
      select 1 from public.rubros
      where obra_id = p_obra_id and nombre = item.nombre and deleted_at is null
    );
  end loop;
end $$;

create or replace function public.crear_defaults_obra()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.sembrar_defaults_obra(new.id);
  return new;
end $$;

-- Trigger nuevo, aparte del existente crear_rubro_sin_clasificar (ambos corren).
create trigger trg_crear_defaults_obra
  after insert on public.obras
  for each row execute function public.crear_defaults_obra();

-- ------------------------------------------------------------------
-- 4. Backfill de obras vivas ya existentes
-- ------------------------------------------------------------------
do $$
declare
  o record;
begin
  for o in select id from public.obras where deleted_at is null loop
    perform public.sembrar_defaults_obra(o.id);
  end loop;
end $$;

-- ------------------------------------------------------------------
-- La vista de campo de pedidos gana etapa_id
-- (create or replace solo puede AGREGAR columnas al final: ok acá).
-- ------------------------------------------------------------------
create or replace view public.pedidos_materiales_campo as
  select id, obra_id, material_id, cantidad, fecha_necesidad, fecha_pedido,
         fecha_entrega_estimada, fecha_entrega_real, estado, proveedor, notas,
         created_at, updated_at, created_offline, etapa_id
  from public.pedidos_materiales
  where deleted_at is null;
