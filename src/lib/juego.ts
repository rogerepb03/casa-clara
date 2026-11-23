import type { Datos, Propiedad } from './types';
import { ES_INCIDENTE } from './types';
import { aISO, claveMes, diasEntre, inicioSemana, sumarDias, sumarMeses } from './fechas';
import { estadoReal } from './finanzas';

/**
 * MODO JUEGO FAMILIAR
 * Todo se calcula a partir de los datos reales: no hay puntos que "farmear".
 * Cada punto perdido trae su motivo y la acción que lo recupera.
 */

export interface Motivo {
  texto: string;
  puntos: number; // negativo
  accion: string;
  ruta: string;
}

export interface Salud {
  propiedadId: string;
  puntaje: number; // 0..100
  ventanas: number; // 0..4 ventanas encendidas
  nivel: 'excelente' | 'bien' | 'atencion' | 'urgente';
  motivos: Motivo[];
}

export function saludPropiedad(p: Propiedad, d: Datos, hoy: Date): Salud {
  const h = aISO(hoy);
  const motivos: Motivo[] = [];
  const ruta = `/propiedades/${p.id}`;

  const atrasados = d.movimientos.filter((m) => m.propiedad_id === p.id && estadoReal(m, h) === 'atrasado');
  if (atrasados.length) {
    motivos.push({
      texto: atrasados.length === 1 ? '1 pago atrasado' : `${atrasados.length} pagos atrasados`,
      puntos: -Math.min(50, 25 * atrasados.length),
      accion: 'Registra el pago o contacta al arrendatario',
      ruta: '/finanzas?estado=atrasado',
    });
  }

  const contrato = d.contratos.find((c) => c.propiedad_id === p.id && c.estado === 'vigente');
  if (contrato?.fecha_termino) {
    const n = diasEntre(h, contrato.fecha_termino);
    if (n >= 0 && n <= 30) {
      motivos.push({ texto: `El contrato termina en ${n} días`, puntos: -15, accion: 'Decide si renuevas y avisa al arrendatario', ruta });
    }
  }

  const docs = d.documentos.filter((x) => x.propiedad_id === p.id);
  const vencidos = docs.filter((x) => x.vence_el && x.vence_el < h);
  if (vencidos.length) {
    motivos.push({ texto: vencidos.length === 1 ? `Venció: ${vencidos[0].nombre}` : `${vencidos.length} documentos vencidos`, puntos: -10 * Math.min(2, vencidos.length), accion: 'Sube la versión vigente', ruta: '/documentos' });
  }
  if (docs.length === 0) {
    motivos.push({ texto: 'Sin documentos guardados', puntos: -10, accion: 'Sube la escritura o el contrato', ruta });
  }

  if (p.estado === 'disponible') {
    motivos.push({ texto: 'Está desocupada', puntos: -15, accion: 'Publícala o cambia su estado si es de uso propio', ruta });
  }

  const abiertas = d.solicitudes.filter((s) => s.propiedad_id === p.id && s.estado === 'abierta' && s.created_at && diasEntre(s.created_at.slice(0, 10), h) > 7);
  if (abiertas.length) {
    motivos.push({ texto: 'Solicitud sin respuesta hace más de 7 días', puntos: -10, accion: 'Responde o agenda la reparación', ruta });
  }

  const incidentes = (d.publicaciones ?? []).filter((x) => x.propiedad_id === p.id && ES_INCIDENTE[x.tipo] && !x.resuelto);
  if (incidentes.length) {
    const resta = Math.min(30, incidentes.reduce((s, x) => s + ({ 3: 20, 2: 10, 1: 5 }[x.gravedad ?? 2] ?? 10), 0));
    motivos.push({
      texto: incidentes.length === 1 ? `Incidente abierto: ${incidentes[0].titulo.toLowerCase()}` : `${incidentes.length} incidentes abiertos`,
      puntos: -resta, accion: 'Revísalo en la bitácora y márcalo resuelto', ruta: '/bitacora?ver=incidentes',
    });
  }

  const puntaje = Math.max(0, Math.min(100, 100 + motivos.reduce((s, m) => s + m.puntos, 0)));
  const ventanas = puntaje >= 90 ? 4 : puntaje >= 70 ? 3 : puntaje >= 50 ? 2 : puntaje >= 25 ? 1 : 0;
  const nivel = puntaje >= 90 ? 'excelente' : puntaje >= 70 ? 'bien' : puntaje >= 50 ? 'atencion' : 'urgente';
  return { propiedadId: p.id, puntaje, ventanas, nivel, motivos: motivos.sort((a, b) => a.puntos - b.puntos) };
}

/** Promedio de salud de todas las propiedades. */
export function puntajeHogar(saludes: Salud[]): number {
  if (!saludes.length) return 0;
  return Math.round(saludes.reduce((s, x) => s + x.puntaje, 0) / saludes.length);
}

/** Semanas seguidas (terminando esta semana o la anterior) en que la familia registró al menos un movimiento. */
export function racha(d: Datos, hoy: Date): { semanas: number; activaEstaSemana: boolean } {
  const semanas = new Set(
    d.movimientos.map((m) => aISO(inicioSemana(new Date(m.created_at ?? `${m.fecha}T12:00:00`)))),
  );
  const esta = inicioSemana(hoy);
  const activaEstaSemana = semanas.has(aISO(esta));
  let cursor = activaEstaSemana ? esta : sumarDias(esta, -7);
  let n = 0;
  while (semanas.has(aISO(cursor))) {
    n++;
    cursor = sumarDias(cursor, -7);
  }
  return { semanas: n, activaEstaSemana };
}

export interface Logro {
  id: string;
  nombre: string;
  descripcion: string;
  actual: number;
  meta: number;
  logrado: boolean;
  forma: 'llave' | 'carpeta' | 'calendario' | 'llama' | 'libro' | 'equipo' | 'barrio' | 'boleta';
}

export function logros(d: Datos, hoy: Date, saludes: Salud[]): Logro[] {
  const h = aISO(hoy);
  const mesPasado = claveMes(aISO(sumarMeses(hoy, -1)));
  const r = racha(d, hoy).semanas;
  const conDocs = d.propiedades.filter((p) => d.documentos.some((x) => x.propiedad_id === p.id)).length;
  const arriendosMesPasado = d.movimientos.filter((m) => m.contrato_id && m.fecha_vencimiento && claveMes(m.fecha_vencimiento) === mesPasado);
  const atrasoMesPasado = arriendosMesPasado.some((m) => estadoReal(m, h) === 'atrasado');
  const iluminadas = saludes.filter((s) => s.puntaje >= 75).length;
  const conBoleta = d.movimientos.filter((m) => m.comprobante).length;
  const equipo = d.miembros.filter((m) => m.estado === 'activo').length;

  const def = (l: Omit<Logro, 'logrado'>): Logro => ({ ...l, actual: Math.min(l.actual, l.meta), logrado: l.actual >= l.meta });
  return [
    def({ id: 'primera-llave', nombre: 'Primera llave', descripcion: 'Registra tu primera propiedad', actual: d.propiedades.length, meta: 1, forma: 'llave' }),
    def({ id: 'todo-en-su-lugar', nombre: 'Todo en su lugar', descripcion: 'Cada propiedad con al menos un documento', actual: conDocs, meta: Math.max(1, d.propiedades.length), forma: 'carpeta' }),
    def({ id: 'mes-sin-atrasos', nombre: 'Mes sin atrasos', descripcion: 'Todos los arriendos del mes pasado al día', actual: arriendosMesPasado.length > 0 && !atrasoMesPasado ? 1 : 0, meta: 1, forma: 'calendario' }),
    def({ id: 'racha-4', nombre: 'Constancia', descripcion: '4 semanas seguidas registrando movimientos', actual: r, meta: 4, forma: 'llama' }),
    def({ id: 'contador', nombre: 'Contador de la casa', descripcion: 'Registra 50 movimientos', actual: d.movimientos.length, meta: 50, forma: 'libro' }),
    def({ id: 'equipo', nombre: 'Familia en equipo', descripcion: 'Suma a 2 personas activas a la app', actual: equipo, meta: 2, forma: 'equipo' }),
    def({ id: 'barrio-iluminado', nombre: 'Barrio iluminado', descripcion: 'Todas las propiedades con salud sobre 75', actual: iluminadas, meta: Math.max(1, d.propiedades.length), forma: 'barrio' }),
    def({ id: 'boletas', nombre: 'Boleta en mano', descripcion: 'Adjunta 10 comprobantes a tus gastos', actual: conBoleta, meta: 10, forma: 'boleta' }),
  ];
}

export interface Accion {
  titulo: string;
  detalle: string;
  ruta: string;
  puntos: number; // puntos de hogar que recupera
}

/** La única acción que más mejora el puntaje del hogar hoy. */
export function proximaMejorAccion(d: Datos, hoy: Date, saludes: Salud[]): Accion | null {
  const candidatos: Accion[] = [];
  const n = Math.max(1, saludes.length);
  for (const s of saludes) {
    const p = d.propiedades.find((x) => x.id === s.propiedadId);
    for (const m of s.motivos) {
      candidatos.push({ titulo: m.accion, detalle: `${p?.nombre ?? ''}: ${m.texto.toLowerCase()}`, ruta: m.ruta, puntos: Math.round(-m.puntos / n) });
    }
  }
  candidatos.sort((a, b) => b.puntos - a.puntos);
  if (candidatos[0]) return candidatos[0];
  const r = racha(d, hoy);
  if (!r.activaEstaSemana) {
    return { titulo: 'Registra un gasto de esta semana', detalle: r.semanas ? `Mantén tu racha de ${r.semanas} semanas` : 'Empieza una racha semanal', ruta: '/finanzas/nuevo', puntos: 0 };
  }
  return null;
}

export interface Desafio {
  titulo: string;
  progreso: number; // 0..1
  texto: string;
}

/** Desafío del mes: terminarlo sin atrasos. */
export function desafioDelMes(d: Datos, hoy: Date): Desafio {
  const h = aISO(hoy);
  const mes = claveMes(h);
  const delMes = d.movimientos.filter((m) => m.fecha_vencimiento && claveMes(m.fecha_vencimiento) === mes && m.estado !== 'anulado');
  const alDia = delMes.filter((m) => m.estado === 'pagado').length;
  const atrasados = delMes.filter((m) => estadoReal(m, h) === 'atrasado').length;
  const total = delMes.length || 1;
  return {
    titulo: 'Cerrar el mes sin atrasos',
    progreso: alDia / total,
    texto: atrasados
      ? `${alDia} de ${delMes.length} pagos al día, ${atrasados} atrasado${atrasados > 1 ? 's' : ''}`
      : `${alDia} de ${delMes.length} pagos al día`,
  };
}
