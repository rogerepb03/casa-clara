import { COMUNAS, type Comuna, type Zona } from './comunas';

/**
 * TEST DE VIVIENDA
 * Calcula cuánto arriendo puede pagar un hogar y en qué comunas le alcanza.
 * Todo es transparente: cada número del resultado sale de una regla explicada aquí.
 */

export type Educacion = 'publica' | 'subvencionada' | 'particular' | 'sin_hijos';
export type TipoVivienda = 'departamento' | 'casa' | 'cualquiera';

export interface Respuestas {
  ingreso: number;            // líquido mensual del hogar
  adultos: number;
  ninos: number;
  educacion: Educacion;
  gastoEducacion: number;     // mensual
  autos: number;
  gastoAutos: number;         // mensual: cuota, bencina, TAG, seguro
  seguros: number;            // salud, vida u otros, mensual
  deudas: number;             // cuotas de créditos, mensual
  otrosGastos: number;        // alimentación, cuentas, otros, mensual
  disponible: number | null;  // lo que la persona dice tener para arriendo (opcional)
  tipo: TipoVivienda;
  dormitorios: number;
  zonas: Zona[];              // vacío = todas
}

export const RESPUESTAS_INICIALES: Respuestas = {
  ingreso: 0, adultos: 2, ninos: 0, educacion: 'sin_hijos', gastoEducacion: 0, autos: 0, gastoAutos: 0,
  seguros: 0, deudas: 0, otrosGastos: 0, disponible: null, tipo: 'cualquiera', dormitorios: 2, zonas: [],
};

/** Superficie típica según dormitorios (m² útiles), para estimar el arriendo con el valor por m². */
export const M2_POR_DORMITORIOS: Record<number, number> = { 1: 40, 2: 55, 3: 70, 4: 90 };
/** Gastos comunes estimados que se suman al arriendo en departamentos. */
export const GASTO_COMUN_ESTIMADO = 0.12; // 12% del arriendo, referencia conservadora
/** Requisito habitual de corredoras: renta líquida de al menos 3 veces el arriendo. */
export const VECES_RENTA = 3;

export interface Presupuesto {
  gastosFijos: number;
  libreDespuesDeGastos: number;
  topePorRenta: number;      // ingreso / 3
  topeRecomendado: number;   // el menor entre lo libre, lo que dice tener y la regla de 3 veces
  limitante: 'renta' | 'gastos' | 'declarado';
  dormitoriosSugeridos: number;
  avisos: string[];
}

export function presupuesto(r: Respuestas): Presupuesto {
  const gastosFijos = r.gastoEducacion + r.gastoAutos + r.seguros + r.deudas + r.otrosGastos;
  const libre = Math.max(0, r.ingreso - gastosFijos);
  const topePorRenta = Math.floor(r.ingreso / VECES_RENTA);
  // Reservamos el gasto común dentro de lo libre: arriendo × (1 + 12%) ≤ libre
  const topePorGastos = Math.floor(libre / (1 + GASTO_COMUN_ESTIMADO));

  const candidatos: [number, Presupuesto['limitante']][] = [[topePorRenta, 'renta'], [topePorGastos, 'gastos']];
  if (r.disponible && r.disponible > 0) candidatos.push([r.disponible, 'declarado']);
  candidatos.sort((a, b) => a[0] - b[0]);
  const [topeRecomendado, limitante] = candidatos[0];

  const hijosPorPieza = Math.ceil(r.ninos / 2);
  const adultosExtra = Math.max(0, r.adultos - 2);
  const dormitoriosSugeridos = Math.max(1, Math.min(4, 1 + hijosPorPieza + adultosExtra));

  const avisos: string[] = [];
  if (r.ingreso <= 0) avisos.push('Ingresa el ingreso líquido del hogar para calcular.');
  if (r.disponible && r.disponible > topePorRenta) {
    avisos.push(`Lo que tienes disponible supera un tercio de tu ingreso. Muchas corredoras piden renta de ${VECES_RENTA} veces el arriendo, así que podrían pedirte aval o más garantía.`);
  }
  if (gastosFijos > r.ingreso * 0.7 && r.ingreso > 0) avisos.push('Tus gastos fijos superan el 70% de tu ingreso: el margen para imprevistos es bajo.');
  if (r.dormitorios < dormitoriosSugeridos) avisos.push(`Por el tamaño de tu familia sugerimos ${dormitoriosSugeridos} dormitorios; buscaste ${r.dormitorios}.`);
  if (r.otrosGastos === 0 && r.ingreso > 0) avisos.push('No indicaste gastos de alimentación y cuentas. Agregarlos da un resultado más realista.');

  return { gastosFijos, libreDespuesDeGastos: libre, topePorRenta, topeRecomendado, limitante, dormitoriosSugeridos, avisos };
}

export type Alcance = 'alcanza' | 'justo' | 'fuera';

export interface ResultadoComuna {
  comuna: Comuna;
  estimado: number;  // arriendo estimado para los dormitorios pedidos
  minimo: number;    // −15%: los avisos más económicos de la comuna
  maximo: number;
  alcance: Alcance;
}

export function arriendoEstimado(comuna: Comuna, dormitorios: number) {
  const m2 = M2_POR_DORMITORIOS[Math.max(1, Math.min(4, dormitorios))];
  const estimado = Math.round((comuna.arriendoM2 * m2) / 1000) * 1000;
  return { estimado, minimo: Math.round(estimado * 0.85 / 1000) * 1000, maximo: Math.round(estimado * 1.15 / 1000) * 1000 };
}

/** Comunas ordenadas de la que mejor calza a la que menos, según el tope. */
export function comunasParaTi(r: Respuestas, tope: number): ResultadoComuna[] {
  return COMUNAS
    .filter((c) => r.zonas.length === 0 || r.zonas.includes(c.zona))
    .map((comuna) => {
      const e = arriendoEstimado(comuna, r.dormitorios);
      const alcance: Alcance = e.estimado <= tope ? 'alcanza' : e.minimo <= tope ? 'justo' : 'fuera';
      return { comuna, ...e, alcance };
    })
    .sort((a, b) => {
      const orden = { alcanza: 0, justo: 1, fuera: 2 };
      return orden[a.alcance] - orden[b.alcance] || b.estimado - a.estimado;
    });
}

/** Enlaces a portales con la búsqueda ya armada. */
export function enlacesBusqueda(comuna: Comuna, r: Respuestas, tope: number) {
  const tipoPI = r.tipo === 'casa' ? 'casa' : r.tipo === 'departamento' ? 'departamento' : '';
  const ruta = ['arriendo', tipoPI, `${r.dormitorios}-dormitorios`, `${comuna.slug}-metropolitana`].filter(Boolean).join('/');
  const portal = `https://www.portalinmobiliario.com/${ruta}/_PriceRange_0CLP-${tope}CLP`;
  const que = `arriendo ${r.tipo === 'cualquiera' ? 'casa o departamento' : r.tipo} ${r.dormitorios} dormitorios ${comuna.nombre}`;
  const google = (sitio: string) => `https://www.google.com/search?q=${encodeURIComponent(`${que} site:${sitio}`)}`;
  return [
    { nombre: 'Portal Inmobiliario', url: portal },
    { nombre: 'Yapo', url: google('yapo.cl') },
    { nombre: 'Toctoc', url: google('toctoc.com') },
    { nombre: 'iCasas', url: google('icasas.cl') },
  ];
}
