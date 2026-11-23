// Tipos que reflejan las tablas de schema.sql (Supabase).
// Si agregas una columna en Supabase, agrégala también aquí.

export type Rol = 'administrador' | 'familiar' | 'propietario' | 'arrendatario' | 'invitado';
export type Moneda = 'CLP' | 'UF' | 'USD';
export type TipoMovimiento = 'ingreso' | 'gasto';
export type EstadoPago = 'pendiente' | 'pagado' | 'atrasado' | 'anulado';
export type TipoPropiedad =
  | 'casa' | 'departamento' | 'oficina' | 'local' | 'bodega' | 'estacionamiento' | 'terreno' | 'otro';
export type EstadoPropiedad = 'disponible' | 'arrendada' | 'en_venta' | 'en_mantencion' | 'uso_propio';
export type TipoPersona =
  | 'administrador' | 'familiar' | 'propietario' | 'arrendatario' | 'hijo' | 'contacto_emergencia' | 'proveedor' | 'otro';
export type RolEnPropiedad = 'propietario' | 'arrendatario' | 'administrador' | 'residente' | 'contacto_emergencia';
export type TipoDocumento = 'contrato' | 'escritura' | 'foto' | 'pdf' | 'certificado' | 'boleta' | 'factura' | 'otro';
export type EstadoSolicitud = 'abierta' | 'en_proceso' | 'resuelta' | 'cancelada';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
}

export interface Espacio {
  id: string;
  nombre: string;
  moneda_base: Moneda;
}

export interface Membresia {
  espacio: Espacio;
  rol: Rol;
  persona_id: string | null;
  permisos: Record<string, boolean>;
}

export interface Propiedad {
  id: string;
  espacio_id: string;
  nombre: string;
  direccion: string | null;
  comuna: string | null;
  tipo: TipoPropiedad;
  estado: EstadoPropiedad;
  valor: number | null;
  moneda_valor: Moneda;
  foto_portada: string | null;
  notas: string | null;
  created_at?: string;
}

export interface Persona {
  id: string;
  espacio_id: string;
  user_id: string | null;
  tipo: TipoPersona;
  nombre: string;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  notas: string | null;
}

export interface PropiedadPersona {
  id: string;
  espacio_id: string;
  propiedad_id: string;
  persona_id: string;
  rol: RolEnPropiedad;
  porcentaje: number | null;
}

export interface Contrato {
  id: string;
  espacio_id: string;
  propiedad_id: string;
  arrendatario_id: string;
  fecha_inicio: string;
  fecha_termino: string | null;
  monto_arriendo: number;
  moneda: Moneda;
  dia_pago: number;
  estado: 'borrador' | 'vigente' | 'terminado' | 'renovado';
}

export interface Categoria {
  id: string;
  espacio_id: string;
  nombre: string;
  tipo: TipoMovimiento;
}

export interface Movimiento {
  id: string;
  espacio_id: string;
  tipo: TipoMovimiento;
  categoria_id: string | null;
  descripcion: string;
  monto: number;
  moneda: Moneda;
  fecha: string;
  fecha_vencimiento: string | null;
  estado: EstadoPago;
  pagado_en: string | null;
  medio_pago: string | null;
  propiedad_id: string | null;
  persona_id: string | null;
  contrato_id: string | null;
  comprobante: string | null;
  created_at?: string;
}

export interface Documento {
  id: string;
  espacio_id: string;
  nombre: string;
  tipo: TipoDocumento;
  ruta_archivo: string;
  propiedad_id: string | null;
  persona_id: string | null;
  contrato_id: string | null;
  vence_el: string | null;
  visible_arrendatario: boolean;
  visible_propietario: boolean;
  created_at?: string;
}

export interface Solicitud {
  id: string;
  espacio_id: string;
  propiedad_id: string;
  titulo: string;
  descripcion: string | null;
  es_mantencion: boolean;
  estado: EstadoSolicitud;
  prioridad: number;
  fecha_programada: string | null;
  created_at?: string;
}

export type TipoPublicacion = 'recuerdo' | 'evento_familiar' | 'incidente' | 'robo' | 'dano' | 'desastre';

export interface Publicacion {
  id: string;
  espacio_id: string;
  tipo: TipoPublicacion;
  titulo: string;
  texto: string | null;
  fecha: string;
  propiedad_id: string | null;
  fotos: string[];
  visibilidad: 'familia' | 'propiedad';
  gravedad: number | null;
  resuelto: boolean;
  creado_por?: string;
  created_at?: string;
}

export const ES_INCIDENTE: Record<TipoPublicacion, boolean> = {
  recuerdo: false, evento_familiar: false, incidente: true, robo: true, dano: true, desastre: true,
};

export interface Miembro {
  id: string;
  espacio_id: string;
  user_id: string | null;
  email: string;
  rol: Rol;
  estado: 'invitado' | 'activo' | 'suspendido';
  persona_id: string | null;
}

/** Todo lo que la app carga de un espacio. A escala familiar cabe en memoria. */
export interface Datos {
  propiedades: Propiedad[];
  personas: Persona[];
  propiedad_personas: PropiedadPersona[];
  contratos: Contrato[];
  categorias: Categoria[];
  movimientos: Movimiento[];
  documentos: Documento[];
  solicitudes: Solicitud[];
  miembros: Miembro[];
  publicaciones: Publicacion[];
}

export type Tabla = keyof Datos | 'tests_vivienda';

export const DATOS_VACIOS: Datos = {
  propiedades: [], personas: [], propiedad_personas: [], contratos: [], categorias: [],
  movimientos: [], documentos: [], solicitudes: [], miembros: [], publicaciones: [],
};
