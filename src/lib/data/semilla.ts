import type { Datos, Espacio, Movimiento, Publicacion } from '../types';
import { sumarDias, sumarMeses, aISO, inicioMes } from '../fechas';

/**
 * Datos de ejemplo para el modo local. Las fechas se calculan desde "hoy"
 * para que la demo siempre muestre vencimientos próximos y un mes en curso.
 */
export const ESPACIO_DEMO: Espacio = { id: 'esp-demo', nombre: 'Familia de prueba', moneda_base: 'CLP' };
export const PERSONA_ADMIN = 'per-admin';
export const PERSONA_ARRENDATARIA = 'per-ana';


/** Ilustraciones de ejemplo para la bitácora (SVG en línea, sin fotos reales). */
const svg = (cuerpo: string, fondo: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><rect width='400' height='300' fill='${fondo}'/>${cuerpo}</svg>`)}`;

export const FOTOS_DEMO: Record<string, string> = {
  'demo/bitacora/cumple-1.svg': svg(
    "<rect x='110' y='170' width='180' height='80' rx='10' fill='#f7d9e3'/><rect x='110' y='170' width='180' height='18' fill='#e98fb0'/><rect x='130' y='120' width='140' height='54' rx='8' fill='#fbe9ef'/><rect x='130' y='120' width='140' height='12' fill='#e98fb0'/>" +
    [160, 190, 220, 250].map((x) => `<rect x='${x - 3}' y='92' width='6' height='28' fill='#5b8fd0'/><ellipse cx='${x}' cy='86' rx='5' ry='8' fill='#f5c04f'/>`).join('') +
    "<circle cx='60' cy='60' r='16' fill='#5b8fd0' opacity='.6'/><circle cx='340' cy='50' r='12' fill='#e7a83e' opacity='.7'/><circle cx='320' cy='110' r='9' fill='#6aa77c' opacity='.7'/>", '#fff4e6'),
  'demo/bitacora/cumple-2.svg': svg(
    "<circle cx='140' cy='150' r='42' fill='#e7a83e'/><circle cx='260' cy='140' r='46' fill='#5b8fd0'/><rect x='98' y='190' width='84' height='110' rx='30' fill='#e7a83e'/><rect x='214' y='184' width='92' height='116' rx='30' fill='#5b8fd0'/><path d='M120 60 l20 -30 l20 30z' fill='#cf7ea8'/><path d='M240 52 l20 -30 l20 30z' fill='#6aa77c'/>", '#eef4fb'),
  'demo/bitacora/fiestas.svg': svg(
    "<path d='M0 40 Q200 110 400 40' stroke='#1a2747' stroke-width='3' fill='none'/>" +
    Array.from({ length: 9 }, (_, i) => { const x = 20 + i * 45; const y = 40 + 70 * Math.sin((Math.PI * x) / 400) * 0.8; const col = ['#d52b1e', '#ffffff', '#0039a6'][i % 3]; return `<path d='M${x - 14} ${y} L${x + 14} ${y} L${x} ${y + 30}Z' fill='${col}' stroke='#1a2747' stroke-width='1'/>`; }).join('') +
    "<ellipse cx='200' cy='235' rx='120' ry='26' fill='#c98a4a'/><path d='M120 232 Q200 160 280 232' fill='#e5b17a'/><path d='M140 222 Q200 180 260 222' stroke='#c98a4a' stroke-width='4' fill='none'/>", '#f3f7fd'),
  'demo/bitacora/humedad.svg': svg(
    "<rect x='0' y='0' width='400' height='300' fill='#e9e4da'/><path d='M260 20 Q300 60 280 110 Q320 150 290 200 Q250 230 230 170 Q190 150 215 100 Q200 50 260 20Z' fill='#b9ab8f' opacity='.75'/><path d='M270 50 Q290 80 275 110 Q295 140 280 170 Q255 185 245 150 Q225 130 240 100 Q232 70 270 50Z' fill='#8f8063' opacity='.6'/><rect x='0' y='255' width='400' height='45' fill='#cfc6b4'/>", '#e9e4da'),
};

export function crearSemilla(hoy: Date): Datos {
  const e = ESPACIO_DEMO.id;
  const d = (n: number) => aISO(sumarDias(hoy, n));

  const datos: Datos = {
    propiedades: [
      { id: 'pro-nunoa', espacio_id: e, nombre: 'Depto Ñuñoa', direccion: 'Av. Irarrázaval 3400, depto 1203', comuna: 'Ñuñoa', tipo: 'departamento', estado: 'arrendada', valor: 4200, moneda_valor: 'UF', foto_portada: null, notas: null },
      { id: 'pro-vina', espacio_id: e, nombre: 'Casa Viña del Mar', direccion: 'Calle Quillota 880', comuna: 'Viña del Mar', tipo: 'casa', estado: 'arrendada', valor: 6900, moneda_valor: 'UF', foto_portada: null, notas: null },
      { id: 'pro-conce', espacio_id: e, nombre: 'Local Concepción', direccion: 'Barros Arana 1150', comuna: 'Concepción', tipo: 'local', estado: 'arrendada', valor: 3100, moneda_valor: 'UF', foto_portada: null, notas: null },
      { id: 'pro-estac', espacio_id: e, nombre: 'Estacionamiento Providencia', direccion: 'Nueva Providencia 2200', comuna: 'Providencia', tipo: 'estacionamiento', estado: 'disponible', valor: 450, moneda_valor: 'UF', foto_portada: null, notas: null },
    ],
    personas: [
      { id: PERSONA_ADMIN, espacio_id: e, user_id: 'usr-demo', tipo: 'administrador', nombre: 'Tú', rut: null, email: 'demo@casaclara.cl', telefono: null, notas: null },
      { id: 'per-camila', espacio_id: e, user_id: null, tipo: 'hijo', nombre: 'Camila', rut: null, email: 'camila@correo.cl', telefono: null, notas: null },
      { id: PERSONA_ARRENDATARIA, espacio_id: e, user_id: 'usr-ana', tipo: 'arrendatario', nombre: 'Ana Rojas', rut: '15.234.567-8', email: 'ana@correo.cl', telefono: '+56 9 8123 4567', notas: null },
      { id: 'per-pedro', espacio_id: e, user_id: null, tipo: 'arrendatario', nombre: 'Pedro Soto', rut: '12.987.654-3', email: 'pedro@correo.cl', telefono: '+56 9 7654 3210', notas: null },
      { id: 'per-luis', espacio_id: e, user_id: null, tipo: 'arrendatario', nombre: 'Luis Fuentes', rut: null, email: null, telefono: '+56 9 6000 1122', notas: null },
      { id: 'per-marta', espacio_id: e, user_id: null, tipo: 'contacto_emergencia', nombre: 'Marta (vecina)', rut: null, email: null, telefono: '+56 9 5555 0101', notas: 'Tiene copia de llaves de Viña' },
    ],
    propiedad_personas: [
      { id: 'pp1', espacio_id: e, propiedad_id: 'pro-nunoa', persona_id: PERSONA_ADMIN, rol: 'propietario', porcentaje: 100 },
      { id: 'pp2', espacio_id: e, propiedad_id: 'pro-nunoa', persona_id: PERSONA_ARRENDATARIA, rol: 'arrendatario', porcentaje: null },
      { id: 'pp3', espacio_id: e, propiedad_id: 'pro-vina', persona_id: PERSONA_ADMIN, rol: 'propietario', porcentaje: 50 },
      { id: 'pp4', espacio_id: e, propiedad_id: 'pro-vina', persona_id: 'per-luis', rol: 'arrendatario', porcentaje: null },
      { id: 'pp5', espacio_id: e, propiedad_id: 'pro-vina', persona_id: 'per-marta', rol: 'contacto_emergencia', porcentaje: null },
      { id: 'pp6', espacio_id: e, propiedad_id: 'pro-conce', persona_id: 'per-pedro', rol: 'arrendatario', porcentaje: null },
      { id: 'pp7', espacio_id: e, propiedad_id: 'pro-estac', persona_id: PERSONA_ADMIN, rol: 'propietario', porcentaje: 100 },
    ],
    contratos: [
      { id: 'con-ana', espacio_id: e, propiedad_id: 'pro-nunoa', arrendatario_id: PERSONA_ARRENDATARIA, fecha_inicio: aISO(sumarMeses(hoy, -14)), fecha_termino: d(25), monto_arriendo: 620000, moneda: 'CLP', dia_pago: 5, estado: 'vigente' },
      { id: 'con-luis', espacio_id: e, propiedad_id: 'pro-vina', arrendatario_id: 'per-luis', fecha_inicio: aISO(sumarMeses(hoy, -8)), fecha_termino: aISO(sumarMeses(hoy, 16)), monto_arriendo: 890000, moneda: 'CLP', dia_pago: 10, estado: 'vigente' },
      { id: 'con-pedro', espacio_id: e, propiedad_id: 'pro-conce', arrendatario_id: 'per-pedro', fecha_inicio: aISO(sumarMeses(hoy, -20)), fecha_termino: aISO(sumarMeses(hoy, 4)), monto_arriendo: 24, moneda: 'UF', dia_pago: 1, estado: 'vigente' },
    ],
    categorias: [
      'Arriendo:ingreso', 'Sueldo:ingreso', 'Otros ingresos:ingreso', 'Gastos comunes:gasto', 'Contribuciones:gasto', 'Mantención:gasto',
      'Luz:gasto', 'Agua:gasto', 'Dividendo / crédito:gasto', 'Seguros:gasto', 'Supermercado:gasto', 'Educación:gasto', 'Otros gastos:gasto',
    ].map((s, i) => {
      const [nombre, tipo] = s.split(':');
      return { id: `cat-${i}`, espacio_id: e, nombre, tipo: tipo as 'ingreso' | 'gasto' };
    }),
    movimientos: [],
    documentos: [
      { id: 'doc1', espacio_id: e, nombre: 'Contrato arriendo Ana Rojas', tipo: 'contrato', ruta_archivo: 'demo/contrato-ana.pdf', propiedad_id: 'pro-nunoa', persona_id: null, contrato_id: 'con-ana', vence_el: null, visible_arrendatario: true, visible_propietario: true },
      { id: 'doc2', espacio_id: e, nombre: 'Escritura Depto Ñuñoa', tipo: 'escritura', ruta_archivo: 'demo/escritura-nunoa.pdf', propiedad_id: 'pro-nunoa', persona_id: null, contrato_id: null, vence_el: null, visible_arrendatario: false, visible_propietario: true },
      { id: 'doc3', espacio_id: e, nombre: 'Seguro de incendio Viña', tipo: 'certificado', ruta_archivo: 'demo/seguro-vina.pdf', propiedad_id: 'pro-vina', persona_id: null, contrato_id: null, vence_el: d(-3), visible_arrendatario: false, visible_propietario: true },
      { id: 'doc4', espacio_id: e, nombre: 'Contrato arriendo Luis Fuentes', tipo: 'contrato', ruta_archivo: 'demo/contrato-luis.pdf', propiedad_id: 'pro-vina', persona_id: null, contrato_id: 'con-luis', vence_el: null, visible_arrendatario: true, visible_propietario: true },
      { id: 'doc5', espacio_id: e, nombre: 'Contrato local Pedro Soto', tipo: 'contrato', ruta_archivo: 'demo/contrato-pedro.pdf', propiedad_id: 'pro-conce', persona_id: null, contrato_id: 'con-pedro', vence_el: null, visible_arrendatario: true, visible_propietario: true },
      { id: 'doc6', espacio_id: e, nombre: 'Certificado de gas Concepción', tipo: 'certificado', ruta_archivo: 'demo/gas-conce.pdf', propiedad_id: 'pro-conce', persona_id: null, contrato_id: null, vence_el: d(40), visible_arrendatario: true, visible_propietario: true },
    ],
    solicitudes: [
      { id: 'sol1', espacio_id: e, propiedad_id: 'pro-nunoa', titulo: 'Gotea la llave del lavaplatos', descripcion: 'Desde el fin de semana, gotea constante.', es_mantencion: false, estado: 'abierta', prioridad: 2, fecha_programada: null, created_at: sumarDias(hoy, -2).toISOString() },
      { id: 'sol2', espacio_id: e, propiedad_id: 'pro-vina', titulo: 'Limpieza de canaletas', descripcion: null, es_mantencion: true, estado: 'en_proceso', prioridad: 2, fecha_programada: d(6), created_at: sumarDias(hoy, -10).toISOString() },
    ],
    miembros: [
      { id: 'mie1', espacio_id: e, user_id: 'usr-demo', email: 'demo@casaclara.cl', rol: 'administrador', estado: 'activo', persona_id: PERSONA_ADMIN },
      { id: 'mie2', espacio_id: e, user_id: 'usr-ana', email: 'ana@correo.cl', rol: 'arrendatario', estado: 'activo', persona_id: PERSONA_ARRENDATARIA },
      { id: 'mie3', espacio_id: e, user_id: null, email: 'camila@correo.cl', rol: 'familiar', estado: 'invitado', persona_id: 'per-camila' },
    ],
    publicaciones: [] as Publicacion[],
  };

  // Seis meses de historia + el mes en curso
  const movs: Movimiento[] = [];
  const cat = (n: string) => datos.categorias.find((c) => c.nombre === n)!.id;
  let k = 0;
  const mov = (m: Partial<Movimiento>) =>
    movs.push({
      id: `mov-${++k}`, espacio_id: e, tipo: 'gasto', categoria_id: null, descripcion: '', monto: 0, moneda: 'CLP',
      fecha: aISO(hoy), fecha_vencimiento: null, estado: 'pagado', pagado_en: null, medio_pago: 'transferencia',
      propiedad_id: null, persona_id: null, contrato_id: null, comprobante: null, ...m,
      created_at: new Date(`${m.fecha ?? aISO(hoy)}T12:00:00`).toISOString(),
    });

  for (let i = 6; i >= 0; i--) {
    const mes = inicioMes(sumarMeses(hoy, -i));
    const enMes = (dia: number) => aISO(sumarDias(mes, dia - 1));
    const actual = i === 0;
    const etiqueta = mes.toLocaleDateString('es-CL', { month: 'long' });

    // Arriendo Ñuñoa (día 5). En el mes actual: atrasado si ya pasó el día 5.
    const venceAna = enMes(5);
    const anaEstado = actual ? (venceAna < aISO(hoy) ? 'atrasado' : 'pendiente') : 'pagado';
    mov({ tipo: 'ingreso', categoria_id: cat('Arriendo'), descripcion: `Arriendo Depto Ñuñoa ${etiqueta}`, monto: 620000, fecha: venceAna, fecha_vencimiento: venceAna, estado: anaEstado, propiedad_id: 'pro-nunoa', persona_id: PERSONA_ARRENDATARIA, contrato_id: 'con-ana' });
    // Arriendo Viña (día 10): en el mes actual vence en 3 días si aún no llega
    const venceLuis = actual ? d(3) : enMes(10);
    mov({ tipo: 'ingreso', categoria_id: cat('Arriendo'), descripcion: `Arriendo Casa Viña ${etiqueta}`, monto: 890000, fecha: venceLuis, fecha_vencimiento: venceLuis, estado: actual ? 'pendiente' : 'pagado', propiedad_id: 'pro-vina', persona_id: 'per-luis', contrato_id: 'con-luis' });
    // Local Concepción en UF
    mov({ tipo: 'ingreso', categoria_id: cat('Arriendo'), descripcion: `Arriendo Local Concepción ${etiqueta}`, monto: 24, moneda: 'UF', fecha: enMes(1), fecha_vencimiento: enMes(1), estado: 'pagado', propiedad_id: 'pro-conce', persona_id: 'per-pedro', contrato_id: 'con-pedro' });
    // Gastos comunes
    mov({ categoria_id: cat('Gastos comunes'), descripcion: `Gastos comunes Ñuñoa ${etiqueta}`, monto: 98000 + (i % 3) * 4500, fecha: actual ? d(6) : enMes(12), fecha_vencimiento: actual ? d(6) : enMes(12), estado: actual ? 'pendiente' : 'pagado', propiedad_id: 'pro-nunoa' });
    mov({ categoria_id: cat('Gastos comunes'), descripcion: `Gastos comunes Estacionamiento ${etiqueta}`, monto: 18000, fecha: enMes(12), estado: actual && enMes(12) >= aISO(hoy) ? 'pendiente' : 'pagado', fecha_vencimiento: enMes(12), propiedad_id: 'pro-estac' });
    // Familia
    mov({ tipo: 'ingreso', categoria_id: cat('Sueldo'), descripcion: `Sueldo ${etiqueta}`, monto: 2350000, fecha: enMes(1) });
    mov({ categoria_id: cat('Supermercado'), descripcion: 'Supermercado del mes', monto: 410000 + (i % 2) * 35000, fecha: enMes(3) <= aISO(hoy) || !actual ? enMes(3) : aISO(hoy) });
    mov({ categoria_id: cat('Educación'), descripcion: `Colegio ${etiqueta}`, monto: 285000, fecha: enMes(5) <= aISO(hoy) || !actual ? enMes(5) : aISO(hoy) });
    mov({ categoria_id: cat('Dividendo / crédito'), descripcion: `Dividendo Depto Ñuñoa ${etiqueta}`, monto: 540000, fecha: enMes(4) <= aISO(hoy) || !actual ? enMes(4) : aISO(hoy), propiedad_id: 'pro-nunoa' });
    if (i % 2 === 0) mov({ categoria_id: cat('Luz'), descripcion: 'Luz casa', monto: 52000 + i * 1200, fecha: enMes(8) <= aISO(hoy) || !actual ? enMes(8) : aISO(hoy) });
    if (i === 4 || i === 1) mov({ categoria_id: cat('Contribuciones'), descripcion: 'Contribuciones Casa Viña', monto: 312000, fecha: enMes(20), propiedad_id: 'pro-vina' });
    if (i === 2) mov({ categoria_id: cat('Mantención'), descripcion: 'Gasfíter calefont Viña', monto: 85000, fecha: enMes(15), propiedad_id: 'pro-vina', comprobante: 'demo/boleta-gasfiter.jpg' });
  }
  // Feria semanal de las últimas 5 semanas: alimenta la racha del modo juego
  for (let w = 0; w < 5; w++) {
    mov({ categoria_id: cat('Supermercado'), descripcion: 'Feria', monto: 32000 + w * 1500, fecha: aISO(sumarDias(hoy, -7 * w)) });
  }
  const pub = (x: Partial<Publicacion>): Publicacion => ({
    id: '', espacio_id: e, tipo: 'recuerdo', titulo: '', texto: null, fecha: aISO(hoy), propiedad_id: null, fotos: [],
    visibilidad: 'familia', gravedad: null, resuelto: false, creado_por: 'usr-demo', ...x,
    created_at: new Date(`${x.fecha ?? aISO(hoy)}T18:00:00`).toISOString(),
  });
  datos.publicaciones = [
    pub({ id: 'pub-cumple', tipo: 'evento_familiar', titulo: 'Cumpleaños 10 de Camila', texto: 'Torta de frambuesa y toda la familia en la casa de Viña. Camila sopló las velas al segundo intento.', fecha: d(-12), fotos: ['demo/bitacora/cumple-1.svg', 'demo/bitacora/cumple-2.svg'] }),
    pub({ id: 'pub-humedad', tipo: 'dano', titulo: 'Mancha de humedad en el dormitorio', texto: 'Aparece en la esquina del cielo después de las lluvias. Parece venir del departamento de arriba.', fecha: d(-4), propiedad_id: 'pro-nunoa', visibilidad: 'propiedad', gravedad: 2, fotos: ['demo/bitacora/humedad.svg'], creado_por: 'usr-ana' }),
    pub({ id: 'pub-fiestas', tipo: 'recuerdo', titulo: 'Fiestas Patrias en familia', texto: 'Empanadas caseras y cueca en el patio.', fecha: aISO(sumarMeses(hoy, -2)), fotos: ['demo/bitacora/fiestas.svg'] }),
    pub({ id: 'pub-corte', tipo: 'incidente', titulo: 'Corte de luz en el local', texto: 'Se cortó la luz en todo el sector por 6 horas. Sin daños.', fecha: d(-30), propiedad_id: 'pro-conce', visibilidad: 'propiedad', gravedad: 1, resuelto: true }),
  ];
  datos.movimientos = movs.filter((m) => m.fecha <= aISO(sumarDias(hoy, 31)));
  return datos;
}
