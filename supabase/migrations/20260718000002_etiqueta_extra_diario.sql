-- ============================================================================
-- Obra OS — Etiqueta "extra" en el diario
--
-- El chip "Trabajo extra" del diario de campo marca la nota como change event
-- (en oficina habilita "Crear adicional desde nota"). El CHECK de etiquetas
-- (20260711000002) no incluía el token: se re-crea con el dominio ampliado.
-- ============================================================================
alter table public.diario_obra drop constraint chk_diario_etiquetas;
alter table public.diario_obra add constraint chk_diario_etiquetas
  check (etiquetas <@ array['incidente','decision','visita_cliente','nota','extra']::text[]);
