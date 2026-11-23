-- =====================================================================
--  CASA CLARA — Migración 002: Bitácora (recuerdos e incidentes) y Test de vivienda
--  Ejecútala UNA vez en Supabase → SQL Editor, DESPUÉS de schema.sql.
-- =====================================================================

-- 1. Tipos
create type public.tipo_publicacion as enum
  ('recuerdo', 'evento_familiar', 'incidente', 'robo', 'dano', 'desastre');

-- 2. Bitácora: recuerdos familiares e incidentes de las propiedades
create table public.publicaciones (
  id           uuid primary key default gen_random_uuid(),
  espacio_id   uuid not null references public.espacios(id) on delete cascade,
  tipo         public.tipo_publicacion not null,
  titulo       text not null,
  texto        text,
  fecha        date not null default current_date,
  propiedad_id uuid,
  fotos        text[] not null default '{}',          -- rutas en Storage: {espacio_id}/bitacora/...
  -- familia: solo admin y familiares · propiedad: también arrendatario y propietario de esa propiedad
  visibilidad  text not null default 'familia' check (visibilidad in ('familia', 'propiedad')),
  gravedad     int check (gravedad between 1 and 3),  -- solo incidentes: 1 leve, 2 media, 3 grave
  resuelto     boolean not null default false,
  creado_por   uuid not null default auth.uid() references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (propiedad_id, espacio_id) references public.propiedades(id, espacio_id) on delete cascade,
  check (visibilidad = 'familia' or propiedad_id is not null),
  check (cardinality(fotos) <= 12)
);
create index on public.publicaciones (espacio_id, fecha desc);
create index on public.publicaciones (propiedad_id) where propiedad_id is not null;

create trigger publicaciones_updated_at before update on public.publicaciones
  for each row execute function public.tocar_updated_at();
create trigger publicaciones_historial after insert or update or delete on public.publicaciones
  for each row execute function public.registrar_historial();

alter table public.publicaciones enable row level security;

-- Equipo (admin / familiar con módulo "familia")
create policy publicaciones_equipo_leer on public.publicaciones for select to authenticated
  using (public.puede_leer(espacio_id, 'familia'));
create policy publicaciones_equipo_crear on public.publicaciones for insert to authenticated
  with check (public.puede_escribir(espacio_id, 'familia') and creado_por = auth.uid());
create policy publicaciones_equipo_editar on public.publicaciones for update to authenticated
  using (public.puede_escribir(espacio_id, 'familia')) with check (public.puede_escribir(espacio_id, 'familia'));
create policy publicaciones_equipo_borrar on public.publicaciones for delete to authenticated
  using (public.puede_escribir(espacio_id, 'familia'));

-- Arrendatarios y propietarios: ven lo compartido de su propiedad y lo que ellos publicaron
create policy publicaciones_externos_leer on public.publicaciones for select to authenticated
  using (
    creado_por = auth.uid()
    or (visibilidad = 'propiedad' and (
          propiedad_id in (select public.mis_propiedades('arrendatario'))
       or propiedad_id in (select public.mis_propiedades('propietario'))))
  );
-- El arrendatario puede reportar incidentes de SU propiedad (siempre visibles para él y la familia)
create policy publicaciones_arrendatario_reportar on public.publicaciones for insert to authenticated
  with check (
    creado_por = auth.uid()
    and visibilidad = 'propiedad'
    and tipo in ('incidente', 'robo', 'dano', 'desastre')
    and resuelto = false
    and propiedad_id in (select public.mis_propiedades('arrendatario'))
  );

-- 3. Aviso inmediato a los administradores cuando se reporta un incidente
create or replace function public.avisar_incidente()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tipo in ('incidente', 'robo', 'dano', 'desastre') then
    insert into public.notificaciones (espacio_id, user_id, tipo, titulo, cuerpo, ref_tabla, ref_id, clave)
    select new.espacio_id, m.user_id, 'incidente',
           case new.tipo when 'robo' then 'Robo reportado' when 'desastre' then 'Emergencia reportada'
                         when 'dano' then 'Daño reportado' else 'Incidente reportado' end,
           new.titulo || coalesce(' — ' || (select nombre from public.propiedades where id = new.propiedad_id), ''),
           'publicaciones', new.id, 'pub-' || new.id
    from public.miembros m
    where m.espacio_id = new.espacio_id and m.rol = 'administrador' and m.estado = 'activo'
      and m.user_id is not null and m.user_id <> new.creado_por
    on conflict (user_id, clave) do nothing;
  end if;
  return new;
end $$;

create trigger publicaciones_aviso after insert on public.publicaciones
  for each row execute function public.avisar_incidente();

-- 4. Fotos de la bitácora en Storage (bucket "archivos", carpeta {espacio_id}/bitacora/...)
--    Cualquier miembro activo del espacio puede subir a la carpeta bitacora;
--    la foto solo se ve si la publicación que la contiene es visible para quien mira.
create policy archivos_bitacora_subir on storage.objects for insert to authenticated
  with check (
    bucket_id = 'archivos'
    and (storage.foldername(name))[2] = 'bitacora'
    and public.mi_rol(public.uuid_o_nulo((storage.foldername(name))[1])) is not null
  );
create policy archivos_bitacora_leer on storage.objects for select to authenticated
  using (
    bucket_id = 'archivos'
    and exists (select 1 from public.publicaciones p where storage.objects.name = any (p.fotos))
  );

-- 5. Test de vivienda (cada persona ve solo los suyos; puede repetirlo cuando quiera)
create table public.tests_vivienda (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  respuestas jsonb not null,
  resultado  jsonb not null,
  created_at timestamptz not null default now()
);
create index on public.tests_vivienda (user_id, created_at desc);
alter table public.tests_vivienda enable row level security;
create policy tests_propios on public.tests_vivienda for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
