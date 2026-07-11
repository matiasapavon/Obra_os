-- ============================================================================
-- Obra OS — Integridad (post-auditoría Fase 0)
--
-- 1. Índices en las FKs que faltaban (joins y cascadas sin seq-scan).
-- 2. gastos.rubro_id con ON DELETE RESTRICT explícito: borrar una obra con
--    gastos debe fallar fuerte, no depender del orden de resolución de las
--    cascadas obra→rubros vs obra→gastos. Regla operativa: las obras no se
--    borran físico, se soft-deletean.
-- 3. CHECKs de coherencia (montos, rangos de fechas, etiquetas del diario).
-- 4. Rubro "Sin clasificar" identificable por flag es_sistema (no por nombre)
--    y único por obra (los reintentos del trigger no lo duplican).
-- ============================================================================

-- ------------------------------------------------------------------
-- 1. Índices FK faltantes
-- ------------------------------------------------------------------
create index idx_gastos_gremio           on public.gastos(gremio_id);
create index idx_gastos_adicional        on public.gastos(adicional_id);
create index idx_tareas_rubro            on public.tareas(rubro_id);
create index idx_tareas_gremio           on public.tareas(gremio_id);
create index idx_dep_tareas_depende      on public.dependencias_tareas(depende_de_tarea_id);
create index idx_ingresos_gremios_gremio on public.ingresos_gremios(gremio_id);
create index idx_ingresos_gremios_tarea  on public.ingresos_gremios(tarea_id);
create index idx_ingresos_adicional      on public.ingresos(adicional_id);
create index idx_compromisos_rubro       on public.compromisos(rubro_id);
create index idx_compromisos_gremio      on public.compromisos(gremio_id);
create index idx_materiales_rubro        on public.materiales(rubro_id);
create index idx_pedidos_material        on public.pedidos_materiales(material_id);
create index idx_pedidos_gasto           on public.pedidos_materiales(gasto_id);
create index idx_stock_eventos_material  on public.stock_eventos(material_id);
create index idx_fotos_diario            on public.fotos(diario_id);
create index idx_fotos_tarea             on public.fotos(tarea_id);
create index idx_fotos_stock_evento      on public.fotos(stock_evento_id);

-- ------------------------------------------------------------------
-- 2. FK de gastos.rubro_id explícita
-- ------------------------------------------------------------------
alter table public.gastos drop constraint gastos_rubro_id_fkey;
alter table public.gastos add constraint gastos_rubro_id_fkey
  foreign key (rubro_id) references public.rubros(id) on delete restrict;

-- ------------------------------------------------------------------
-- 3. CHECKs de coherencia
-- ------------------------------------------------------------------
alter table public.compromisos add constraint chk_compromisos_monto_pagado
  check (monto_pagado >= 0 and monto_pagado <= monto_total);

alter table public.obras add constraint chk_obras_fechas
  check (fecha_fin_estimada is null or fecha_inicio is null or fecha_fin_estimada >= fecha_inicio);

alter table public.etapas add constraint chk_etapas_fechas_plan
  check (fecha_fin_plan is null or fecha_inicio_plan is null or fecha_fin_plan >= fecha_inicio_plan);
alter table public.etapas add constraint chk_etapas_fechas_real
  check (fecha_fin_real is null or fecha_inicio_real is null or fecha_fin_real >= fecha_inicio_real);

alter table public.tareas add constraint chk_tareas_fechas_plan
  check (fecha_fin_plan is null or fecha_inicio_plan is null or fecha_fin_plan >= fecha_inicio_plan);
alter table public.tareas add constraint chk_tareas_fechas_real
  check (fecha_fin_real is null or fecha_inicio_real is null or fecha_fin_real >= fecha_inicio_real);

-- Dominio documentado en el esquema inicial: incidente|decision|visita_cliente|nota
alter table public.diario_obra add constraint chk_diario_etiquetas
  check (etiquetas <@ array['incidente','decision','visita_cliente','nota']::text[]);

-- ------------------------------------------------------------------
-- 4. Rubro "Sin clasificar" identificable y único por obra
-- ------------------------------------------------------------------
alter table public.rubros add column es_sistema boolean not null default false;

update public.rubros set es_sistema = true where nombre = 'Sin clasificar';

create unique index uq_rubros_sistema_por_obra on public.rubros(obra_id) where es_sistema;

create or replace function public.crear_rubro_sin_clasificar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.rubros (obra_id, nombre, presupuesto_base, es_sistema)
  values (new.id, 'Sin clasificar', 0, true)
  on conflict do nothing;
  return new;
end $$;
