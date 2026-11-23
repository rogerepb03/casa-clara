import type { Datos, Movimiento } from './types';
import { aISO, claveMes, diasEntre, sumarMeses } from './fechas';

/** Movimientos pendientes cuya fecha ya pasó cuentan como atrasados aunque el cron no haya corrido. */
export function estadoReal(m: Movimiento, hoy: string): Movimiento['estado'] {
  if (m.estado === 'pendiente' && m.fecha_vencimiento && m.fecha_vencimiento < hoy) return 'atrasado';
  return m.estado;
}

export interface ResumenMes {
  mes: string; // 'YYYY-MM'
  ingresos: number;
  gastos: number;
  saldo: number;
}

/** Resumen de lo pagado por mes, solo CLP (UF y USD se muestran aparte). */
export function serieMensual(movs: Movimiento[], hoy: Date, meses = 6): ResumenMes[] {
  const claves = Array.from({ length: meses }, (_, i) => claveMes(aISO(sumarMeses(hoy, i - meses + 1))));
  return claves.map((mes) => {
    let ingresos = 0;
    let gastos = 0;
    for (const m of movs) {
      if (m.estado !== 'pagado' || m.moneda !== 'CLP' || claveMes(m.fecha) !== mes) continue;
      if (m.tipo === 'ingreso') ingresos += m.monto;
      else gastos += m.monto;
    }
    return { mes, ingresos, gastos, saldo: ingresos - gastos };
  });
}

export interface Indicadores {
  porCobrar: number;
  porPagar: number;
  atrasados: number;
  saldoMes: number;
  otrasMonedas: string[];
}

export function indicadores(movs: Movimiento[], hoy: Date): Indicadores {
  const h = aISO(hoy);
  const mes = claveMes(h);
  let porCobrar = 0;
  let porPagar = 0;
  let atrasados = 0;
  const otras = new Set<string>();
  for (const m of movs) {
    const est = estadoReal(m, h);
    if (est === 'atrasado') atrasados++;
    if (m.moneda !== 'CLP') {
      if (est === 'pendiente' || est === 'atrasado') otras.add(m.moneda);
      continue;
    }
    if (est === 'pendiente' || est === 'atrasado') {
      if (m.tipo === 'ingreso') porCobrar += m.monto;
      else porPagar += m.monto;
    }
  }
  const actual = serieMensual(movs, hoy, 1)[0];
  return { porCobrar, porPagar, atrasados, saldoMes: actual?.mes === mes ? actual.saldo : 0, otrasMonedas: [...otras] };
}

export interface Vencimiento {
  clave: string;
  tipo: 'pago' | 'contrato' | 'documento' | 'mantencion';
  titulo: string;
  fecha: string;
  urgencia: 'atrasado' | 'pronto' | 'normal';
  ruta: string;
  movimientoId?: string;
}

/** Lo que viene: pagos pendientes, contratos que terminan (90 días), documentos que vencen (60 días). */
export function proximosVencimientos(d: Datos, hoy: Date): Vencimiento[] {
  const h = aISO(hoy);
  const urg = (f: string, lim = 7): Vencimiento['urgencia'] => {
    const n = diasEntre(h, f);
    return n < 0 ? 'atrasado' : n <= lim ? 'pronto' : 'normal';
  };
  const lista: Vencimiento[] = [];
  for (const m of d.movimientos) {
    const est = estadoReal(m, h);
    if ((est === 'pendiente' || est === 'atrasado') && m.fecha_vencimiento) {
      lista.push({ clave: `m-${m.id}`, tipo: 'pago', titulo: m.descripcion, fecha: m.fecha_vencimiento, urgencia: urg(m.fecha_vencimiento, 3), ruta: `/finanzas?mov=${m.id}`, movimientoId: m.id });
    }
  }
  for (const c of d.contratos) {
    if (c.estado !== 'vigente' || !c.fecha_termino) continue;
    const n = diasEntre(h, c.fecha_termino);
    if (n >= 0 && n <= 90) {
      const p = d.propiedades.find((x) => x.id === c.propiedad_id);
      lista.push({ clave: `c-${c.id}`, tipo: 'contrato', titulo: `Termina contrato ${p?.nombre ?? ''}`.trim(), fecha: c.fecha_termino, urgencia: urg(c.fecha_termino, 30), ruta: `/propiedades/${c.propiedad_id}` });
    }
  }
  for (const doc of d.documentos) {
    if (!doc.vence_el) continue;
    const n = diasEntre(h, doc.vence_el);
    if (n <= 60) {
      lista.push({ clave: `d-${doc.id}`, tipo: 'documento', titulo: `${n < 0 ? 'Venció' : 'Vence'}: ${doc.nombre}`, fecha: doc.vence_el, urgencia: urg(doc.vence_el, 15), ruta: '/documentos' });
    }
  }
  for (const s of d.solicitudes) {
    if (s.fecha_programada && (s.estado === 'abierta' || s.estado === 'en_proceso') && diasEntre(h, s.fecha_programada) >= 0 && diasEntre(h, s.fecha_programada) <= 14) {
      lista.push({ clave: `s-${s.id}`, tipo: 'mantencion', titulo: s.titulo, fecha: s.fecha_programada, urgencia: urg(s.fecha_programada, 2), ruta: `/propiedades/${s.propiedad_id}` });
    }
  }
  const orden = { atrasado: 0, pronto: 1, normal: 2 };
  return lista.sort((a, b) => orden[a.urgencia] - orden[b.urgencia] || a.fecha.localeCompare(b.fecha));
}

/** Resultado del mes (CLP pagado) de una propiedad. */
export function resultadoPropiedad(movs: Movimiento[], propiedadId: string, mes: string) {
  let ingresos = 0;
  let gastos = 0;
  for (const m of movs) {
    if (m.propiedad_id !== propiedadId || m.estado !== 'pagado' || m.moneda !== 'CLP' || claveMes(m.fecha) !== mes) continue;
    if (m.tipo === 'ingreso') ingresos += m.monto;
    else gastos += m.monto;
  }
  return { ingresos, gastos, resultado: ingresos - gastos };
}
