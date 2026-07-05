-- ============================================================================
-- Obra OS — Esquema inicial (Fase 0)
-- Modelo de datos completo del handoff §4. Las fases posteriores agregan UI,
-- no tablas: por eso el modelo entero va ahora (evita migrar después).
--
-- Convenciones:
--   * Nombres en español (exports y API legibles por Mati y por Cowork).
--   * timestamptz en todo lo temporal de sistema; date en fechas de obra.
--   * Borrado lógico: columna deleted_at en todas las tablas de dominio.
--   * RLS habilitado en TODAS las tablas.
--   * Dos roles: 'admin' (Mati, acceso total) y 'campo' (capataz futuro, sin plata).
-- ============================================================================

-- ------------------------------------------------------------------
-- Perfiles y roles
-- ------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  role       text not null default 'campo' check (role in ('admin','campo')),
  created_at timestamptz not null default now()
);

-- Rol efectivo del usuario actual.
-- Prioridad: claim del JWT (si el custom access token hook está activo) ->
-- profiles.role -> 'campo'. SECURITY DEFINER (owner = postgres) lee profiles
-- sin disparar RLS, evitando recursión en las políticas de profiles.
create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    (select p.role from public.profiles p where p.id = auth.uid()),
    'campo'
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_app_role() = 'admin';
$$;

-- Alta automática de profile al crear un usuario en auth.users.
-- El PRIMER usuario del sistema queda como 'admin' (Mati); el resto 'campo'.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role text := 'campo';
begin
  if not exists (select 1 from public.profiles) then
    v_role := 'admin';
  end if;
  insert into public.profiles (id, nombre, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    v_role
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Custom access token hook (OPCIONAL en Fase 0).
-- Al activarlo en Dashboard > Authentication > Hooks, inyecta el rol en
-- app_metadata del JWT y current_app_role() lo lee sin tocar la tabla.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  claims jsonb;
  v_role text;
begin
  select role into v_role from public.profiles where id = (event ->> 'user_id')::uuid;
  v_role := coalesce(v_role, 'campo');
  claims := coalesce(event -> 'claims', '{}'::jsonb);
  if claims ? 'app_metadata' then
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(v_role));
  else
    claims := jsonb_set(claims, '{app_metadata}', jsonb_build_object('role', v_role));
  end if;
  return jsonb_set(event, '{claims}', claims);
end $$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select on public.profiles to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- ------------------------------------------------------------------
-- Núcleo: obras, rubros, etapas, gremios, personal, tareas
-- ------------------------------------------------------------------
create table public.obras (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,
  direccion          text,
  cliente            text,
  fecha_inicio       date,
  fecha_fin_estimada date,
  superficie_m2      numeric(12,2),
  estado             text not null default 'activa' check (estado in ('activa','pausada','terminada')),
  moneda             text not null default 'ARS' check (moneda in ('ARS','USD')),
  notas              text,
  created_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

create table public.rubros (
  id               uuid primary key default gen_random_uuid(),
  obra_id          uuid not null references public.obras(id) on delete cascade,
  nombre           text not null,
  presupuesto_base numeric(14,2) not null default 0,
  notas            text,
  created_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

-- Toda obra nueva nace con un rubro "Sin clasificar" (destino de gastos sin imputar).
create or replace function public.crear_rubro_sin_clasificar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.rubros (obra_id, nombre, presupuesto_base)
  values (new.id, 'Sin clasificar', 0);
  return new;
end $$;

create trigger on_obra_created
  after insert on public.obras
  for each row execute function public.crear_rubro_sin_clasificar();

create table public.etapas (
  id                uuid primary key default gen_random_uuid(),
  obra_id           uuid not null references public.obras(id) on delete cascade,
  nombre            text not null,
  orden             int not null default 0,
  fecha_inicio_plan date,
  fecha_fin_plan    date,
  fecha_inicio_real date,
  fecha_fin_real    date,
  estado            text not null default 'pendiente' check (estado in ('pendiente','en_curso','terminada')),
  created_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create table public.gremios (
  id              uuid primary key default gen_random_uuid(),
  obra_id         uuid references public.obras(id) on delete cascade, -- null = catálogo general
  nombre          text not null,
  especialidad    text,
  contacto_nombre text,
  telefono        text,
  email           text,
  forma_pago      text check (forma_pago in ('por_dia','por_m2','ajuste_alzado','certificados')),
  calificacion    int check (calificacion between 1 and 5),
  notas           text,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create table public.personal (
  id                 uuid primary key default gen_random_uuid(),
  gremio_id          uuid references public.gremios(id) on delete set null,
  nombre             text not null,
  rol                text,
  telefono           text,
  art_vencimiento    date,
  seguro_vencimiento date,
  created_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

create table public.tareas (
  id                uuid primary key default gen_random_uuid(),
  obra_id           uuid not null references public.obras(id) on delete cascade,
  etapa_id          uuid references public.etapas(id) on delete set null,
  rubro_id          uuid references public.rubros(id) on delete set null,
  gremio_id         uuid references public.gremios(id) on delete set null,
  nombre            text not null,
  descripcion       text,
  ubicacion         text,
  fecha_inicio_plan date,
  fecha_fin_plan    date,
  fecha_inicio_real date,
  fecha_fin_real    date,
  estado            text not null default 'pendiente' check (estado in ('pendiente','en_curso','terminada','bloqueada')),
  porcentaje_avance int not null default 0 check (porcentaje_avance between 0 and 100),
  orden             int not null default 0,
  created_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create table public.dependencias_tareas (
  id                   uuid primary key default gen_random_uuid(),
  tarea_id             uuid not null references public.tareas(id) on delete cascade,
  depende_de_tarea_id  uuid not null references public.tareas(id) on delete cascade,
  created_at           timestamptz not null default now(),
  check (tarea_id <> depende_de_tarea_id),
  unique (tarea_id, depende_de_tarea_id)
);

-- ------------------------------------------------------------------
-- Personas en obra: asistencias e ingresos de gremios
-- ------------------------------------------------------------------
create table public.asistencias (
  id             uuid primary key default gen_random_uuid(),
  obra_id        uuid not null references public.obras(id) on delete cascade,
  personal_id    uuid not null references public.personal(id) on delete cascade,
  fecha          date not null default current_date,
  hora_entrada   time,
  hora_salida    time,
  medio_dia      boolean not null default false,
  observacion    text,
  created_offline boolean not null default false,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create table public.ingresos_gremios (
  id                  uuid primary key default gen_random_uuid(),
  obra_id             uuid not null references public.obras(id) on delete cascade,
  gremio_id           uuid not null references public.gremios(id) on delete cascade,
  tarea_id            uuid references public.tareas(id) on delete set null,
  fecha_ingreso_plan  date,
  fecha_ingreso_real  date,
  confirmado          boolean not null default false,
  notas               text,
  created_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

-- ------------------------------------------------------------------
-- Economía: adicionales, gastos, compromisos, ingresos
-- (adicionales antes de gastos por la FK adicional_id)
-- ------------------------------------------------------------------
create table public.adicionales (
  id             uuid primary key default gen_random_uuid(),
  obra_id        uuid not null references public.obras(id) on delete cascade,
  fecha          date not null default current_date,
  descripcion    text not null,
  origen         text check (origen in ('cliente','proyecto','imprevisto')),
  costo_estimado numeric(14,2),
  costo_real     numeric(14,2),
  lo_paga        text check (lo_paga in ('cliente','estudio','compartido')),
  estado         text not null default 'propuesto' check (estado in ('propuesto','aprobado','ejecutado','facturado','cobrado')),
  aprobado_por   text,
  evidencia_url  text,
  notas          text,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create table public.gastos (
  id              uuid primary key default gen_random_uuid(),
  obra_id         uuid not null references public.obras(id) on delete cascade,
  rubro_id        uuid not null references public.rubros(id),  -- siempre imputado (default app: "Sin clasificar")
  gremio_id       uuid references public.gremios(id) on delete set null,
  adicional_id    uuid references public.adicionales(id) on delete set null,
  fecha           date not null default current_date,
  concepto        text not null,
  monto           numeric(14,2) not null,
  moneda          text not null default 'ARS' check (moneda in ('ARS','USD')),
  tipo            text not null default 'varios' check (tipo in ('material','mano_de_obra','certificado','honorario','adicional','varios')),
  medio_pago      text check (medio_pago in ('efectivo','transferencia','cheque','otro')),
  comprobante_url text,
  notas           text,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create table public.compromisos (
  id                   uuid primary key default gen_random_uuid(),
  obra_id              uuid not null references public.obras(id) on delete cascade,
  rubro_id             uuid references public.rubros(id) on delete set null,
  gremio_id            uuid references public.gremios(id) on delete set null,
  concepto             text not null,
  monto_total          numeric(14,2) not null,
  fecha_estimada_pago  date,
  estado               text not null default 'pendiente' check (estado in ('pendiente','pagado_parcial','pagado')),
  monto_pagado         numeric(14,2) not null default 0,
  notas                text,
  created_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

create table public.ingresos (
  id            uuid primary key default gen_random_uuid(),
  obra_id       uuid not null references public.obras(id) on delete cascade,
  adicional_id  uuid references public.adicionales(id) on delete set null,
  fecha         date not null default current_date,
  concepto      text check (concepto in ('anticipo','certificado','adicional','final')),
  monto         numeric(14,2) not null,
  moneda        text not null default 'ARS' check (moneda in ('ARS','USD')),
  notas         text,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

-- ------------------------------------------------------------------
-- Materiales
-- ------------------------------------------------------------------
create table public.materiales (
  id                 uuid primary key default gen_random_uuid(),
  obra_id            uuid not null references public.obras(id) on delete cascade,
  rubro_id           uuid references public.rubros(id) on delete set null,
  nombre             text not null,
  unidad             text check (unidad in ('bolsa','m3','ml','un','kg','lt')),
  proveedor_habitual text,
  lead_time_dias     int,
  created_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

create table public.pedidos_materiales (
  id                     uuid primary key default gen_random_uuid(),
  obra_id                uuid not null references public.obras(id) on delete cascade,
  material_id            uuid not null references public.materiales(id) on delete cascade,
  cantidad               numeric(12,2),
  fecha_necesidad        date,
  fecha_pedido           date,
  fecha_entrega_estimada date,
  fecha_entrega_real     date,
  estado                 text not null default 'a_pedir' check (estado in ('a_pedir','pedido','en_camino','entregado','faltante')),
  proveedor              text,
  costo_estimado         numeric(14,2),
  costo_real             numeric(14,2),
  gasto_id               uuid references public.gastos(id) on delete set null,
  notas                  text,
  created_at             timestamptz not null default now(),
  deleted_at             timestamptz
);

create table public.stock_eventos (
  id             uuid primary key default gen_random_uuid(),
  obra_id        uuid not null references public.obras(id) on delete cascade,
  material_id    uuid references public.materiales(id) on delete set null,
  tipo           text not null check (tipo in ('hay','falta','se_termina')),
  cantidad_aprox numeric(12,2),
  foto_url       text,
  fecha          date not null default current_date,
  created_offline boolean not null default false,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

-- ------------------------------------------------------------------
-- Diario, fotos y administración
-- ------------------------------------------------------------------
create table public.diario_obra (
  id              uuid primary key default gen_random_uuid(),
  obra_id         uuid not null references public.obras(id) on delete cascade,
  fecha           date not null default current_date,
  texto           text,
  clima           text,
  etiquetas       text[] not null default '{}',   -- incidente|decision|visita_cliente|nota
  created_offline boolean not null default false,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create table public.fotos (
  id               uuid primary key default gen_random_uuid(),
  obra_id          uuid not null references public.obras(id) on delete cascade,
  diario_id        uuid references public.diario_obra(id) on delete set null,
  tarea_id         uuid references public.tareas(id) on delete set null,
  stock_evento_id  uuid references public.stock_eventos(id) on delete set null,
  url              text not null,
  thumbnail_url    text,
  fecha            date not null default current_date,
  ubicacion_texto  text,
  created_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create table public.vencimientos_admin (
  id                uuid primary key default gen_random_uuid(),
  obra_id           uuid not null references public.obras(id) on delete cascade,
  tipo              text not null check (tipo in ('ART','seguro','permiso','inspeccion','otro')),
  descripcion       text,
  fecha_vencimiento date not null,
  responsable       text,
  estado            text not null default 'pendiente' check (estado in ('pendiente','resuelto')),
  alerta_dias_antes int not null default 15,
  created_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

-- ------------------------------------------------------------------
-- Índices (FKs y columnas de filtro frecuente)
-- ------------------------------------------------------------------
create index idx_rubros_obra              on public.rubros(obra_id);
create index idx_etapas_obra              on public.etapas(obra_id);
create index idx_gremios_obra             on public.gremios(obra_id);
create index idx_personal_gremio          on public.personal(gremio_id);
create index idx_tareas_obra              on public.tareas(obra_id);
create index idx_tareas_etapa             on public.tareas(etapa_id);
create index idx_tareas_estado            on public.tareas(estado);
create index idx_dep_tareas_tarea         on public.dependencias_tareas(tarea_id);
create index idx_asistencias_obra_fecha   on public.asistencias(obra_id, fecha);
create index idx_asistencias_personal     on public.asistencias(personal_id);
create index idx_ingresos_gremios_obra    on public.ingresos_gremios(obra_id);
create index idx_adicionales_obra         on public.adicionales(obra_id);
create index idx_gastos_obra_fecha        on public.gastos(obra_id, fecha);
create index idx_gastos_rubro             on public.gastos(rubro_id);
create index idx_compromisos_obra         on public.compromisos(obra_id);
create index idx_ingresos_obra_fecha      on public.ingresos(obra_id, fecha);
create index idx_materiales_obra          on public.materiales(obra_id);
create index idx_pedidos_obra             on public.pedidos_materiales(obra_id);
create index idx_pedidos_estado           on public.pedidos_materiales(estado);
create index idx_stock_eventos_obra       on public.stock_eventos(obra_id);
create index idx_diario_obra_obra_fecha   on public.diario_obra(obra_id, fecha);
create index idx_fotos_obra               on public.fotos(obra_id);
create index idx_vencimientos_obra        on public.vencimientos_admin(obra_id);

-- ------------------------------------------------------------------
-- Row Level Security
--   * profiles: cada uno lee el suyo; solo admin escribe.
--   * Económicas + config sensible (admin only): rubros, gastos, compromisos,
--       adicionales, ingresos, vencimientos_admin.
--   * Resto (compartidas admin+campo): acceso a cualquier usuario autenticado.
--   NOTA: el afinado por columna para 'campo' (ocultar plata en pedidos, etc.)
--   se endurece en Fase 1 cuando exista el capataz; en Fase 0 solo existe admin.
-- ------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.obras               enable row level security;
alter table public.rubros              enable row level security;
alter table public.etapas              enable row level security;
alter table public.gremios             enable row level security;
alter table public.personal            enable row level security;
alter table public.tareas              enable row level security;
alter table public.dependencias_tareas enable row level security;
alter table public.asistencias         enable row level security;
alter table public.ingresos_gremios    enable row level security;
alter table public.adicionales         enable row level security;
alter table public.gastos              enable row level security;
alter table public.compromisos         enable row level security;
alter table public.ingresos            enable row level security;
alter table public.materiales          enable row level security;
alter table public.pedidos_materiales  enable row level security;
alter table public.stock_eventos       enable row level security;
alter table public.diario_obra         enable row level security;
alter table public.fotos               enable row level security;
alter table public.vencimientos_admin  enable row level security;

-- profiles
create policy "profiles_select_self_or_admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles_admin_write" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Admin-only (económicas + config sensible)
create policy "rubros_admin"             on public.rubros             for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "gastos_admin"             on public.gastos             for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "compromisos_admin"        on public.compromisos        for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "adicionales_admin"        on public.adicionales        for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "ingresos_admin"           on public.ingresos           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "vencimientos_admin_admin" on public.vencimientos_admin for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Compartidas (cualquier usuario autenticado: admin o campo)
create policy "obras_rw"           on public.obras               for all to authenticated using (true) with check (true);
create policy "etapas_rw"          on public.etapas              for all to authenticated using (true) with check (true);
create policy "gremios_rw"         on public.gremios             for all to authenticated using (true) with check (true);
create policy "personal_rw"        on public.personal            for all to authenticated using (true) with check (true);
create policy "tareas_rw"          on public.tareas              for all to authenticated using (true) with check (true);
create policy "dep_tareas_rw"      on public.dependencias_tareas for all to authenticated using (true) with check (true);
create policy "asistencias_rw"     on public.asistencias         for all to authenticated using (true) with check (true);
create policy "ingresos_gremios_rw" on public.ingresos_gremios   for all to authenticated using (true) with check (true);
create policy "materiales_rw"      on public.materiales          for all to authenticated using (true) with check (true);
create policy "pedidos_rw"         on public.pedidos_materiales  for all to authenticated using (true) with check (true);
create policy "stock_eventos_rw"   on public.stock_eventos       for all to authenticated using (true) with check (true);
create policy "diario_rw"          on public.diario_obra         for all to authenticated using (true) with check (true);
create policy "fotos_rw"           on public.fotos               for all to authenticated using (true) with check (true);
