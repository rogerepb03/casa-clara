-- =====================================================================
--  CASA CLARA — Base de datos completa para Supabase (PostgreSQL)
--  App de gestión de propiedades, personas, finanzas familiares y documentos
--
--  CÓMO USARLO
--  1. Crea un proyecto NUEVO en supabase.com
--  2. Menú izquierdo → SQL Editor → New query
--  3. Pega TODO este archivo y presiona "Run"
--  4. Ejecútalo una sola vez (si lo corres dos veces dará error en los "create type")
--
--  ORDEN DEL ARCHIVO
--   0. Extensiones
--   1. Tipos (listas de valores permitidos)
--   2. Tablas
--   3. Funciones de ayuda para permisos
--   4. Seguridad por fila (RLS) — quién ve qué
--   5. Triggers (historial, fechas, usuarios nuevos)
--   6. Funciones de negocio (crear espacio, invitar, generar cobros, alertas)
--   7. Vistas para dashboards y reportes
--   8. Almacenamiento de archivos (Storage)
--   9. Tareas automáticas diarias (pg_cron)
-- =====================================================================


-- =====================================================================
-- 0. EXTENSIONES
-- =====================================================================
create extension if not exists pgcrypto;   -- genera ids (gen_random_uuid)
-- pg_cron se activa al final (sección 9)


-- =====================================================================
-- 1. TIPOS (enums). Para agregar un valor después:
--    alter type public.tipo_propiedad add value 'parcela';
-- =====================================================================
create type public.rol_miembro      as enum ('administrador','familiar','propietario','arrendatario','invitado');
create type public.estado_miembro   as enum ('invitado','activo','suspendido');
create type public.tipo_persona     as enum ('administrador','familiar','propietario','arrendatario','hijo','contacto_emergencia','proveedor','otro');
create type public.tipo_relacion    as enum ('padre_madre','hijo','conyuge','hermano','contacto_emergencia','otro');
create type public.tipo_propiedad   as enum ('casa','departamento','oficina','local','bodega','estacionamiento','terreno','otro');
create type public.estado_propiedad as enum ('disponible','arrendada','en_venta','en_mantencion','uso_propio');
create type public.rol_en_propiedad as enum ('propietario','arrendatario','administrador','residente','contacto_emergencia');
create type public.tipo_movimiento  as enum ('ingreso','gasto');
create type public.estado_pago      as enum ('pendiente','pagado','atrasado','anulado');
create type public.moneda           as enum ('CLP','UF','USD');
create type public.estado_contrato  as enum ('borrador','vigente','terminado','renovado');
create type public.tipo_documento   as enum ('contrato','escritura','foto','pdf','certificado','boleta','factura','otro');
create type public.estado_solicitud as enum ('abierta','en_proceso','resuelta','cancelada');
create type public.repeticion       as enum ('nunca','mensual','anual');


-- =====================================================================
-- 2. TABLAS
--    Regla: TODA tabla de datos tiene espacio_id (la familia/organización).
--    Eso aísla a cada familia cuando la app tenga miles de usuarios.
-- =====================================================================

-- 2.1 Espacios (una familia u organización)
create table public.espacios (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  plan        text not null default 'gratis',        -- para cobrar en el futuro
  moneda_base public.moneda not null default 'CLP',
  creado_por  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2.2 Perfiles (1 por usuario que inicia sesión)
create table public.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text,
  email       text,
  telefono    text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2.3 Miembros: quién entra a qué espacio y con qué rol
create table public.miembros (
  id          uuid primary key default gen_random_uuid(),
  espacio_id  uuid not null references public.espacios(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,   -- null mientras la invitación no se acepta
  email       text not null,
  rol         public.rol_miembro not null,
  estado      public.estado_miembro not null default 'invitado',
  permisos    jsonb not null default '{}'::jsonb,  -- {"finanzas":true,"documentos":false,"escribir":true,...}
  persona_id  uuid,                                -- su ficha en "personas" (se enlaza abajo)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (espacio_id, email)
);

-- 2.4 Personas: administradores, familiares, propietarios, arrendatarios, hijos, contactos
--     Una persona puede existir SIN cuenta en la app (ej. un contacto de emergencia).
create table public.personas (
  id          uuid primary key default gen_random_uuid(),
  espacio_id  uuid not null references public.espacios(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,  -- si tiene cuenta
  tipo        public.tipo_persona not null default 'otro',
  nombre      text not null,
  rut         text,
  email       text,
  telefono    text,
  fecha_nacimiento date,
  notas       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, espacio_id)
);
alter table public.miembros
  add constraint miembros_persona_fk foreign key (persona_id) references public.personas(id) on delete set null;

-- 2.5 Relaciones entre personas (padre-hijo, cónyuge, contacto de emergencia)
create table public.relaciones_personas (
  id                 uuid primary key default gen_random_uuid(),
  espacio_id         uuid not null references public.espacios(id) on delete cascade,
  persona_id         uuid not null,
  persona_relacionada_id uuid not null,
  tipo               public.tipo_relacion not null,
  created_at         timestamptz not null default now(),
  foreign key (persona_id, espacio_id) references public.personas(id, espacio_id) on delete cascade,
  foreign key (persona_relacionada_id, espacio_id) references public.personas(id, espacio_id) on delete cascade,
  check (persona_id <> persona_relacionada_id),
  unique (persona_id, persona_relacionada_id, tipo)
);

-- 2.6 Grupos familiares
create table public.grupos_familiares (
  id          uuid primary key default gen_random_uuid(),
  espacio_id  uuid not null references public.espacios(id) on delete cascade,
  nombre      text not null,
  descripcion text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, espacio_id)
);

create table public.miembros_grupo (
  id          uuid primary key default gen_random_uuid(),
  espacio_id  uuid not null references public.espacios(id) on delete cascade,
  grupo_id    uuid not null,
  persona_id  uuid not null,
  rol_en_grupo text default 'miembro',             -- jefe_hogar, miembro, hijo...
  foreign key (grupo_id, espacio_id) references public.grupos_familiares(id, espacio_id) on delete cascade,
  foreign key (persona_id, espacio_id) references public.personas(id, espacio_id) on delete cascade,
  unique (grupo_id, persona_id)
);

-- 2.7 Propiedades
create table public.propiedades (
  id          uuid primary key default gen_random_uuid(),
  espacio_id  uuid not null references public.espacios(id) on delete cascade,
  nombre      text not null,
  direccion   text,
  comuna      text,
  ciudad      text,
  tipo        public.tipo_propiedad not null default 'departamento',
  estado      public.estado_propiedad not null default 'disponible',
  valor       numeric(14,2),
  moneda_valor public.moneda not null default 'UF',
  rol_sii     text,
  metros2     numeric(8,2),
  foto_portada text,                                 -- ruta en Storage
  notas       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, espacio_id)
);

-- 2.8 Personas asociadas a propiedades (una persona en varias propiedades y viceversa)
create table public.propiedad_personas (
  id           uuid primary key default gen_random_uuid(),
  espacio_id   uuid not null references public.espacios(id) on delete cascade,
  propiedad_id uuid not null,
  persona_id   uuid not null,
  rol          public.rol_en_propiedad not null,
  porcentaje   numeric(5,2),                         -- % de propiedad, si aplica
  desde        date,
  hasta        date,
  foreign key (propiedad_id, espacio_id) references public.propiedades(id, espacio_id) on delete cascade,
  foreign key (persona_id, espacio_id) references public.personas(id, espacio_id) on delete cascade,
  unique (propiedad_id, persona_id, rol)
);

-- 2.9 Contratos de arriendo
create table public.contratos (
  id             uuid primary key default gen_random_uuid(),
  espacio_id     uuid not null references public.espacios(id) on delete cascade,
  propiedad_id   uuid not null,
  arrendatario_id uuid not null,                     -- persona
  fecha_inicio   date not null,
  fecha_termino  date,
  monto_arriendo numeric(14,2) not null,
  moneda         public.moneda not null default 'CLP',
  dia_pago       int not null default 5 check (dia_pago between 1 and 31),
  garantia       numeric(14,2),
  reajuste      text,                                -- ej. "IPC semestral"
  estado         public.estado_contrato not null default 'vigente',
  notas          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  foreign key (propiedad_id, espacio_id) references public.propiedades(id, espacio_id) on delete cascade,
  foreign key (arrendatario_id, espacio_id) references public.personas(id, espacio_id),
  unique (id, espacio_id),
  check (fecha_termino is null or fecha_termino >= fecha_inicio)
);

-- 2.10 Categorías de ingresos y gastos
create table public.categorias (
  id          uuid primary key default gen_random_uuid(),
  espacio_id  uuid not null references public.espacios(id) on delete cascade,
  nombre      text not null,
  tipo        public.tipo_movimiento not null,
  icono       text,
  color       text,
  unique (espacio_id, nombre, tipo),
  unique (id, espacio_id)
);

-- 2.11 Plantillas recurrentes (gastos comunes, luz, colegio, dividendo...)
create table public.plantillas_recurrentes (
  id            uuid primary key default gen_random_uuid(),
  espacio_id    uuid not null references public.espacios(id) on delete cascade,
  tipo          public.tipo_movimiento not null,
  categoria_id  uuid,
  descripcion   text not null,
  monto         numeric(14,2) not null,
  moneda        public.moneda not null default 'CLP',
  dia_mes       int not null default 10 check (dia_mes between 1 and 31),
  propiedad_id  uuid,
  grupo_id      uuid,
  persona_id    uuid,
  activa        boolean not null default true,
  created_at    timestamptz not null default now(),
  foreign key (categoria_id, espacio_id) references public.categorias(id, espacio_id),
  foreign key (propiedad_id, espacio_id) references public.propiedades(id, espacio_id) on delete cascade,
  foreign key (grupo_id, espacio_id) references public.grupos_familiares(id, espacio_id) on delete set null (grupo_id),
  foreign key (persona_id, espacio_id) references public.personas(id, espacio_id) on delete set null (persona_id)
);

-- 2.12 Movimientos: ingresos, gastos, pagos, arriendos, servicios, mantenciones, gastos comunes
create table public.movimientos (
  id               uuid primary key default gen_random_uuid(),
  espacio_id       uuid not null references public.espacios(id) on delete cascade,
  tipo             public.tipo_movimiento not null,
  categoria_id     uuid,
  descripcion      text not null,
  monto            numeric(14,2) not null check (monto >= 0),
  moneda           public.moneda not null default 'CLP',
  fecha            date not null default current_date,     -- fecha contable
  fecha_vencimiento date,
  estado           public.estado_pago not null default 'pagado',
  pagado_en        timestamptz,
  medio_pago       text,                                   -- transferencia, efectivo, tarjeta
  propiedad_id     uuid,
  grupo_id         uuid,
  persona_id       uuid,
  contrato_id      uuid,
  deuda_id         uuid,
  plantilla_id     uuid references public.plantillas_recurrentes(id) on delete set null,
  periodo          date,                                   -- 1er día del mes al que corresponde
  comprobante      text,                                   -- ruta en Storage
  notas            text,
  creado_por       uuid default auth.uid() references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (categoria_id, espacio_id) references public.categorias(id, espacio_id),
  foreign key (propiedad_id, espacio_id) references public.propiedades(id, espacio_id) on delete set null (propiedad_id),
  foreign key (grupo_id, espacio_id) references public.grupos_familiares(id, espacio_id) on delete set null (grupo_id),
  foreign key (persona_id, espacio_id) references public.personas(id, espacio_id) on delete set null (persona_id),
  foreign key (contrato_id, espacio_id) references public.contratos(id, espacio_id) on delete set null (contrato_id),
  unique (contrato_id, periodo),     -- un cobro de arriendo por contrato y mes
  unique (plantilla_id, periodo)     -- un cargo recurrente por plantilla y mes
);
create index on public.movimientos (espacio_id, fecha);
create index on public.movimientos (espacio_id, estado, fecha_vencimiento);
create index on public.movimientos (propiedad_id);

-- 2.13 Deudas (créditos hipotecarios, préstamos, tarjetas)
create table public.deudas (
  id            uuid primary key default gen_random_uuid(),
  espacio_id    uuid not null references public.espacios(id) on delete cascade,
  nombre        text not null,
  acreedor      text,
  monto_total   numeric(14,2) not null,
  saldo         numeric(14,2) not null,
  moneda        public.moneda not null default 'CLP',
  tasa_anual    numeric(6,3),
  cuota         numeric(14,2),
  dia_pago      int check (dia_pago between 1 and 31),
  fecha_termino date,
  propiedad_id  uuid,
  persona_id    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (propiedad_id, espacio_id) references public.propiedades(id, espacio_id) on delete set null (propiedad_id),
  foreign key (persona_id, espacio_id) references public.personas(id, espacio_id) on delete set null (persona_id)
);
alter table public.movimientos
  add constraint movimientos_deuda_fk foreign key (deuda_id) references public.deudas(id) on delete set null;

-- 2.14 Presupuestos mensuales por categoría (y opcionalmente por grupo familiar)
create table public.presupuestos (
  id            uuid primary key default gen_random_uuid(),
  espacio_id    uuid not null references public.espacios(id) on delete cascade,
  grupo_id      uuid,
  categoria_id  uuid not null,
  mes           date not null,                      -- 1er día del mes
  monto         numeric(14,2) not null,
  moneda        public.moneda not null default 'CLP',
  foreign key (grupo_id, espacio_id) references public.grupos_familiares(id, espacio_id) on delete cascade,
  foreign key (categoria_id, espacio_id) references public.categorias(id, espacio_id) on delete cascade,
  unique nulls not distinct (espacio_id, grupo_id, categoria_id, mes)
);

-- 2.15 Documentos (contratos, escrituras, fotos, PDFs, certificados, boletas, facturas)
create table public.documentos (
  id            uuid primary key default gen_random_uuid(),
  espacio_id    uuid not null references public.espacios(id) on delete cascade,
  nombre        text not null,
  tipo          public.tipo_documento not null default 'otro',
  ruta_archivo  text not null unique,                -- {espacio_id}/{carpeta}/{archivo}
  mime_type     text,
  tamano_bytes  bigint,
  propiedad_id  uuid,
  persona_id    uuid,
  contrato_id   uuid,
  movimiento_id uuid references public.movimientos(id) on delete set null,
  vence_el      date,                                -- certificados, seguros
  visible_arrendatario boolean not null default false,
  visible_propietario  boolean not null default true,
  subido_por    uuid default auth.uid() references auth.users(id),
  created_at    timestamptz not null default now(),
  foreign key (propiedad_id, espacio_id) references public.propiedades(id, espacio_id) on delete cascade,
  foreign key (persona_id, espacio_id) references public.personas(id, espacio_id) on delete set null (persona_id),
  foreign key (contrato_id, espacio_id) references public.contratos(id, espacio_id) on delete set null (contrato_id)
);
create index on public.documentos (propiedad_id);

-- 2.16 Solicitudes y mantenciones (arrendatario pide, administrador gestiona)
create table public.solicitudes (
  id            uuid primary key default gen_random_uuid(),
  espacio_id    uuid not null references public.espacios(id) on delete cascade,
  propiedad_id  uuid not null,
  titulo        text not null,
  descripcion   text,
  es_mantencion boolean not null default false,      -- true = mantención programada por el admin
  estado        public.estado_solicitud not null default 'abierta',
  prioridad     int not null default 2 check (prioridad between 1 and 3),
  fecha_programada date,
  costo         numeric(14,2),
  creada_por    uuid not null default auth.uid() references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (propiedad_id, espacio_id) references public.propiedades(id, espacio_id) on delete cascade
);

-- 2.17 Recordatorios personalizados
create table public.recordatorios (
  id            uuid primary key default gen_random_uuid(),
  espacio_id    uuid not null references public.espacios(id) on delete cascade,
  titulo        text not null,
  detalle       text,
  fecha         date not null,
  dias_aviso    int not null default 1 check (dias_aviso >= 0),
  repetir       public.repeticion not null default 'nunca',
  propiedad_id  uuid,
  persona_id    uuid,
  creado_por    uuid not null default auth.uid() references auth.users(id),
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  foreign key (propiedad_id, espacio_id) references public.propiedades(id, espacio_id) on delete cascade,
  foreign key (persona_id, espacio_id) references public.personas(id, espacio_id) on delete set null (persona_id)
);

-- 2.18 Notificaciones (bandeja dentro de la app + origen del push)
create table public.notificaciones (
  id          uuid primary key default gen_random_uuid(),
  espacio_id  uuid references public.espacios(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  tipo        text not null,             -- pago, contrato, documento, recordatorio, mantencion
  titulo      text not null,
  cuerpo      text,
  ref_tabla   text,
  ref_id      uuid,
  clave       text not null,             -- evita duplicados
  leida       boolean not null default false,
  enviada_push_en timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, clave)
);
create index on public.notificaciones (user_id, leida, created_at desc);

-- 2.19 Dispositivos (token FCM de cada teléfono para push)
create table public.dispositivos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  token_fcm   text not null unique,
  plataforma  text,                       -- ios, android, web
  updated_at  timestamptz not null default now()
);

-- 2.20 Historial (auditoría automática de cambios)
create table public.historial (
  id          bigserial primary key,
  espacio_id  uuid,
  tabla       text not null,
  registro_id uuid,
  accion      text not null,              -- INSERT, UPDATE, DELETE
  cambiado_por uuid,
  antes       jsonb,
  despues     jsonb,
  created_at  timestamptz not null default now()
);
create index on public.historial (tabla, registro_id, created_at desc);


-- =====================================================================
-- 3. FUNCIONES DE AYUDA PARA PERMISOS
--    "security definer" = se ejecutan con permisos del dueño de la base,
--    para poder consultar "miembros" sin caer en un círculo de RLS.
-- =====================================================================

create or replace function public.mi_rol(p_espacio uuid)
returns public.rol_miembro
language sql stable security definer set search_path = public as $$
  select rol from public.miembros
  where espacio_id = p_espacio and user_id = auth.uid() and estado = 'activo'
  limit 1;
$$;

create or replace function public.es_admin(p_espacio uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.mi_rol(p_espacio) = 'administrador', false);
$$;

-- ¿Puede LEER el módulo? (propiedades, personas, finanzas, documentos, familia)
create or replace function public.puede_leer(p_espacio uuid, p_modulo text)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when m.rol = 'administrador' then true
      when m.rol in ('familiar','invitado') then coalesce((m.permisos ->> p_modulo)::boolean, false)
      else false
    end
    from public.miembros m
    where m.espacio_id = p_espacio and m.user_id = auth.uid() and m.estado = 'activo'
    limit 1
  ), false);
$$;

-- ¿Puede CREAR / EDITAR / BORRAR en el módulo? (invitado nunca)
create or replace function public.puede_escribir(p_espacio uuid, p_modulo text)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when m.rol = 'administrador' then true
      when m.rol = 'familiar' then coalesce((m.permisos ->> p_modulo)::boolean, false)
                               and coalesce((m.permisos ->> 'escribir')::boolean, false)
      else false
    end
    from public.miembros m
    where m.espacio_id = p_espacio and m.user_id = auth.uid() and m.estado = 'activo'
    limit 1
  ), false);
$$;

-- Fichas de persona del usuario actual
create or replace function public.mis_personas()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.personas where user_id = auth.uid();
$$;

-- Propiedades donde el usuario actual es propietario / arrendatario
create or replace function public.mis_propiedades(p_rol public.rol_en_propiedad)
returns setof uuid
language sql stable security definer set search_path = public as $$
  select pp.propiedad_id
  from public.propiedad_personas pp
  join public.personas pe on pe.id = pp.persona_id
  where pe.user_id = auth.uid()
    and pp.rol = p_rol
    and (pp.hasta is null or pp.hasta >= current_date);
$$;

-- Contratos donde el usuario actual es el arrendatario
create or replace function public.mis_contratos()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select c.id from public.contratos c
  join public.personas pe on pe.id = c.arrendatario_id
  where pe.user_id = auth.uid();
$$;

-- Formato de montos para avisos: $550.000 · UF 12,50 · US$ 1.234,00
create or replace function public.formato_monto(p_monto numeric, p_moneda public.moneda)
returns text language sql immutable as $$
  select case p_moneda
    when 'CLP' then '$' || replace(to_char(round(p_monto), 'FM999,999,999,990'), ',', '.')
    when 'UF'  then 'UF ' || translate(to_char(p_monto, 'FM999,999,990.00'), ',.', '.,')
    else 'US$ ' || translate(to_char(p_monto, 'FM999,999,990.00'), ',.', '.,')
  end;
$$;

-- ¿El usuario actual comparte algún espacio con este otro usuario?
create or replace function public.comparte_espacio(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.miembros a
    join public.miembros b on b.espacio_id = a.espacio_id
    where a.user_id = auth.uid() and a.estado = 'activo' and b.user_id = p_user);
$$;

-- Convierte texto a uuid sin romperse (para rutas de Storage)
create or replace function public.uuid_o_nulo(t text)
returns uuid language plpgsql immutable as $$
begin
  return t::uuid;
exception when others then
  return null;
end $$;


-- =====================================================================
-- 4. SEGURIDAD POR FILA (RLS)
-- =====================================================================

-- 4.1 Reglas estándar por módulo para el equipo interno (admin / familiar / invitado)
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('propiedades',            'propiedades'),
      ('propiedad_personas',     'propiedades'),
      ('solicitudes',            'propiedades'),
      ('personas',               'personas'),
      ('relaciones_personas',    'personas'),
      ('grupos_familiares',      'familia'),
      ('miembros_grupo',         'familia'),
      ('presupuestos',           'familia'),
      ('contratos',              'finanzas'),
      ('categorias',             'finanzas'),
      ('plantillas_recurrentes', 'finanzas'),
      ('movimientos',            'finanzas'),
      ('deudas',                 'finanzas'),
      ('documentos',             'documentos'),
      ('recordatorios',          'propiedades')
    ) as x(tabla, modulo)
  loop
    execute format('alter table public.%I enable row level security', t.tabla);
    execute format('create policy %I on public.%I for select to authenticated using (public.puede_leer(espacio_id, %L))',
                   t.tabla || '_equipo_leer', t.tabla, t.modulo);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.puede_escribir(espacio_id, %L))',
                   t.tabla || '_equipo_crear', t.tabla, t.modulo);
    execute format('create policy %I on public.%I for update to authenticated using (public.puede_escribir(espacio_id, %L)) with check (public.puede_escribir(espacio_id, %L))',
                   t.tabla || '_equipo_editar', t.tabla, t.modulo, t.modulo);
    execute format('create policy %I on public.%I for delete to authenticated using (public.puede_escribir(espacio_id, %L))',
                   t.tabla || '_equipo_borrar', t.tabla, t.modulo);
  end loop;
end $$;

-- 4.2 Reglas extra para PROPIETARIOS y ARRENDATARIOS (acceso externo, solo lo suyo)

-- Propiedades: ven las suyas
create policy propiedades_externos_leer on public.propiedades for select to authenticated
  using (id in (select public.mis_propiedades('propietario'))
      or id in (select public.mis_propiedades('arrendatario')));

-- Su propia ficha de persona
create policy personas_propia_leer on public.personas for select to authenticated
  using (user_id = auth.uid());

-- Contratos: el arrendatario ve el suyo; el propietario ve los de sus inmuebles
create policy contratos_externos_leer on public.contratos for select to authenticated
  using (id in (select public.mis_contratos())
      or propiedad_id in (select public.mis_propiedades('propietario')));

-- Movimientos: el arrendatario ve sus cobros; el propietario ve ingresos/gastos de sus inmuebles
create policy movimientos_externos_leer on public.movimientos for select to authenticated
  using (contrato_id in (select public.mis_contratos())
      or propiedad_id in (select public.mis_propiedades('propietario')));

-- Documentos: solo los marcados como visibles para cada rol
create policy documentos_externos_leer on public.documentos for select to authenticated
  using (
       (visible_arrendatario and (contrato_id in (select public.mis_contratos())
                                  or propiedad_id in (select public.mis_propiedades('arrendatario'))))
    or (visible_propietario and propiedad_id in (select public.mis_propiedades('propietario')))
    or persona_id in (select public.mis_personas())
  );

-- Solicitudes: el arrendatario crea y ve las de su propiedad; el propietario las ve
create policy solicitudes_externos_leer on public.solicitudes for select to authenticated
  using (propiedad_id in (select public.mis_propiedades('arrendatario'))
      or propiedad_id in (select public.mis_propiedades('propietario')));

create policy solicitudes_arrendatario_crear on public.solicitudes for insert to authenticated
  with check (propiedad_id in (select public.mis_propiedades('arrendatario'))
              and creada_por = auth.uid()
              and es_mantencion = false
              and estado = 'abierta');

-- Recordatorios: cada uno ve los que creó
create policy recordatorios_propios on public.recordatorios for all to authenticated
  using (creado_por = auth.uid() and public.mi_rol(espacio_id) is not null)
  with check (creado_por = auth.uid() and public.mi_rol(espacio_id) is not null);

-- 4.3 Tablas de sistema
alter table public.espacios       enable row level security;
alter table public.perfiles       enable row level security;
alter table public.miembros       enable row level security;
alter table public.notificaciones enable row level security;
alter table public.dispositivos   enable row level security;
alter table public.historial      enable row level security;

create policy espacios_leer   on public.espacios for select to authenticated using (public.mi_rol(id) is not null);
create policy espacios_editar on public.espacios for update to authenticated using (public.es_admin(id)) with check (public.es_admin(id));
-- (los espacios se crean con la función crear_espacio, no con insert directo)

create policy perfiles_leer on public.perfiles for select to authenticated
  using (id = auth.uid() or public.comparte_espacio(id));
create policy perfiles_editar on public.perfiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy miembros_leer on public.miembros for select to authenticated
  using (user_id = auth.uid() or public.es_admin(espacio_id));
create policy miembros_admin_crear  on public.miembros for insert to authenticated with check (public.es_admin(espacio_id));
create policy miembros_admin_editar on public.miembros for update to authenticated using (public.es_admin(espacio_id)) with check (public.es_admin(espacio_id));
create policy miembros_admin_borrar on public.miembros for delete to authenticated using (public.es_admin(espacio_id) and user_id is distinct from auth.uid());

create policy notificaciones_propias_leer   on public.notificaciones for select to authenticated using (user_id = auth.uid());
create policy notificaciones_propias_editar on public.notificaciones for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notificaciones_propias_borrar on public.notificaciones for delete to authenticated using (user_id = auth.uid());

create policy dispositivos_propios on public.dispositivos for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy historial_admin_leer on public.historial for select to authenticated using (public.es_admin(espacio_id));


-- =====================================================================
-- 5. TRIGGERS
-- =====================================================================

-- 5.1 updated_at automático
create or replace function public.tocar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['espacios','perfiles','miembros','personas','grupos_familiares','propiedades',
                           'contratos','movimientos','deudas','solicitudes','dispositivos']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.tocar_updated_at()',
                   t || '_updated_at', t);
  end loop;
end $$;

-- 5.2 Historial de cambios (auditoría)
create or replace function public.registrar_historial()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_fila jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.historial (espacio_id, tabla, registro_id, accion, cambiado_por, antes, despues)
  values ((v_fila ->> 'espacio_id')::uuid, tg_table_name, (v_fila ->> 'id')::uuid, tg_op, auth.uid(),
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['propiedades','personas','contratos','movimientos','documentos','deudas','miembros']
  loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.registrar_historial()',
                   t || '_historial', t);
  end loop;
end $$;

-- 5.3 Permisos por defecto al crear un miembro
create or replace function public.permisos_por_defecto()
returns trigger language plpgsql as $$
begin
  if new.permisos = '{}'::jsonb then
    new.permisos := case new.rol
      when 'familiar' then '{"propiedades":true,"personas":true,"finanzas":true,"documentos":true,"familia":true,"escribir":true}'::jsonb
      when 'invitado' then '{"propiedades":true}'::jsonb
      else '{}'::jsonb
    end;
  end if;
  new.email := lower(trim(new.email));
  return new;
end $$;

create trigger miembros_permisos before insert on public.miembros
  for each row execute function public.permisos_por_defecto();

-- 5.4 Usuario nuevo: crear perfil y aceptar invitaciones pendientes con su correo
create or replace function public.al_registrar_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, email, nombre)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  update public.miembros
     set user_id = new.id, estado = 'activo'
   where lower(email) = lower(new.email) and user_id is null and estado = 'invitado';

  -- enlaza la ficha de persona indicada en la invitación
  update public.personas p
     set user_id = new.id
    from public.miembros m
   where m.user_id = new.id and m.persona_id = p.id and p.user_id is null;

  return new;
end $$;

create trigger al_registrar_usuario after insert on auth.users
  for each row execute function public.al_registrar_usuario();


-- =====================================================================
-- 6. FUNCIONES DE NEGOCIO (se llaman desde FlutterFlow como "Supabase RPC")
-- =====================================================================

-- 6.1 Crear un espacio (familia). Quien lo crea queda como administrador.
create or replace function public.crear_espacio(p_nombre text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_persona uuid;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  select email into v_email from auth.users where id = auth.uid();

  insert into public.espacios (nombre, creado_por) values (p_nombre, auth.uid()) returning id into v_id;

  insert into public.personas (espacio_id, user_id, tipo, nombre, email)
  values (v_id, auth.uid(), 'administrador', coalesce((select nombre from public.perfiles where id = auth.uid()), v_email), v_email)
  returning id into v_persona;

  insert into public.miembros (espacio_id, user_id, email, rol, estado, persona_id)
  values (v_id, auth.uid(), v_email, 'administrador', 'activo', v_persona);

  insert into public.categorias (espacio_id, nombre, tipo)
  select v_id, n, t::public.tipo_movimiento from (values
    ('Arriendo','ingreso'),('Sueldo','ingreso'),('Otros ingresos','ingreso'),
    ('Gastos comunes','gasto'),('Luz','gasto'),('Agua','gasto'),('Gas','gasto'),('Internet','gasto'),
    ('Contribuciones','gasto'),('Mantención','gasto'),('Dividendo / crédito','gasto'),('Seguros','gasto'),
    ('Supermercado','gasto'),('Educación','gasto'),('Salud','gasto'),('Transporte','gasto'),('Otros gastos','gasto')
  ) as x(n, t);

  return v_id;
end $$;

-- 6.2 Invitar a alguien (familiar, propietario, arrendatario, invitado)
--     Si ya tiene cuenta, queda activo de inmediato; si no, al registrarse con ese correo.
create or replace function public.invitar_miembro(p_espacio uuid, p_email text, p_rol public.rol_miembro, p_persona uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_id uuid;
begin
  if not public.es_admin(p_espacio) then
    raise exception 'Solo un administrador puede invitar';
  end if;
  if p_persona is not null and not exists (select 1 from public.personas where id = p_persona and espacio_id = p_espacio) then
    raise exception 'La persona no pertenece a este espacio';
  end if;

  select id into v_user from auth.users where lower(email) = lower(trim(p_email));

  insert into public.miembros (espacio_id, user_id, email, rol, estado, persona_id)
  values (p_espacio, v_user, p_email, p_rol, case when v_user is null then 'invitado' else 'activo' end::public.estado_miembro, p_persona)
  on conflict (espacio_id, email) do update set rol = excluded.rol, persona_id = excluded.persona_id
  returning id into v_id;

  if v_user is not null and p_persona is not null then
    update public.personas set user_id = v_user where id = p_persona and user_id is null;
  end if;
  return v_id;
end $$;

-- 6.3 Registrar un pago (marca pagado y, si es cuota de deuda, baja el saldo)
create or replace function public.marcar_pagado(p_movimiento uuid, p_medio text default null)
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_mov public.movimientos;
begin
  update public.movimientos
     set estado = 'pagado', pagado_en = now(), medio_pago = coalesce(p_medio, medio_pago)
   where id = p_movimiento and estado in ('pendiente','atrasado')
  returning * into v_mov;

  if v_mov.id is null then
    raise exception 'Movimiento no encontrado, ya pagado o sin permiso';
  end if;

  if v_mov.deuda_id is not null then
    update public.deudas set saldo = greatest(saldo - v_mov.monto, 0) where id = v_mov.deuda_id;
  end if;
end $$;

-- 6.4 Generar los cobros del mes: arriendos de contratos vigentes + plantillas recurrentes
--     Se ejecuta solo el día 1 de cada mes (sección 9). Es seguro correrlo varias veces.
create or replace function public.generar_movimientos_mes(p_mes date default current_date)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_periodo date := date_trunc('month', p_mes)::date;
  v_fin     date := (date_trunc('month', p_mes) + interval '1 month - 1 day')::date;
  v_n1 int; v_n2 int;
begin
  insert into public.movimientos (espacio_id, tipo, categoria_id, descripcion, monto, moneda, fecha, fecha_vencimiento,
                                  estado, propiedad_id, persona_id, contrato_id, periodo, creado_por)
  select c.espacio_id, 'ingreso',
         (select id from public.categorias k where k.espacio_id = c.espacio_id and k.nombre = 'Arriendo' and k.tipo = 'ingreso' limit 1),
         'Arriendo ' || p.nombre || ' ' || to_char(v_periodo, 'MM/YYYY'),
         c.monto_arriendo, c.moneda,
         least(v_periodo + (c.dia_pago - 1), v_fin), least(v_periodo + (c.dia_pago - 1), v_fin),
         'pendiente', c.propiedad_id, c.arrendatario_id, c.id, v_periodo, null
  from public.contratos c
  join public.propiedades p on p.id = c.propiedad_id
  where c.estado = 'vigente'
    and c.fecha_inicio <= v_fin
    and (c.fecha_termino is null or c.fecha_termino >= v_periodo)
  on conflict (contrato_id, periodo) do nothing;
  get diagnostics v_n1 = row_count;

  insert into public.movimientos (espacio_id, tipo, categoria_id, descripcion, monto, moneda, fecha, fecha_vencimiento,
                                  estado, propiedad_id, grupo_id, persona_id, plantilla_id, periodo, creado_por)
  select t.espacio_id, t.tipo, t.categoria_id, t.descripcion || ' ' || to_char(v_periodo, 'MM/YYYY'),
         t.monto, t.moneda,
         least(v_periodo + (t.dia_mes - 1), v_fin), least(v_periodo + (t.dia_mes - 1), v_fin),
         'pendiente', t.propiedad_id, t.grupo_id, t.persona_id, t.id, v_periodo, null
  from public.plantillas_recurrentes t
  where t.activa
  on conflict (plantilla_id, periodo) do nothing;
  get diagnostics v_n2 = row_count;

  return v_n1 + v_n2;
end $$;

-- 6.5 Alertas diarias: crea notificaciones (y con ellas, los push)
create or replace function public.generar_alertas(p_hoy date default current_date)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_total int := 0;
  v_n int;
begin
  -- a) Pendientes vencidos pasan a "atrasado"
  update public.movimientos set estado = 'atrasado'
   where estado = 'pendiente' and fecha_vencimiento < p_hoy;

  -- b) Pagos que vencen en 3 días, hoy, o atrasados (aviso a administradores y familiares con finanzas)
  insert into public.notificaciones (espacio_id, user_id, tipo, titulo, cuerpo, ref_tabla, ref_id, clave)
  select m.espacio_id, mi.user_id, 'pago',
         case when m.estado = 'atrasado' then 'Pago atrasado'
              when m.fecha_vencimiento = p_hoy then 'Vence hoy'
              else 'Vence en 3 días' end,
         m.descripcion || ' — ' || public.formato_monto(m.monto, m.moneda),
         'movimientos', m.id,
         'mov-' || m.id || '-' || case when m.estado = 'atrasado' then 'atrasado'
                                       when m.fecha_vencimiento = p_hoy then 'hoy' else '3d' end
  from public.movimientos m
  join public.miembros mi on mi.espacio_id = m.espacio_id and mi.estado = 'activo' and mi.user_id is not null
       and (mi.rol = 'administrador' or (mi.rol = 'familiar' and coalesce((mi.permisos->>'finanzas')::boolean,false)))
  where (m.estado = 'pendiente' and m.fecha_vencimiento in (p_hoy, p_hoy + 3))
     or (m.estado = 'atrasado' and m.fecha_vencimiento = p_hoy - 1)
  on conflict (user_id, clave) do nothing;
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  -- c) Lo mismo para el arrendatario de cada cobro de arriendo
  insert into public.notificaciones (espacio_id, user_id, tipo, titulo, cuerpo, ref_tabla, ref_id, clave)
  select m.espacio_id, pe.user_id, 'pago',
         case when m.estado = 'atrasado' then 'Tu arriendo está atrasado'
              when m.fecha_vencimiento = p_hoy then 'Tu arriendo vence hoy'
              else 'Tu arriendo vence en 3 días' end,
         m.descripcion || ' — ' || public.formato_monto(m.monto, m.moneda),
         'movimientos', m.id,
         'arr-' || m.id || '-' || case when m.estado = 'atrasado' then 'atrasado'
                                       when m.fecha_vencimiento = p_hoy then 'hoy' else '3d' end
  from public.movimientos m
  join public.contratos c on c.id = m.contrato_id
  join public.personas pe on pe.id = c.arrendatario_id and pe.user_id is not null
  where (m.estado = 'pendiente' and m.fecha_vencimiento in (p_hoy, p_hoy + 3))
     or (m.estado = 'atrasado' and m.fecha_vencimiento = p_hoy - 1)
  on conflict (user_id, clave) do nothing;
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  -- d) Contratos que terminan en 60 y 30 días (renovación)
  insert into public.notificaciones (espacio_id, user_id, tipo, titulo, cuerpo, ref_tabla, ref_id, clave)
  select c.espacio_id, mi.user_id, 'contrato',
         'Contrato termina en ' || (c.fecha_termino - p_hoy) || ' días',
         p.nombre || ': evaluar renovación antes del ' || to_char(c.fecha_termino, 'DD/MM/YYYY'),
         'contratos', c.id, 'contrato-' || c.id || '-' || (c.fecha_termino - p_hoy)
  from public.contratos c
  join public.propiedades p on p.id = c.propiedad_id
  join public.miembros mi on mi.espacio_id = c.espacio_id and mi.rol = 'administrador' and mi.estado = 'activo' and mi.user_id is not null
  where c.estado = 'vigente' and c.fecha_termino - p_hoy in (60, 30)
  on conflict (user_id, clave) do nothing;
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  -- e) Documentos que vencen en 30 días (certificados, seguros)
  insert into public.notificaciones (espacio_id, user_id, tipo, titulo, cuerpo, ref_tabla, ref_id, clave)
  select d.espacio_id, mi.user_id, 'documento', 'Documento por vencer',
         d.nombre || ' vence el ' || to_char(d.vence_el, 'DD/MM/YYYY'),
         'documentos', d.id, 'doc-' || d.id || '-30'
  from public.documentos d
  join public.miembros mi on mi.espacio_id = d.espacio_id and mi.rol = 'administrador' and mi.estado = 'activo' and mi.user_id is not null
  where d.vence_el = p_hoy + 30
  on conflict (user_id, clave) do nothing;
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  -- f) Mantenciones programadas para mañana
  insert into public.notificaciones (espacio_id, user_id, tipo, titulo, cuerpo, ref_tabla, ref_id, clave)
  select s.espacio_id, mi.user_id, 'mantencion', 'Mantención mañana',
         s.titulo || ' — ' || p.nombre, 'solicitudes', s.id, 'mant-' || s.id || '-' || s.fecha_programada
  from public.solicitudes s
  join public.propiedades p on p.id = s.propiedad_id
  join public.miembros mi on mi.espacio_id = s.espacio_id and mi.rol = 'administrador' and mi.estado = 'activo' and mi.user_id is not null
  where s.fecha_programada = p_hoy + 1 and s.estado in ('abierta','en_proceso')
  on conflict (user_id, clave) do nothing;
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  -- g) Recordatorios personalizados
  insert into public.notificaciones (espacio_id, user_id, tipo, titulo, cuerpo, ref_tabla, ref_id, clave)
  select r.espacio_id, r.creado_por, 'recordatorio', r.titulo,
         coalesce(r.detalle, '') || ' (' || to_char(r.fecha, 'DD/MM/YYYY') || ')',
         'recordatorios', r.id, 'rec-' || r.id || '-' || r.fecha
  from public.recordatorios r
  where r.activo and r.fecha - r.dias_aviso = p_hoy
  on conflict (user_id, clave) do nothing;
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  -- h) Recordatorios repetitivos ya pasados avanzan a su próxima fecha
  update public.recordatorios
     set fecha = case repetir when 'mensual' then (fecha + interval '1 month')::date
                              when 'anual'   then (fecha + interval '1 year')::date end
   where activo and repetir <> 'nunca' and fecha < p_hoy;
  update public.recordatorios set activo = false
   where activo and repetir = 'nunca' and fecha < p_hoy;

  return v_total;
end $$;

-- Solo el sistema (cron) debe ejecutar estas dos funciones
revoke execute on function public.generar_movimientos_mes(date) from public, anon, authenticated;
revoke execute on function public.generar_alertas(date) from public, anon, authenticated;
revoke execute on function public.uuid_o_nulo(text) from anon;


-- =====================================================================
-- 7. VISTAS PARA DASHBOARD Y REPORTES
--    security_invoker = respetan los permisos (RLS) de quien consulta.
-- =====================================================================

-- 7.1 Resumen mensual (ingresos, gastos, saldo) por moneda
create view public.v_resumen_mensual with (security_invoker = true) as
select espacio_id,
       date_trunc('month', fecha)::date as mes,
       moneda,
       sum(monto) filter (where tipo = 'ingreso') as ingresos,
       sum(monto) filter (where tipo = 'gasto')   as gastos,
       coalesce(sum(monto) filter (where tipo = 'ingreso'), 0)
     - coalesce(sum(monto) filter (where tipo = 'gasto'), 0) as saldo
from public.movimientos
where estado = 'pagado'
group by 1, 2, 3;

-- 7.2 Gastos del mes por categoría (gráfico de torta)
create view public.v_gastos_por_categoria with (security_invoker = true) as
select m.espacio_id,
       date_trunc('month', m.fecha)::date as mes,
       m.moneda,
       coalesce(c.nombre, 'Sin categoría') as categoria,
       sum(m.monto) as total
from public.movimientos m
left join public.categorias c on c.id = m.categoria_id
where m.tipo = 'gasto' and m.estado = 'pagado'
group by 1, 2, 3, 4;

-- 7.3 Resultado por propiedad (cuánto rinde cada una)
create view public.v_resultado_propiedad with (security_invoker = true) as
select p.espacio_id, p.id as propiedad_id, p.nombre,
       date_trunc('month', m.fecha)::date as mes,
       m.moneda,
       coalesce(sum(m.monto) filter (where m.tipo = 'ingreso'), 0) as ingresos,
       coalesce(sum(m.monto) filter (where m.tipo = 'gasto'), 0)   as gastos,
       coalesce(sum(m.monto) filter (where m.tipo = 'ingreso'), 0)
     - coalesce(sum(m.monto) filter (where m.tipo = 'gasto'), 0)   as resultado
from public.propiedades p
join public.movimientos m on m.propiedad_id = p.id and m.estado = 'pagado'
group by 1, 2, 3, 4, 5;

-- 7.4 Próximos vencimientos (pantalla de inicio)
create view public.v_proximos_vencimientos with (security_invoker = true) as
select espacio_id, 'pago'::text as tipo, id as ref_id, descripcion as titulo,
       fecha_vencimiento as fecha, monto, moneda, propiedad_id, estado::text as estado
from public.movimientos
where estado in ('pendiente','atrasado')
union all
select c.espacio_id, 'contrato', c.id, 'Término contrato ' || p.nombre,
       c.fecha_termino, c.monto_arriendo, c.moneda, c.propiedad_id, c.estado::text
from public.contratos c join public.propiedades p on p.id = c.propiedad_id
where c.estado = 'vigente' and c.fecha_termino between current_date and current_date + 90
union all
select espacio_id, 'documento', id, 'Vence: ' || nombre, vence_el, null, null, propiedad_id, null
from public.documentos
where vence_el between current_date and current_date + 60;

-- 7.5 Presupuesto vs real del mes
create view public.v_presupuesto_vs_real with (security_invoker = true) as
select pr.espacio_id, pr.grupo_id, pr.mes, c.nombre as categoria, pr.moneda,
       pr.monto as presupuesto,
       coalesce((select sum(m.monto) from public.movimientos m
                 where m.categoria_id = pr.categoria_id and m.estado = 'pagado' and m.moneda = pr.moneda
                   and date_trunc('month', m.fecha) = pr.mes
                   and (pr.grupo_id is null or m.grupo_id = pr.grupo_id)), 0) as gastado
from public.presupuestos pr
join public.categorias c on c.id = pr.categoria_id;

-- 7.6 Indicadores del dashboard (tarjetas)
create view public.v_indicadores with (security_invoker = true) as
select e.id as espacio_id,
       (select count(*) from public.propiedades p where p.espacio_id = e.id) as propiedades,
       (select count(*) from public.propiedades p where p.espacio_id = e.id and p.estado = 'arrendada') as arrendadas,
       (select count(*) from public.movimientos m where m.espacio_id = e.id and m.estado = 'atrasado') as pagos_atrasados,
       (select coalesce(sum(m.monto),0) from public.movimientos m where m.espacio_id = e.id and m.estado in ('pendiente','atrasado') and m.tipo = 'ingreso' and m.moneda = 'CLP') as por_cobrar_clp,
       (select coalesce(sum(m.monto),0) from public.movimientos m where m.espacio_id = e.id and m.estado in ('pendiente','atrasado') and m.tipo = 'gasto' and m.moneda = 'CLP') as por_pagar_clp,
       (select coalesce(sum(d.saldo),0) from public.deudas d where d.espacio_id = e.id and d.moneda = 'CLP') as deuda_total_clp
from public.espacios e;


-- =====================================================================
-- 8. ALMACENAMIENTO DE ARCHIVOS (Supabase Storage)
--    Bucket privado "archivos". Ruta obligatoria: {espacio_id}/{carpeta}/{archivo}
--    ej: 7b1c.../propiedades/3fa2.../contrato.pdf
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('archivos', 'archivos', false, 52428800)   -- 50 MB por archivo
on conflict (id) do nothing;

create policy archivos_leer on storage.objects for select to authenticated
  using (bucket_id = 'archivos' and (
         public.puede_leer(public.uuid_o_nulo((storage.foldername(name))[1]), 'documentos')
      or exists (select 1 from public.documentos d where d.ruta_archivo = storage.objects.name)  -- respeta RLS de documentos
  ));

create policy archivos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'archivos'
              and public.puede_escribir(public.uuid_o_nulo((storage.foldername(name))[1]), 'documentos'));

create policy archivos_editar on storage.objects for update to authenticated
  using (bucket_id = 'archivos'
         and public.puede_escribir(public.uuid_o_nulo((storage.foldername(name))[1]), 'documentos'));

create policy archivos_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'archivos'
         and public.puede_escribir(public.uuid_o_nulo((storage.foldername(name))[1]), 'documentos'));


-- =====================================================================
-- 9. TAREAS AUTOMÁTICAS (pg_cron). Horas en UTC: 11:00 UTC = 08:00 en Chile (horario de verano)
--    Si esta parte da error, activa "pg_cron" en Database → Extensions y vuelve a correr SOLO esta sección.
-- =====================================================================
create extension if not exists pg_cron;

select cron.schedule('alertas-diarias',       '0 11 * * *', $$select public.generar_alertas()$$);
select cron.schedule('movimientos-del-mes',   '0 10 1 * *', $$select public.generar_movimientos_mes()$$);

-- FIN. Siguiente paso: crea tu usuario en la app y llama a crear_espacio('Familia ...').
