import type { Datos, Membresia, Rol, Tabla, Usuario } from '../types';

/**
 * Contrato único de acceso a datos. La app solo habla con esta interfaz,
 * así funciona igual con Supabase (producción) o en modo local (prueba sin cuenta).
 */
export interface Api {
  modo: 'local' | 'supabase';
  usuarioActual(): Promise<Usuario | null>;
  ingresar(email: string, clave: string): Promise<void>;
  registrarse(email: string, clave: string, nombre: string): Promise<{ requiereConfirmacion: boolean }>;
  salir(): Promise<void>;
  misEspacios(): Promise<Membresia[]>;
  crearEspacio(nombre: string): Promise<string>;
  cargar(espacioId: string): Promise<Datos>;
  crear<T extends { id: string } = Fila>(tabla: Tabla, fila: Partial<NoInfer<T>>): Promise<T>;
  editar<T extends { id: string } = Fila>(tabla: Tabla, id: string, cambios: Partial<NoInfer<T>>): Promise<T>;
  borrar(tabla: Tabla, id: string): Promise<void>;
  marcarPagado(movimientoId: string, medio?: string): Promise<void>;
  invitar(espacioId: string, email: string, rol: Rol, personaId?: string | null): Promise<void>;
  subirArchivo(espacioId: string, carpeta: string, archivo: File): Promise<string>;
  urlArchivo(ruta: string): Promise<string>;
}

/** Fila genérica cuando no se indica el tipo. */
export type Fila = { id: string; [campo: string]: unknown };

export function nuevoId(): string {
  return crypto.randomUUID();
}
