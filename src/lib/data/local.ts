import type { Api } from './api';
import { nuevoId } from './api';
import type { Datos, Membresia, Rol, Tabla, Usuario } from '../types';
import { DATOS_VACIOS } from '../types';
import { crearSemilla, ESPACIO_DEMO, PERSONA_ADMIN, PERSONA_ARRENDATARIA } from './semilla';
import { aISO } from '../fechas';

/**
 * Modo local: todo se guarda en este navegador (localStorage).
 * Sirve para probar la app sin crear una cuenta en Supabase.
 * Imita las reglas de seguridad para que la vista del arrendatario sea realista.
 */
const CLAVE = 'casaclara:local:v1';

interface Estado {
  sesion: boolean;
  rolDemo: Rol;
  datos: Datos;
  archivos: Record<string, string>;
}

function leer(): Estado {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) return JSON.parse(raw) as Estado;
  } catch {
    // Si el almacenamiento está corrupto o bloqueado, se parte de nuevo.
  }
  return { sesion: false, rolDemo: 'administrador', datos: crearSemilla(new Date()), archivos: {} };
}

let estado = leer();
const enMemoria = new Map<string, string>();

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    // Cuota llena (archivos grandes): los datos siguen en memoria en esta sesión.
  }
}

export function cambiarRolDemo(rol: Rol) {
  estado.rolDemo = rol;
  guardar();
}

export function rolDemoActual(): Rol {
  return estado.rolDemo;
}

export function reiniciarDemo() {
  estado = { sesion: true, rolDemo: 'administrador', datos: crearSemilla(new Date()), archivos: {} };
  guardar();
}

/** Lo que vería un arrendatario con las políticas RLS de schema.sql. */
function vistaArrendatario(d: Datos, personaId: string): Datos {
  const contratos = d.contratos.filter((c) => c.arrendatario_id === personaId);
  const idsContrato = new Set(contratos.map((c) => c.id));
  const idsProp = new Set(
    d.propiedad_personas.filter((pp) => pp.persona_id === personaId && pp.rol === 'arrendatario').map((pp) => pp.propiedad_id),
  );
  return {
    ...DATOS_VACIOS,
    propiedades: d.propiedades.filter((p) => idsProp.has(p.id)),
    personas: d.personas.filter((p) => p.id === personaId),
    contratos,
    movimientos: d.movimientos.filter((m) => m.contrato_id && idsContrato.has(m.contrato_id)),
    documentos: d.documentos.filter(
      (doc) =>
        (doc.visible_arrendatario && ((doc.contrato_id && idsContrato.has(doc.contrato_id)) || (doc.propiedad_id && idsProp.has(doc.propiedad_id)))) ||
        doc.persona_id === personaId,
    ),
    solicitudes: d.solicitudes.filter((s) => idsProp.has(s.propiedad_id)),
  };
}

export function crearApiLocal(): Api {
  const usuario = (): Usuario =>
    estado.rolDemo === 'arrendatario'
      ? { id: 'usr-ana', email: 'ana@correo.cl', nombre: 'Ana Rojas' }
      : { id: 'usr-demo', email: 'demo@casaclara.cl', nombre: 'Tú' };

  const puedeEscribir = () => estado.rolDemo === 'administrador' || estado.rolDemo === 'familiar';

  return {
    modo: 'local',

    async usuarioActual() {
      return estado.sesion ? usuario() : null;
    },
    async ingresar() {
      estado.sesion = true;
      guardar();
    },
    async registrarse() {
      estado.sesion = true;
      guardar();
      return { requiereConfirmacion: false };
    },
    async salir() {
      estado.sesion = false;
      estado.rolDemo = 'administrador';
      guardar();
    },

    async misEspacios(): Promise<Membresia[]> {
      return [{
        espacio: ESPACIO_DEMO,
        rol: estado.rolDemo,
        persona_id: estado.rolDemo === 'arrendatario' ? PERSONA_ARRENDATARIA : PERSONA_ADMIN,
        permisos: {},
      }];
    },

    async crearEspacio() {
      return ESPACIO_DEMO.id;
    },

    async cargar() {
      if (estado.rolDemo === 'arrendatario') return vistaArrendatario(estado.datos, PERSONA_ARRENDATARIA);
      return structuredClone(estado.datos);
    },

    async crear<T extends { id: string }>(tabla: Tabla, fila: Partial<T>) {
      const esSolicitudArrendatario = tabla === 'solicitudes' && estado.rolDemo === 'arrendatario';
      if (!puedeEscribir() && !esSolicitudArrendatario) throw new Error('Tu rol no tiene permiso para hacer este cambio.');
      const nueva = { ...fila, id: fila.id ?? nuevoId(), created_at: new Date().toISOString() } as unknown as T;
      (estado.datos[tabla] as unknown as T[]).push(nueva);
      guardar();
      return nueva;
    },

    async editar<T extends { id: string }>(tabla: Tabla, id: string, cambios: Partial<T>) {
      if (!puedeEscribir()) throw new Error('Tu rol no tiene permiso para hacer este cambio.');
      const lista = estado.datos[tabla] as unknown as T[];
      const i = lista.findIndex((f) => f.id === id);
      if (i < 0) throw new Error('No se encontró el registro.');
      lista[i] = { ...lista[i], ...cambios };
      guardar();
      return lista[i];
    },

    async borrar(tabla, id) {
      if (!puedeEscribir()) throw new Error('Tu rol no tiene permiso para hacer este cambio.');
      const lista = estado.datos[tabla] as unknown as { id: string }[];
      (estado.datos as unknown as Record<string, unknown[]>)[tabla] = lista.filter((f) => f.id !== id);
      guardar();
    },

    async marcarPagado(id, medio) {
      const m = estado.datos.movimientos.find((x) => x.id === id);
      if (!m || (m.estado !== 'pendiente' && m.estado !== 'atrasado')) throw new Error('Este movimiento ya está pagado.');
      m.estado = 'pagado';
      m.pagado_en = new Date().toISOString();
      m.medio_pago = medio ?? m.medio_pago;
      guardar();
    },

    async invitar(espacioId, email, rol, personaId) {
      estado.datos.miembros.push({
        id: nuevoId(), espacio_id: espacioId, user_id: null, email: email.toLowerCase(), rol, estado: 'invitado', persona_id: personaId ?? null,
      });
      guardar();
    },

    async subirArchivo(espacioId, carpeta, archivo) {
      const ruta = `${espacioId}/${carpeta}/${nuevoId()}-${archivo.name}`;
      const url = URL.createObjectURL(archivo);
      enMemoria.set(ruta, url);
      if (archivo.size < 400_000) {
        estado.archivos[ruta] = await new Promise<string>((ok) => {
          const r = new FileReader();
          r.onload = () => ok(String(r.result));
          r.readAsDataURL(archivo);
        });
        guardar();
      }
      return ruta;
    },

    async urlArchivo(ruta) {
      const url = enMemoria.get(ruta) ?? estado.archivos[ruta];
      if (url) return url;
      // Documentos de ejemplo: un PDF simple generado al vuelo
      return URL.createObjectURL(new Blob([pdfDeEjemplo(ruta)], { type: 'application/pdf' }));
    },
  };
}

function pdfDeEjemplo(ruta: string): string {
  const texto = `Documento de ejemplo: ${ruta.split('/').pop()} - generado ${aISO(new Date())}`.replace(/[()\\]/g, '');
  const contenido = `BT /F1 14 Tf 60 760 Td (${texto}) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => (pdf += `${String(o).padStart(10, '0')} 00000 n \n`));
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}
