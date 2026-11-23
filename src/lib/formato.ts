import type { Moneda } from './types';

/** $550.000 · UF 24,00 · US$ 1.234,00 */
export function dinero(monto: number, moneda: Moneda = 'CLP'): string {
  const signo = monto < 0 ? '−' : '';
  const a = Math.abs(monto);
  if (moneda === 'CLP') {
    return signo + '$' + Math.round(a).toLocaleString('es-CL', { maximumFractionDigits: 0 });
  }
  const n = a.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return signo + (moneda === 'UF' ? `UF ${n}` : `US$ ${n}`);
}

/** $1,2 M · $850 mil — para tarjetas pequeñas */
export function dineroCorto(monto: number): string {
  const a = Math.abs(monto);
  const signo = monto < 0 ? '−' : '';
  if (a >= 1_000_000) return `${signo}$${(a / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: 1 })} M`;
  if (a >= 1_000) return `${signo}$${Math.round(a / 1_000).toLocaleString('es-CL')} mil`;
  return `${signo}$${Math.round(a)}`;
}

/** Convierte lo que escribe la persona ("550.000", "24,5") a número. */
export function leerMonto(texto: string): number | null {
  const limpio = texto.replace(/[^\d,.-]/g, '');
  if (!limpio) return null;
  // En Chile el punto separa miles y la coma los decimales.
  const normal = limpio.replace(/\./g, '').replace(',', '.');
  const n = Number(normal);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export const ETIQUETA_TIPO_PROPIEDAD: Record<string, string> = {
  casa: 'Casa', departamento: 'Departamento', oficina: 'Oficina', local: 'Local comercial',
  bodega: 'Bodega', estacionamiento: 'Estacionamiento', terreno: 'Terreno', otro: 'Otro',
};

export const ETIQUETA_ESTADO_PROPIEDAD: Record<string, string> = {
  disponible: 'Disponible', arrendada: 'Arrendada', en_venta: 'En venta', en_mantencion: 'En mantención', uso_propio: 'Uso propio',
};

export const ETIQUETA_TIPO_PERSONA: Record<string, string> = {
  administrador: 'Administrador', familiar: 'Familiar', propietario: 'Propietario', arrendatario: 'Arrendatario',
  hijo: 'Hijo o hija', contacto_emergencia: 'Contacto de emergencia', proveedor: 'Proveedor', otro: 'Otro',
};

export const ETIQUETA_ROL: Record<string, string> = {
  administrador: 'Administrador', familiar: 'Familiar', propietario: 'Propietario', arrendatario: 'Arrendatario', invitado: 'Invitado',
};

export const ETIQUETA_DOCUMENTO: Record<string, string> = {
  contrato: 'Contrato', escritura: 'Escritura', foto: 'Foto', pdf: 'PDF', certificado: 'Certificado',
  boleta: 'Boleta', factura: 'Factura', otro: 'Otro',
};

export const ETIQUETA_SOLICITUD: Record<string, string> = {
  abierta: 'Recibida', en_proceso: 'En proceso', resuelta: 'Resuelta', cancelada: 'Cancelada',
};
