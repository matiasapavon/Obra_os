-- ============================================================================
-- Obra OS — Multi-obra (Fase 6)
--
-- Tabla puente usuario ↔ obra. Hasta ahora "la obra activa" se resolvía como
-- la única obra en estado 'activa' (helper obraActiva). Con varias obras se
-- necesita saber a cuáles pertenece cada usuario.
--
-- Decisiones:
-- 1. Puente simple (obra_id, user_id) + rol opcional por obra (a futuro).
-- 2. RLS: admin gestiona todo; un usuario ve sus propias membresías.
-- 3. NO se cambia todavía el modelo de "obra activa" en la app: esta migración
--    solo agrega la tabla y su seguridad. El selector de obra en la UI es un
--    paso aparte (ver tasks/todo.md).
-- ============================================================================

create table public.obras_usuarios (
  id         uuid primary key default gen_random_uuid(),
  obra_id    uuid not null references public.obras(id)    on delete cascade,
  user_id    uuid not null references auth.users(id)      on delete cascade,
  -- Rol dentro de esta obra (por si un campo es capataz en una y peón en otra).
  rol_obra   text not null default 'campo' check (rol_obra in ('admin','campo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (obra_id, user_id)
);

create index idx_obras_usuarios_obra on public.obras_usuarios(obra_id);
create index idx_obras_usuarios_user on public.obras_usuarios(user_id);
create index idx_obras_usuarios_updated_at on public.obras_usuarios(updated_at);

-- updated_at automático (misma función que el resto del esquema).
create trigger trg_obras_usuarios_updated_at
  before update on public.obras_usuarios
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- RLS
--   select : el usuario ve sus propias membresías; admin ve todas.
--   all    : solo admin escribe (asigna/quita gente de obras).
-- ------------------------------------------------------------------
alter table public.obras_usuarios enable row level security;

create policy "obras_usuarios_select" on public.obras_usuarios
  for select to authenticated
  using (user_id = auth.uid() or (select public.is_admin()));

create policy "obras_usuarios_admin" on public.obras_usuarios
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ------------------------------------------------------------------
-- Backfill: cada usuario existente queda asociado a todas las obras vivas.
-- Preserva el comportamiento actual (una sola obra activa, todos la ven)
-- mientras se migra la app al modelo multi-obra.
-- ------------------------------------------------------------------
insert into public.obras_usuarios (obra_id, user_id, rol_obra)
select o.id, p.id, p.role
from public.obras o
cross join public.profiles p
where o.deleted_at is null
on conflict (obra_id, user_id) do nothing;
