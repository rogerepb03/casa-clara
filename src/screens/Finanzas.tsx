import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp, useHoy } from '../state/App';
import { api } from '../lib/data';
import { Campo, Encabezado, Hoja, Vacio } from '../components/Comunes';
import { ICamara, IMas2 } from '../components/Iconos';
import { estadoReal } from '../lib/finanzas';
import { dinero, leerMonto } from '../lib/formato';
import { aISO, claveMes, cuandoVence, fechaCorta, fechaLarga, nombreMes } from '../lib/fechas';
import type { EstadoPago, Moneda, Movimiento, TipoMovimiento } from '../lib/types';

type Filtro = 'todos' | 'pendientes' | 'atrasado' | 'ingreso' | 'gasto';
const FILTROS: [Filtro, string][] = [['todos', 'Todos'], ['pendientes', 'Por pagar o cobrar'], ['atrasado', 'Atrasados'], ['ingreso', 'Ingresos'], ['gasto', 'Gastos']];

export default function Finanzas() {
  const { datos, puedeEditar } = useApp();
  const hoy = useHoy();
  const h = aISO(hoy);
  const [params, setParams] = useSearchParams();
  const filtro = (params.get('estado') as Filtro) || 'todos';
  const movId = params.get('mov');
  const [propiedad, setPropiedad] = useState('');

  const lista = useMemo(() => {
    return datos.movimientos
      .filter((m) => {
        const est = estadoReal(m, h);
        if (propiedad && m.propiedad_id !== propiedad) return false;
        if (filtro === 'pendientes') return est === 'pendiente' || est === 'atrasado';
        if (filtro === 'atrasado') return est === 'atrasado';
        if (filtro === 'ingreso' || filtro === 'gasto') return m.tipo === filtro;
        return est !== 'anulado';
      })
      .sort((a, b) => (b.fecha_vencimiento ?? b.fecha).localeCompare(a.fecha_vencimiento ?? a.fecha));
  }, [datos.movimientos, filtro, propiedad, h]);

  const grupos = useMemo(() => {
    const g = new Map<string, Movimiento[]>();
    for (const m of lista) {
      const k = claveMes(m.fecha_vencimiento ?? m.fecha);
      g.set(k, [...(g.get(k) ?? []), m]);
    }
    return [...g.entries()];
  }, [lista]);

  const seleccionado = movId ? datos.movimientos.find((m) => m.id === movId) : undefined;

  return (
    <>
      <Encabezado titulo="Finanzas" sub="Ingresos, gastos, arriendos y cuentas"
        accion={puedeEditar && <Link className="btn-icono" to="/finanzas/nuevo" aria-label="Registrar movimiento"><IMas2 /></Link>} />

      <div className="filtros" role="group" aria-label="Filtrar movimientos">
        {FILTROS.map(([v, t]) => (
          <button key={v} aria-pressed={filtro === v} onClick={() => setParams(v === 'todos' ? {} : { estado: v })}>{t}</button>
        ))}
      </div>
      {datos.propiedades.length > 1 && (
        <Campo etiqueta="Propiedad">
          <select value={propiedad} onChange={(e) => setPropiedad(e.target.value)}>
            <option value="">Todas, incluida la familia</option>
            {datos.propiedades.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Campo>
      )}

      {lista.length === 0 ? (
        <div style={{ marginTop: 16 }}>
          {datos.movimientos.length === 0 ? (
            <Vacio titulo="Sin movimientos" texto="Registra un gasto o un ingreso. Los arriendos de contratos vigentes se crean solos cada mes."
              accion={puedeEditar && <Link className="btn primario" to="/finanzas/nuevo">Registrar movimiento</Link>} />
          ) : (
            <Vacio titulo="Nada con este filtro" texto={filtro === 'atrasado' ? 'No hay pagos atrasados. Bien hecho.' : 'Prueba con otro filtro o propiedad.'}
              accion={<button className="btn" onClick={() => { setParams({}); setPropiedad(''); }}>Ver todos</button>} />
          )}
        </div>
      ) : (
        grupos.map(([mes, movs]) => {
          const ing = movs.filter((m) => m.tipo === 'ingreso' && m.moneda === 'CLP' && m.estado === 'pagado').reduce((s, m) => s + m.monto, 0);
          const gas = movs.filter((m) => m.tipo === 'gasto' && m.moneda === 'CLP' && m.estado === 'pagado').reduce((s, m) => s + m.monto, 0);
          return (
            <section key={mes}>
              <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ textTransform: 'capitalize' }}>{nombreMes(mes)} {mes.slice(0, 4)}</span>
                <span className="chico quieto num" style={{ fontFamily: 'var(--f-texto)', fontWeight: 400 }}>+{dinero(ing)} / −{dinero(gas)}</span>
              </h2>
              <div className="lista">
                {movs.map((m) => <FilaMovimiento key={m.id} m={m} hoy={h} />)}
              </div>
            </section>
          );
        })
      )}

      <DetalleMovimiento m={seleccionado} cerrar={() => { const p = new URLSearchParams(params); p.delete('mov'); setParams(p); }} />
      {puedeEditar && <Link to="/finanzas/nuevo" className="flotante" aria-label="Registrar movimiento"><IMas2 width={28} height={28} /></Link>}
    </>
  );
}

function FilaMovimiento({ m, hoy }: { m: Movimiento; hoy: string }) {
  const { datos } = useApp();
  const [params, setParams] = useSearchParams();
  const est = estadoReal(m, hoy);
  const cat = datos.categorias.find((c) => c.id === m.categoria_id)?.nombre;
  const prop = datos.propiedades.find((p) => p.id === m.propiedad_id)?.nombre;
  const detalle = est === 'pagado'
    ? [fechaCorta(m.fecha), cat, prop].filter(Boolean).join(', ')
    : `${m.fecha_vencimiento ? cuandoVence(m.fecha_vencimiento, hoy) : 'pendiente'}${prop ? `, ${prop}` : ''}`;
  return (
    <button className="fila" onClick={() => { const p = new URLSearchParams(params); p.set('mov', m.id); setParams(p); }}>
      <span className="cuerpo">
        <span className="titulo">{m.descripcion}</span>
        <span className="detalle" style={{ display: 'block' }}>{detalle}</span>
      </span>
      <span style={{ display: 'grid', justifyItems: 'end', gap: 4 }}>
        <span className={`monto ${m.tipo}`}>{m.tipo === 'gasto' ? '−' : '+'}{dinero(m.monto, m.moneda)}</span>
        {est !== 'pagado' && <span className={`etiqueta ${est === 'atrasado' ? 'e-urgente' : 'e-alerta'}`}>{est === 'atrasado' ? 'Atrasado' : 'Pendiente'}</span>}
      </span>
    </button>
  );
}

function DetalleMovimiento({ m, cerrar }: { m?: Movimiento; cerrar: () => void }) {
  const { datos, puedeEditar, recargar, aviso } = useApp();
  const [medio, setMedio] = useState('transferencia');
  const [ocupado, setOcupado] = useState(false);
  const h = aISO(new Date());
  if (!m) return <Hoja titulo="" abierta={false} cerrar={cerrar}>{null}</Hoja>;
  const est = estadoReal(m, h);
  const cat = datos.categorias.find((c) => c.id === m.categoria_id)?.nombre;
  const prop = datos.propiedades.find((p) => p.id === m.propiedad_id);
  const persona = datos.personas.find((p) => p.id === m.persona_id);

  async function pagar() {
    if (!m) return;
    setOcupado(true);
    try {
      await api.marcarPagado(m.id, medio);
      await recargar();
      aviso(m.tipo === 'ingreso' ? 'Cobro registrado como pagado' : 'Pago registrado');
      cerrar();
    } catch (err) {
      aviso(err instanceof Error ? err.message : 'No se pudo registrar');
    } finally {
      setOcupado(false);
    }
  }

  async function borrar() {
    if (!m) return;
    setOcupado(true);
    try {
      await api.borrar('movimientos', m.id);
      await recargar();
      aviso('Movimiento eliminado');
      cerrar();
    } catch (err) {
      aviso(err instanceof Error ? err.message : 'No se pudo eliminar');
    } finally {
      setOcupado(false);
    }
  }

  async function verComprobante() {
    if (!m?.comprobante) return;
    window.open(await api.urlArchivo(m.comprobante), '_blank', 'noopener');
  }

  return (
    <Hoja titulo={m.descripcion} abierta cerrar={cerrar}>
      <p className="num" style={{ fontFamily: 'var(--f-titulo)', fontSize: '2rem', fontWeight: 700, color: m.tipo === 'ingreso' ? 'var(--ok)' : undefined }}>
        {m.tipo === 'gasto' ? '−' : '+'}{dinero(m.monto, m.moneda)}
      </p>
      <dl className="panel datos" style={{ marginTop: 12 }}>
        <dt>Estado</dt><dd>{{ pagado: 'Pagado', pendiente: 'Pendiente', atrasado: 'Atrasado', anulado: 'Anulado' }[est]}</dd>
        {m.fecha_vencimiento && <><dt>Vence</dt><dd>{fechaLarga(m.fecha_vencimiento)}</dd></>}
        <dt>Fecha</dt><dd>{fechaLarga(m.fecha)}</dd>
        {cat && <><dt>Categoría</dt><dd>{cat}</dd></>}
        {prop && <><dt>Propiedad</dt><dd>{prop.nombre}</dd></>}
        {persona && <><dt>Persona</dt><dd>{persona.nombre}</dd></>}
        {m.medio_pago && est === 'pagado' && <><dt>Medio</dt><dd style={{ textTransform: 'capitalize' }}>{m.medio_pago}</dd></>}
      </dl>
      {m.comprobante && <button className="btn ancho" style={{ marginTop: 12 }} onClick={verComprobante}>Ver comprobante</button>}
      {puedeEditar && (est === 'pendiente' || est === 'atrasado') && (
        <div className="form" style={{ marginTop: 16 }}>
          <Campo etiqueta="Medio de pago">
            <select value={medio} onChange={(e) => setMedio(e.target.value)}>
              <option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option><option value="cheque">Cheque</option>
            </select>
          </Campo>
          <button className="btn primario ancho" onClick={pagar} disabled={ocupado}>{m.tipo === 'ingreso' ? 'Marcar como cobrado' : 'Marcar como pagado'}</button>
        </div>
      )}
      {puedeEditar && <button className="btn peligro ancho" style={{ marginTop: 12 }} onClick={borrar} disabled={ocupado}>Eliminar movimiento</button>}
    </Hoja>
  );
}

export function NuevoMovimiento() {
  const { datos, membresia, recargar, aviso } = useApp();
  const hoy = useHoy();
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const [tipo, setTipo] = useState<TipoMovimiento>('gasto');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState<Moneda>('CLP');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('');
  const [propiedad, setPropiedad] = useState(params.get('propiedad') ?? '');
  const [fecha, setFecha] = useState(aISO(hoy));
  const [estado, setEstado] = useState<EstadoPago>('pagado');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const categorias = datos.categorias.filter((c) => c.tipo === tipo);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const n = leerMonto(monto);
    if (!membresia) return;
    if (!n) { setError('Escribe un monto mayor a cero.'); return; }
    setEnviando(true);
    setError(null);
    try {
      const comprobante = archivo ? await api.subirArchivo(membresia.espacio.id, 'comprobantes', archivo) : null;
      const cat = datos.categorias.find((c) => c.id === categoria);
      await api.crear<Movimiento>('movimientos', {
        espacio_id: membresia.espacio.id, tipo, monto: n, moneda,
        descripcion: descripcion.trim() || cat?.nombre || (tipo === 'gasto' ? 'Gasto' : 'Ingreso'),
        categoria_id: categoria || null, propiedad_id: propiedad || null, fecha,
        fecha_vencimiento: estado === 'pendiente' ? fecha : null, estado,
        pagado_en: estado === 'pagado' ? new Date().toISOString() : null, comprobante,
      });
      await recargar();
      aviso(tipo === 'gasto' ? 'Gasto registrado' : 'Ingreso registrado');
      navegar(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
      setEnviando(false);
    }
  }

  return (
    <>
      <Encabezado titulo="Nuevo movimiento" volver />
      <form className="form" onSubmit={guardar}>
        <div className="segmentos" role="group" aria-label="Tipo de movimiento">
          <button type="button" aria-pressed={tipo === 'gasto'} onClick={() => { setTipo('gasto'); setCategoria(''); }}>Gasto</button>
          <button type="button" aria-pressed={tipo === 'ingreso'} onClick={() => { setTipo('ingreso'); setCategoria(''); }}>Ingreso</button>
        </div>
        <div className="dos" style={{ gridTemplateColumns: '1fr 110px', alignItems: 'end' }}>
          <Campo etiqueta="Monto">
            <span className="monto-grande" style={{ display: 'block' }}>
              <input value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="decimal" placeholder="0" required autoFocus />
            </span>
          </Campo>
          <Campo etiqueta="Moneda">
            <select value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)} style={{ minHeight: 64 }}><option>CLP</option><option>UF</option><option>USD</option></select>
          </Campo>
        </div>
        <Campo etiqueta="Categoría">
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Sin categoría</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Descripción" ayuda="Opcional. Si la dejas vacía usamos la categoría.">
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </Campo>
        <Campo etiqueta="Propiedad" ayuda="Déjala vacía si es un gasto de la familia.">
          <select value={propiedad} onChange={(e) => setPropiedad(e.target.value)}>
            <option value="">Ninguna (familia)</option>
            {datos.propiedades.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Campo>
        <div className="dos">
          <Campo etiqueta={estado === 'pendiente' ? 'Vence el' : 'Fecha'}><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required /></Campo>
          <Campo etiqueta="Estado">
            <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoPago)}><option value="pagado">Pagado</option><option value="pendiente">Pendiente</option></select>
          </Campo>
        </div>
        <label className="btn ancho" style={{ borderStyle: 'dashed' }}>
          <ICamara width={20} height={20} />{archivo ? archivo.name : 'Adjuntar foto de boleta'}
          <input type="file" accept="image/*,application/pdf" capture="environment" className="sr" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primario ancho" disabled={enviando}>{enviando ? 'Guardando…' : tipo === 'gasto' ? 'Guardar gasto' : 'Guardar ingreso'}</button>
      </form>
    </>
  );
}
