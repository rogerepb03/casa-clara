import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/data';
import type { Datos, Membresia, Usuario } from '../lib/types';
import { DATOS_VACIOS } from '../lib/types';

interface Contexto {
  cargando: boolean;
  usuario: Usuario | null;
  membresia: Membresia | null;
  datos: Datos;
  error: string | null;
  puedeEditar: boolean;
  esArrendatario: boolean;
  recargar: () => Promise<void>;
  iniciar: () => Promise<void>;
  aviso: (texto: string) => void;
  textoAviso: string | null;
}

const Ctx = createContext<Contexto | null>(null);

export function ProveedorApp({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [membresia, setMembresia] = useState<Membresia | null>(null);
  const [datos, setDatos] = useState<Datos>(DATOS_VACIOS);
  const [error, setError] = useState<string | null>(null);
  const [textoAviso, setTextoAviso] = useState<string | null>(null);

  const iniciar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const u = await api.usuarioActual();
      setUsuario(u);
      if (!u) {
        setMembresia(null);
        setDatos(DATOS_VACIOS);
        return;
      }
      const ms = await api.misEspacios();
      const guardado = localStorage.getItem('casaclara:espacio');
      const m = ms.find((x) => x.espacio.id === guardado) ?? ms[0] ?? null;
      setMembresia(m);
      setDatos(m ? await api.cargar(m.espacio.id) : DATOS_VACIOS);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos.');
    } finally {
      setCargando(false);
    }
  }, []);

  const recargar = useCallback(async () => {
    if (!membresia) return;
    try {
      setDatos(await api.cargar(membresia.espacio.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos.');
    }
  }, [membresia]);

  const aviso = useCallback((texto: string) => {
    setTextoAviso(texto);
    window.setTimeout(() => setTextoAviso((t) => (t === texto ? null : t)), 3200);
  }, []);

  useEffect(() => {
    void iniciar();
  }, [iniciar]);

  const valor = useMemo<Contexto>(() => {
    const rol = membresia?.rol;
    const permisos = membresia?.permisos ?? {};
    const puedeEditar = rol === 'administrador' || (rol === 'familiar' && permisos.escribir !== false);
    return {
      cargando, usuario, membresia, datos, error, puedeEditar,
      esArrendatario: rol === 'arrendatario',
      recargar, iniciar, aviso, textoAviso,
    };
  }, [cargando, usuario, membresia, datos, error, recargar, iniciar, aviso, textoAviso]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useApp(): Contexto {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp debe usarse dentro de ProveedorApp');
  return c;
}

/** "Hoy" en un solo lugar: así es fácil probar con otra fecha. */
export function useHoy(): Date {
  return useMemo(() => new Date(), []);
}
