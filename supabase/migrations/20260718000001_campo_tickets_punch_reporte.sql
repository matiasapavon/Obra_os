-- ============================================================================
-- Obra OS — Tickets de campo, adicional desde nota, punch list y reporte cliente
--
-- 1. fotos.tipo ('obra'|'ticket') + fotos.gasto_id: en campo se saca foto del
--    ticket/comprobante (sin montos); en oficina se crea el gasto desde la foto
--    y gasto_id marca el ticket como procesado. Índice parcial para el listado
--    de tickets pendientes.
-- 2. adicionales.diario_id (unique): una nota de diario etiquetada "extra" se
--    convierte en un adicional 'propuesto'. El unique da idempotencia a nivel
--    DB: una nota genera a lo sumo un adicional.
-- 3. tareas.tipo ('obra'|'punch'): punch list de cierre reutiliza tareas
--    (estado, gremio_id, fotos.tarea_id y cola offline ya existen). Las punch
--    no cuentan para el avance de obra ni aparecen en la lista normal.
-- 4. obras.token_reporte: capability token del reporte público de avance para
--    el cliente (/r/[token], read-only, sin plata). Rotarlo = update la columna.
-- ============================================================================

-- ------------------------------------------------------------------
-- 1. Tickets: fotos.tipo + fotos.gasto_id
-- ------------------------------------------------------------------
alter table public.fotos
  add column tipo text not null default 'obra'
    constraint chk_fotos_tipo check (tipo in ('obra', 'ticket'));
alter table public.fotos
  add column gasto_id uuid references public.gastos(id) on delete set null;
create index idx_fotos_tickets_pendientes on public.fotos(obra_id)
  where tipo = 'ticket' and gasto_id is null and deleted_at is null;

-- ------------------------------------------------------------------
-- 2. Adicional desde nota de diario
-- ------------------------------------------------------------------
alter table public.adicionales
  add column diario_id uuid unique references public.diario_obra(id) on delete set null;

-- ------------------------------------------------------------------
-- 3. Punch list sobre tareas
-- ------------------------------------------------------------------
alter table public.tareas
  add column tipo text not null default 'obra'
    constraint chk_tareas_tipo check (tipo in ('obra', 'punch'));

-- ------------------------------------------------------------------
-- 4. Token del reporte público por obra
-- ------------------------------------------------------------------
alter table public.obras
  add column token_reporte uuid not null default gen_random_uuid();
create unique index idx_obras_token_reporte on public.obras(token_reporte);
