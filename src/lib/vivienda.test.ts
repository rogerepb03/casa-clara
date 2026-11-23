import { describe, expect, it } from 'vitest';
import { arriendoEstimado, comunasParaTi, enlacesBusqueda, presupuesto, RESPUESTAS_INICIALES, type Respuestas } from './vivienda';
import { COMUNAS } from './comunas';

const ejemplo: Respuestas = {
  ...RESPUESTAS_INICIALES,
  ingreso: 2_000_000, adultos: 2, ninos: 2, educacion: 'publica', gastoEducacion: 0,
  otrosGastos: 800_000, disponible: 400_000, dormitorios: 2,
};

describe('test de vivienda', () => {
  it('el ejemplo del usuario: gana 2.000.000 y tiene 400.000 para arriendo', () => {
    const p = presupuesto(ejemplo);
    expect(p.topePorRenta).toBe(666_666);
    expect(p.topeRecomendado).toBe(400_000);
    expect(p.limitante).toBe('declarado');
    expect(p.dormitoriosSugeridos).toBe(2);
  });

  it('si los gastos dejan poco, manda lo libre (descontando gasto común)', () => {
    const p = presupuesto({ ...ejemplo, disponible: null, otrosGastos: 1_500_000 });
    expect(p.libreDespuesDeGastos).toBe(500_000);
    expect(p.topeRecomendado).toBe(Math.floor(500_000 / 1.12));
    expect(p.limitante).toBe('gastos');
  });

  it('avisa cuando lo declarado supera un tercio del ingreso', () => {
    const p = presupuesto({ ...ejemplo, disponible: 900_000 });
    expect(p.topeRecomendado).toBe(666_666);
    expect(p.avisos.join(' ')).toContain('3 veces');
  });

  it('sugiere dormitorios según la familia', () => {
    expect(presupuesto({ ...ejemplo, ninos: 3 }).dormitoriosSugeridos).toBe(3);
    expect(presupuesto({ ...ejemplo, ninos: 0, adultos: 1 }).dormitoriosSugeridos).toBe(1);
  });

  it('estima el arriendo con el valor por m²', () => {
    const nunoa = COMUNAS.find((c) => c.nombre === 'Ñuñoa')!;
    expect(arriendoEstimado(nunoa, 2).estimado).toBe(720_000);
  });

  it('con $400.000 y 2 dormitorios no alcanza en Las Condes y sí aparece algo "justo" o "alcanza"', () => {
    const lista = comunasParaTi(ejemplo, 400_000);
    expect(lista).toHaveLength(24);
    expect(lista.find((x) => x.comuna.nombre === 'Las Condes')!.alcance).toBe('fuera');
    expect(lista[0].alcance).not.toBe('fuera');
    // ordenadas: primero las que alcanzan
    const orden = lista.map((x) => x.alcance);
    expect(orden.indexOf('fuera')).toBeGreaterThan(orden.lastIndexOf('justo'));
  });

  it('filtra por zona', () => {
    const lista = comunasParaTi({ ...ejemplo, zonas: ['Oriente'] }, 400_000);
    expect(lista.every((x) => x.comuna.zona === 'Oriente')).toBe(true);
  });

  it('arma el enlace de Portal Inmobiliario con comuna, dormitorios y precio', () => {
    const nunoa = COMUNAS.find((c) => c.nombre === 'Ñuñoa')!;
    const [portal, yapo] = enlacesBusqueda(nunoa, { ...ejemplo, tipo: 'departamento' }, 400_000);
    expect(portal.url).toBe('https://www.portalinmobiliario.com/arriendo/departamento/2-dormitorios/nunoa-metropolitana/_PriceRange_0CLP-400000CLP');
    expect(yapo.url).toContain('site%3Ayapo.cl');
    expect(COMUNAS.find((c) => c.nombre === 'Santiago Centro')!.slug).toBe('santiago');
  });
});
