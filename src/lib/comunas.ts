/**
 * Arriendo publicado por m² en 24 comunas del Gran Santiago (CLP/m², 2026).
 * Fuente: tabla comparativa de UFHouse, "Precio por metro cuadrado en Santiago",
 * https://ufhouse.com/precio-metro-cuadrado/ (datos de mercado 2026, consultada el 23-11-2026).
 * Son precios de avisos (lo pedido), no de contratos firmados: úsalos como referencia.
 * Para actualizar: cambia los valores y la fecha de ACTUALIZADO.
 */
export const ACTUALIZADO = '2026-11-23';
export const FUENTE = { nombre: 'UFHouse, precio por m² en Santiago 2026', url: 'https://ufhouse.com/precio-metro-cuadrado/' };

export type Zona = 'Norte' | 'Sur' | 'Oriente' | 'Poniente' | 'Centro';

export interface Comuna {
  nombre: string;
  slug: string; // como lo usa Portal Inmobiliario
  zona: Zona;
  zonaFuente: string;
  arriendoM2: number; // CLP por m² al mes
}

const c = (nombre: string, zonaFuente: string, arriendoM2: number): Comuna => ({
  nombre,
  slug: nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-').replace('santiago-centro', 'santiago'),
  zona: zonaFuente.startsWith('Sur') ? 'Sur' : zonaFuente.startsWith('Centro') ? (zonaFuente.includes('Oriente') ? 'Oriente' : zonaFuente.includes('Poniente') ? 'Poniente' : zonaFuente.includes('Sur') ? 'Sur' : 'Centro') : (zonaFuente as Zona),
  zonaFuente,
  arriendoM2,
});

export const COMUNAS: Comuna[] = [
  c('Colina', 'Norte', 12931),
  c('Conchalí', 'Norte', 9394),
  c('Estación Central', 'Centro-Poniente', 8295),
  c('Huechuraba', 'Norte', 10727),
  c('Independencia', 'Norte', 8824),
  c('La Cisterna', 'Sur', 8824),
  c('La Florida', 'Sur-Oriente', 10200),
  c('La Reina', 'Oriente', 13425),
  c('Las Condes', 'Oriente', 17938),
  c('Lo Barnechea', 'Oriente', 17164),
  c('Macul', 'Centro-Sur', 10000),
  c('Maipú', 'Poniente', 9286),
  c('Peñalolén', 'Oriente', 10600),
  c('Providencia', 'Oriente', 15517),
  c('Puente Alto', 'Sur-Oriente', 8333),
  c('Quilicura', 'Norte', 8594),
  c('Quinta Normal', 'Poniente', 7778),
  c('Recoleta', 'Norte', 9303),
  c('Renca', 'Norte', 8500),
  c('San Joaquín', 'Centro-Sur', 9333),
  c('San Miguel', 'Sur', 9512),
  c('Santiago Centro', 'Centro', 10000),
  c('Vitacura', 'Oriente', 17072),
  c('Ñuñoa', 'Centro-Oriente', 13095),
];
