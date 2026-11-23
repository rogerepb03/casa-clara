import { describe, expect, it } from 'vitest';
import { crearSemilla } from './data/semilla';
import { saludPropiedad, puntajeHogar, racha, logros, proximaMejorAccion, desafioDelMes } from './juego';
import { indicadores, proximosVencimientos, serieMensual, estadoReal } from './finanzas';
import { dinero, leerMonto } from './formato';
import { aISO } from './fechas';
import type { Datos } from './types';

const HOY = new Date(2026, 10, 23); // 23 nov 2026
const datos = (): Datos => crearSemilla(HOY);

describe('salud de propiedades', () => {
  it('una propiedad sin problemas tiene 100 y 4 ventanas', () => {
    const d = datos();
    d.documentos.push({ id: 'x', espacio_id: 'e', nombre: 'Escritura', tipo: 'escritura', ruta_archivo: 'r', propiedad_id: 'pro-estac', persona_id: null, contrato_id: null, vence_el: null, visible_arrendatario: false, visible_propietario: true });
    const p = { ...d.propiedades.find((x) => x.id === 'pro-estac')!, estado: 'uso_propio' as const };
    const s = saludPropiedad(p, d, HOY);
    expect(s.puntaje).toBe(100);
    expect(s.ventanas).toBe(4);
    expect(s.motivos).toHaveLength(0);
  });

  it('Ñuñoa pierde puntos por arriendo atrasado y contrato por terminar, con motivos explicados', () => {
    const d = datos();
    const s = saludPropiedad(d.propiedades[0], d, HOY);
    expect(s.motivos.map((m) => m.texto)).toEqual(['1 pago atrasado', 'El contrato termina en 25 días']);
    expect(s.puntaje).toBe(60);
    expect(s.ventanas).toBe(2);
    expect(s.nivel).toBe('atencion');
  });

  it('el estacionamiento desocupado y sin documentos pierde 25', () => {
    const d = datos();
    const s = saludPropiedad(d.propiedades.find((x) => x.id === 'pro-estac')!, d, HOY);
    expect(s.puntaje).toBe(75);
  });

  it('el puntaje nunca baja de 0', () => {
    const d = datos();
    for (let i = 0; i < 6; i++) {
      d.movimientos.push({ ...d.movimientos[0], id: `a${i}`, estado: 'atrasado', fecha_vencimiento: '2026-01-01' });
    }
    const s = saludPropiedad({ ...d.propiedades[0], estado: 'disponible' }, d, HOY);
    expect(s.puntaje).toBeGreaterThanOrEqual(0);
  });

  it('puntaje del hogar es el promedio', () => {
    expect(puntajeHogar([{ puntaje: 100 }, { puntaje: 50 }] as never)).toBe(75);
    expect(puntajeHogar([])).toBe(0);
  });
});

describe('racha semanal', () => {
  it('cuenta semanas seguidas con movimientos', () => {
    const d = datos();
    d.movimientos = [
      { ...d.movimientos[0], created_at: new Date(2026, 10, 23, 10).toISOString() },
      { ...d.movimientos[0], created_at: new Date(2026, 10, 17, 10).toISOString() },
      { ...d.movimientos[0], created_at: new Date(2026, 10, 10, 10).toISOString() },
      { ...d.movimientos[0], created_at: new Date(2026, 9, 20, 10).toISOString() }, // semana cortada
    ];
    expect(racha(d, HOY)).toEqual({ semanas: 3, activaEstaSemana: true });
  });

  it('si esta semana aún no hay registro, la racha sigue viva desde la semana pasada', () => {
    const d = datos();
    d.movimientos = [{ ...d.movimientos[0], created_at: new Date(2026, 10, 18, 10).toISOString() }];
    expect(racha(d, HOY)).toEqual({ semanas: 1, activaEstaSemana: false });
  });
});

describe('logros, próxima acción y desafío', () => {
  it('los logros reflejan los datos de ejemplo', () => {
    const d = datos();
    const saludes = d.propiedades.map((p) => saludPropiedad(p, d, HOY));
    const l = Object.fromEntries(logros(d, HOY, saludes).map((x) => [x.id, x]));
    expect(l['primera-llave'].logrado).toBe(true);
    expect(l['todo-en-su-lugar']).toMatchObject({ actual: 3, meta: 4, logrado: false });
    expect(l['mes-sin-atrasos'].logrado).toBe(true);
    expect(l['equipo']).toMatchObject({ actual: 2, logrado: true });
    expect(l['contador'].actual).toBeLessThanOrEqual(50);
  });

  it('la próxima mejor acción ataca el problema que más puntos resta', () => {
    const d = datos();
    const saludes = d.propiedades.map((p) => saludPropiedad(p, d, HOY));
    const a = proximaMejorAccion(d, HOY, saludes)!;
    expect(a.titulo).toBe('Registra el pago o contacta al arrendatario');
    expect(a.detalle).toContain('Depto Ñuñoa');
    expect(a.puntos).toBe(6); // 25 puntos / 4 propiedades
  });

  it('el desafío del mes cuenta pagos del mes', () => {
    const d = datos();
    const x = desafioDelMes(d, HOY);
    expect(x.progreso).toBeGreaterThan(0);
    expect(x.progreso).toBeLessThan(1);
    expect(x.texto).toContain('atrasado');
  });
});

describe('finanzas', () => {
  it('pendiente vencido cuenta como atrasado', () => {
    expect(estadoReal({ estado: 'pendiente', fecha_vencimiento: '2026-11-01' } as never, '2026-11-23')).toBe('atrasado');
    expect(estadoReal({ estado: 'pendiente', fecha_vencimiento: '2026-11-30' } as never, '2026-11-23')).toBe('pendiente');
  });

  it('indicadores separan CLP de otras monedas', () => {
    const i = indicadores(datos().movimientos, HOY);
    expect(i.porCobrar).toBe(620000 + 890000);
    expect(i.atrasados).toBe(1);
    expect(i.otrasMonedas).toEqual([]);
  });

  it('la serie tiene 6 meses terminando en el actual', () => {
    const s = serieMensual(datos().movimientos, HOY);
    expect(s).toHaveLength(6);
    expect(s[5].mes).toBe('2026-11');
    expect(s[4].ingresos).toBe(620000 + 890000 + 2350000);
  });

  it('vencimientos: atrasados primero', () => {
    const v = proximosVencimientos(datos(), HOY);
    expect(v[0].urgencia).toBe('atrasado');
    expect(v.some((x) => x.tipo === 'contrato')).toBe(true);
    expect(v.some((x) => x.tipo === 'mantencion')).toBe(true);
  });
});

describe('formato chileno', () => {
  it('formatea y lee montos', () => {
    expect(dinero(550000)).toBe('$550.000');
    expect(dinero(24, 'UF')).toBe('UF 24,00');
    expect(leerMonto('550.000')).toBe(550000);
    expect(leerMonto('24,5')).toBe(24.5);
    expect(leerMonto('abc')).toBeNull();
  });

  it('aISO usa hora local', () => {
    expect(aISO(HOY)).toBe('2026-11-23');
  });
});
