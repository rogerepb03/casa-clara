import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Api } from './api';
import { nuevoId } from './api';
import type { Datos, Membresia, Rol, Usuario } from '../types';

/**
 * Adaptador de producción: habla con tu proyecto Supabase.
 * La seguridad (quién ve qué) la aplica la base de datos con RLS (schema.sql),
 * así que aquí no hace falta filtrar por rol.
 */
export function crearApiSupabase(url: string, anonKey: string): Api {
  const sb: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  const exigir = <T>(r: { data: T | null; error: { message: string } | null }): T => {
    if (r.error) throw new Error(traducirError(r.error.message));
    return r.data as T;
  };

  return {
    modo: 'supabase',

    async usuarioActual(): Promise<Usuario | null> {
      const { data } = await sb.auth.getSession();
      const u = data.session?.user;
      if (!u) return null;
      return {
        id: u.id,
        email: u.email ?? '',
        nombre: (u.user_metadata?.nombre as string | undefined) ?? (u.email ?? '').split('@')[0],
      };
    },

    async ingresar(email, clave) {
      const { error } = await sb.auth.signInWithPassword({ email, password: clave });
      if (error) throw new Error(traducirError(error.message));
    },

    async registrarse(email, clave, nombre) {
      const { data, error } = await sb.auth.signUp({ email, password: clave, options: { data: { nombre } } });
      if (error) throw new Error(traducirError(error.message));
      return { requiereConfirmacion: !data.session };
    },

    async salir() {
      await sb.auth.signOut();
    },

    async misEspacios(): Promise<Membresia[]> {
      const { data: s } = await sb.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) return [];
      const filas = exigir(
        await sb
          .from('miembros')
          .select('rol, persona_id, permisos, espacio:espacios(id, nombre, moneda_base)')
          .eq('user_id', uid)
          .eq('estado', 'activo'),
      ) as unknown as Array<Omit<Membresia, 'espacio'> & { espacio: Membresia['espacio'] | null }>;
      return filas.filter((f) => f.espacio).map((f) => ({ ...f, espacio: f.espacio! }));
    },

    async crearEspacio(nombre) {
      return exigir(await sb.rpc('crear_espacio', { p_nombre: nombre })) as string;
    },

    async cargar(espacioId): Promise<Datos> {
      const tablas: (keyof Datos)[] = [
        'propiedades', 'personas', 'propiedad_personas', 'contratos', 'categorias',
        'movimientos', 'documentos', 'solicitudes', 'miembros', 'publicaciones',
      ];
      const resultados = await Promise.all(
        tablas.map((t) => {
          let q = sb.from(t).select('*').eq('espacio_id', espacioId);
          if (t === 'movimientos' || t === 'publicaciones') q = q.order('fecha', { ascending: false }).limit(5000);
          return q;
        }),
      );
      const datos = {} as Datos;
      tablas.forEach((t, i) => {
        // Una tabla sin permiso de lectura vuelve vacía (RLS), no es un error.
        (datos as unknown as Record<string, unknown[]>)[t] = resultados[i].data ?? [];
      });
      return datos;
    },

    async crear(tabla, fila) {
      return exigir(await sb.from(tabla).insert(fila as never).select().single());
    },

    async editar(tabla, id, cambios) {
      return exigir(await sb.from(tabla).update(cambios as never).eq('id', id).select().single());
    },

    async borrar(tabla, id) {
      exigir(await sb.from(tabla).delete().eq('id', id));
    },

    async marcarPagado(movimientoId, medio) {
      exigir(await sb.rpc('marcar_pagado', { p_movimiento: movimientoId, p_medio: medio ?? null }));
    },

    async invitar(espacioId: string, email: string, rol: Rol, personaId?: string | null) {
      exigir(
        await sb.rpc('invitar_miembro', {
          p_espacio: espacioId, p_email: email, p_rol: rol, p_persona: personaId ?? null,
        }),
      );
    },

    async subirArchivo(espacioId, carpeta, archivo) {
      const limpio = archivo.name.normalize('NFD').replace(/[^\w.-]+/g, '_');
      const ruta = `${espacioId}/${carpeta}/${nuevoId()}-${limpio}`;
      const { error } = await sb.storage.from('archivos').upload(ruta, archivo, { contentType: archivo.type });
      if (error) throw new Error(traducirError(error.message));
      return ruta;
    },

    async urlArchivo(ruta) {
      const { data, error } = await sb.storage.from('archivos').createSignedUrl(ruta, 3600);
      if (error) throw new Error(traducirError(error.message));
      return data.signedUrl;
    },
  };
}

function traducirError(m: string): string {
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(m)) return 'Confirma tu correo con el enlace que te enviamos y vuelve a ingresar.';
  if (/User already registered/i.test(m)) return 'Ese correo ya tiene cuenta. Ingresa con tu contraseña.';
  if (/Password should be at least/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/row-level security/i.test(m)) return 'Tu rol no tiene permiso para hacer este cambio.';
  if (/Failed to fetch/i.test(m)) return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
  return m;
}
