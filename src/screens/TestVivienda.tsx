import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../state/App';
import { api } from '../lib/data';
import { Barra, Campo, Encabezado } from '../components/Comunes';
import { IFlecha } from '../components/Iconos';
import { comunasParaTi, enlacesBusqueda, presupuesto, RESPUESTAS_INICIALES, VECES_RENTA, type Educacion, type Respuestas, type ResultadoComuna, type TipoVivienda } from '../lib/vivienda';
import { ACTUALIZADO, FUENTE, type Zona } from '../lib/comunas';
import { dinero, leerMonto } from '../lib/formato';
import { fechaLarga } from '../lib/fechas';

const CLAVE = 'casaclara:tests-vivienda';
export interface TestGuardado { fecha: string; respuestas: Respuestas; tope: number; sincronizado?: boolean }

export function historialTests(): TestGuardado[] {
  try { return JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as TestGuardado[]; } catch { return []; }
}
function guardarHistorial(lista: TestGuardado[]) {
  try { localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, 20))); } catch { /* sin espacio: se mantiene en pantalla */ }
}

function Monto({ valor, cambiar, etiqueta, ayuda }: { valor: number; cambiar: (n: number) => void; etiqueta: string; ayuda?: string }) {
  const [texto, setTexto] = useState(valor ? valor.toLocaleString('es-CL') : '');
  return (
    <Campo etiqueta={etiqueta} ayuda={ayuda}>
      <input inputMode="numeric" placeholder="$0" value={texto}
        onChange={(e) => { const n = leerMonto(e.target.value) ?? 0; setTexto(e.target.value ? n.toLocaleString('es-CL') : ''); cambiar(n); }} />
    </Campo>
  );
}

function Contador({ valor, cambiar, etiqueta, min = 0, max = 10 }: { valor: number; cambiar: (n: number) => void; etiqueta: string; min?: number; max?: number }) {
  return (
    <div className="campo">
      <span>{etiqueta}</span>
      <div className="contador" role="group" aria-label={etiqueta}>
        <button type="button" className="btn-icono" aria-label={`Menos ${etiqueta.toLowerCase()}`} onClick={() => cambiar(Math.max(min, valor - 1))} disabled={valor <= min}>−</button>
        <output aria-live="polite" className="num">{valor}</output>
        <button type="button" className="btn-icono" aria-label={`Más ${etiqueta.toLowerCase()}`} onClick={() => cambiar(Math.min(max, valor + 1))} disabled={valor >= max}>+</button>
      </div>
    </div>
  );
}

const PASOS = ['Tu hogar', 'Tus gastos', 'Lo que buscas'];

export default function TestVivienda() {
  const { usuario } = useApp();
  const navegar = useNavigate();
  const anterior = historialTests()[0];
  const [r, setR] = useState<Respuestas>(anterior?.respuestas ?? RESPUESTAS_INICIALES);
  const [paso, setPaso] = useState(0);
  const [listo, setListo] = useState(false);
  const set = <K extends keyof Respuestas>(k: K) => (v: Respuestas[K]) => setR((x) => ({ ...x, [k]: v }));

  const p = useMemo(() => presupuesto(r), [r]);
  const lista = useMemo(() => comunasParaTi(r, p.topeRecomendado), [r, p.topeRecomendado]);

  // Sube los tests hechos antes de registrarse
  useEffect(() => {
    if (!usuario || api.modo !== 'supabase') return;
    const h = historialTests();
    const pendientes = h.filter((t) => !t.sincronizado);
    if (!pendientes.length) return;
    void Promise.all(pendientes.map((t) => api.crear('tests_vivienda', { respuestas: t.respuestas, resultado: { tope: t.tope }, created_at: t.fecha }).catch(() => null)))
      .then(() => guardarHistorial(h.map((t) => ({ ...t, sincronizado: true }))));
  }, [usuario]);

  function terminar() {
    const t: TestGuardado = { fecha: new Date().toISOString(), respuestas: r, tope: p.topeRecomendado, sincronizado: false };
    guardarHistorial([t, ...historialTests()]);
    if (usuario && api.modo === 'supabase') {
      api.crear('tests_vivienda', { respuestas: r, resultado: { tope: p.topeRecomendado, limitante: p.limitante } })
        .then(() => guardarHistorial(historialTests().map((x, i) => (i === 0 ? { ...x, sincronizado: true } : x))))
        .catch(() => undefined);
    }
    setListo(true);
    window.scrollTo({ top: 0 });
  }

  if (listo) return <Resultado r={r} p={p} lista={lista} repetir={() => { setListo(false); setPaso(0); }} sinCuenta={!usuario} />;

  const puedeSeguir = paso !== 0 || r.ingreso > 0;

  return (
    <div className={usuario ? undefined : 'app'}>
      <Encabezado titulo="Test de vivienda" sub="Descubre cuánto arriendo puedes pagar y en qué comunas buscar"
        volver={usuario ? '/mas' : undefined}
        accion={!usuario && <button className="btn chico" onClick={() => navegar('/')}>Salir</button>} />
      <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
        <Barra valor={(paso + 1) / PASOS.length} />
        <p className="quieto chico">Paso {paso + 1} de {PASOS.length}: {PASOS[paso]}</p>
      </div>

      <form className="form" onSubmit={(e) => { e.preventDefault(); if (paso < 2) setPaso(paso + 1); else terminar(); }}>
        {paso === 0 && (
          <>
            <Monto etiqueta="Ingreso líquido mensual del hogar" ayuda="Suma lo que reciben todos los que aportan, después de descuentos." valor={r.ingreso} cambiar={set('ingreso')} />
            <div className="dos">
              <Contador etiqueta="Adultos" valor={r.adultos} cambiar={set('adultos')} min={1} />
              <Contador etiqueta="Niños" valor={r.ninos} cambiar={(n) => setR((x) => ({ ...x, ninos: n, educacion: n === 0 ? 'sin_hijos' : x.educacion === 'sin_hijos' ? 'publica' : x.educacion }))} />
            </div>
            {r.ninos > 0 && (
              <Campo etiqueta="Educación de tus hijos">
                <select value={r.educacion} onChange={(e) => set('educacion')(e.target.value as Educacion)}>
                  <option value="publica">Pública (gratuita)</option>
                  <option value="subvencionada">Particular subvencionada</option>
                  <option value="particular">Particular pagada</option>
                </select>
              </Campo>
            )}
          </>
        )}

        {paso === 1 && (
          <>
            <p className="quieto chico">Montos mensuales aproximados. Si algo no aplica, déjalo vacío.</p>
            {r.ninos > 0 && r.educacion !== 'publica' && (
              <Monto etiqueta="Educación" ayuda="Mensualidades, transporte escolar, materiales." valor={r.gastoEducacion} cambiar={set('gastoEducacion')} />
            )}
            <Monto etiqueta="Alimentación, cuentas y gastos del hogar" ayuda="Supermercado, luz, agua, gas, internet, celulares." valor={r.otrosGastos} cambiar={set('otrosGastos')} />
            <div className="dos">
              <Contador etiqueta="Autos" valor={r.autos} cambiar={set('autos')} max={5} />
              {r.autos > 0 ? <Monto etiqueta="Gasto en autos" ayuda="Cuota, bencina, TAG, seguro." valor={r.gastoAutos} cambiar={set('gastoAutos')} /> : <span />}
            </div>
            <Monto etiqueta="Seguros y salud" ayuda="Isapre adicional, seguros de vida u otros." valor={r.seguros} cambiar={set('seguros')} />
            <Monto etiqueta="Cuotas de créditos y deudas" valor={r.deudas} cambiar={set('deudas')} />
          </>
        )}

        {paso === 2 && (
          <>
            <Monto etiqueta="¿Cuánto tienes disponible para arriendo?" ayuda="Opcional. Si lo dejas vacío, lo calculamos con tus ingresos y gastos." valor={r.disponible ?? 0} cambiar={(n) => set('disponible')(n || null)} />
            <div className="campo">
              <span>Tipo de vivienda</span>
              <div className="segmentos" role="group" aria-label="Tipo de vivienda">
                {(['departamento', 'casa', 'cualquiera'] as TipoVivienda[]).map((t) => (
                  <button key={t} type="button" aria-pressed={r.tipo === t} onClick={() => set('tipo')(t)}>{{ departamento: 'Depto', casa: 'Casa', cualquiera: 'Cualquiera' }[t]}</button>
                ))}
              </div>
            </div>
            <Contador etiqueta="Dormitorios mínimos" valor={r.dormitorios} cambiar={set('dormitorios')} min={1} max={4} />
            <div className="campo">
              <span>Zonas de Santiago que te sirven</span>
              <small>Si no eliges ninguna, mostramos todas.</small>
              <div className="filtros" style={{ flexWrap: 'wrap' }}>
                {(['Centro', 'Norte', 'Sur', 'Oriente', 'Poniente'] as Zona[]).map((z) => (
                  <button key={z} type="button" aria-pressed={r.zonas.includes(z)}
                    onClick={() => set('zonas')(r.zonas.includes(z) ? r.zonas.filter((x) => x !== z) : [...r.zonas, z])}>{z}</button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="dos">
          {paso > 0 ? <button type="button" className="btn" onClick={() => setPaso(paso - 1)}>Atrás</button> : <span />}
          <button className="btn primario" disabled={!puedeSeguir}>{paso < 2 ? 'Siguiente' : 'Ver resultado'}</button>
        </div>
        {anterior && paso === 0 && <p className="quieto chico">Cargamos las respuestas de tu último test ({fechaLarga(anterior.fecha.slice(0, 10))}). Cámbialas si tu situación cambió.</p>}
      </form>
    </div>
  );
}

function Resultado({ r, p, lista, repetir, sinCuenta }: { r: Respuestas; p: ReturnType<typeof presupuesto>; lista: ResultadoComuna[]; repetir: () => void; sinCuenta: boolean }) {
  const [verFuera, setVerFuera] = useState(false);
  const alcanzan = lista.filter((x) => x.alcance === 'alcanza');
  const justas = lista.filter((x) => x.alcance === 'justo');
  const fuera = lista.filter((x) => x.alcance === 'fuera');
  const motivo = { renta: `un tercio de tu ingreso (las corredoras suelen pedir renta de ${VECES_RENTA} veces el arriendo)`, gastos: 'lo que te queda después de tus gastos, reservando gastos comunes', declarado: 'lo que indicaste tener disponible' }[p.limitante];

  return (
    <div className={sinCuenta ? 'app' : undefined}>
      <Encabezado titulo="Tu resultado" sub={`${r.dormitorios} dormitorio${r.dormitorios > 1 ? 's' : ''}, ${r.tipo === 'cualquiera' ? 'casa o departamento' : r.tipo}`} />
      <section className="barrio" style={{ paddingBottom: 22 }}>
        <p style={{ color: '#c9d3e6' }}>Puedes pagar un arriendo de hasta</p>
        <p className="puntaje num" style={{ fontSize: '2.8rem', marginTop: 6 }}>{dinero(p.topeRecomendado)}</p>
        <p className="chico" style={{ color: '#c9d3e6', marginTop: 10 }}>Calculado con {motivo}.</p>
      </section>

      <dl className="panel datos" style={{ marginTop: 12 }}>
        <dt>Ingreso del hogar</dt><dd>{dinero(r.ingreso)}</dd>
        <dt>Gastos fijos</dt><dd>−{dinero(p.gastosFijos)}</dd>
        <dt>Te queda</dt><dd>{dinero(p.libreDespuesDeGastos)}</dd>
        <dt>Un tercio del ingreso</dt><dd>{dinero(p.topePorRenta)}</dd>
        {r.disponible ? <><dt>Lo que indicaste</dt><dd>{dinero(r.disponible)}</dd></> : null}
      </dl>
      {p.avisos.length > 0 && (
        <div className="panel" style={{ padding: 16, marginTop: 10, display: 'grid', gap: 8 }}>
          {p.avisos.map((a) => <p key={a} className="chico" style={{ color: 'var(--alerta)' }}>{a}</p>)}
        </div>
      )}

      <h2>{alcanzan.length ? `${alcanzan.length} comunas te alcanzan` : justas.length ? 'Ajustado, pero hay opciones' : 'Con este presupuesto cuesta encontrar'}</h2>
      <p className="quieto chico" style={{ marginBottom: 10 }}>
        {alcanzan.length
          ? 'El arriendo típico para lo que buscas está dentro de tu presupuesto.'
          : justas.length
            ? 'El precio típico supera tu tope, pero en estas comunas hay avisos en el rango bajo que sí te alcanzan.'
            : 'Prueba con un dormitorio menos, otra zona o revisa tus gastos.'}
      </p>
      <div className="lista">
        {[...alcanzan, ...justas].map((x) => <FilaComuna key={x.comuna.nombre} x={x} r={r} tope={p.topeRecomendado} />)}
      </div>
      {fuera.length > 0 && (
        <button className="btn ancho" style={{ marginTop: 12 }} onClick={() => setVerFuera(!verFuera)} aria-expanded={verFuera}>
          {verFuera ? 'Ocultar' : `Ver ${fuera.length} comunas fuera de presupuesto`}
        </button>
      )}
      {verFuera && <div className="lista" style={{ marginTop: 12 }}>{fuera.map((x) => <FilaComuna key={x.comuna.nombre} x={x} r={r} tope={p.topeRecomendado} />)}</div>}

      {r.ninos > 0 && r.educacion !== 'particular' && (
        <>
          <h2>Colegios cerca</h2>
          <p className="quieto chico">Antes de decidir comuna, revisa colegios {r.educacion === 'publica' ? 'públicos' : 'subvencionados'} y sus vacantes en el buscador oficial del Mineduc.</p>
          <a className="btn ancho" style={{ marginTop: 10 }} href="https://www.mime.mineduc.cl/" target="_blank" rel="noopener noreferrer">Buscar colegios en Mineduc</a>
        </>
      )}

      <p className="quieto chico" style={{ marginTop: 22 }}>
        Arriendos estimados con el valor publicado por m² de cada comuna ({FUENTE.nombre}, <a href={FUENTE.url} target="_blank" rel="noopener noreferrer">ver fuente</a>, actualizado {fechaLarga(ACTUALIZADO)}) y una superficie típica según dormitorios. Son referencias: el precio real lo ves en los avisos.
      </p>

      <div className="form" style={{ marginTop: 18 }}>
        {sinCuenta && <Link to="/" className="btn primario ancho">Crear mi cuenta y guardar el resultado</Link>}
        <button className="btn ancho" onClick={repetir}>Repetir el test</button>
      </div>
    </div>
  );
}

function FilaComuna({ x, r, tope }: { x: ResultadoComuna; r: Respuestas; tope: number }) {
  const [abierta, setAbierta] = useState(false);
  const enlaces = enlacesBusqueda(x.comuna, r, tope);
  return (
    <div style={{ borderTop: '1px solid var(--linea)' }} className="comuna">
      <button className="fila" style={{ borderTop: 0 }} onClick={() => setAbierta(!abierta)} aria-expanded={abierta}>
        <span className="cuerpo">
          <span className="titulo">{x.comuna.nombre}</span>
          <span className="detalle" style={{ display: 'block' }}>Zona {x.comuna.zonaFuente.toLowerCase()}, típico {dinero(x.estimado)}</span>
        </span>
        <span className={`etiqueta ${x.alcance === 'alcanza' ? 'e-ok' : x.alcance === 'justo' ? 'e-alerta' : 'e-neutro'}`}>
          {x.alcance === 'alcanza' ? 'Te alcanza' : x.alcance === 'justo' ? 'Ajustado' : 'Fuera'}
        </span>
        <IFlecha width={18} style={{ color: 'var(--tinta-3)', transform: abierta ? 'rotate(90deg)' : undefined, transition: 'transform .2s' }} />
      </button>
      {abierta && (
        <div style={{ padding: '0 16px 16px', display: 'grid', gap: 10 }}>
          <p className="chico quieto">Rango habitual: {dinero(x.minimo)} a {dinero(x.maximo)}. Busca avisos hasta {dinero(tope)}:</p>
          <div className="acciones">
            {enlaces.map((e) => <a key={e.nombre} className="btn chico" href={e.url} target="_blank" rel="noopener noreferrer">{e.nombre}</a>)}
          </div>
        </div>
      )}
    </div>
  );
}
