import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useHoy } from '../state/App';
import { api } from '../lib/data';
import { Campo, Encabezado, Hoja, Vacio } from '../components/Comunes';
import { ICheck, IHerramienta, IMas2 } from '../components/Iconos';
import { FilaDocumento, ListaSolicitudes } from './Propiedades';
import { estadoReal } from '../lib/finanzas';
import { dinero } from '../lib/formato';
import { aISO, cuandoVence, fechaLarga, nombreMes } from '../lib/fechas';
import type { Solicitud } from '../lib/types';

/** Portal del arrendatario: lo que necesita, nada más. La base de datos ya filtra lo que puede ver. */
export default function MiArriendo() {
  const { datos, usuario } = useApp();
  const hoy = useHoy();
  const h = aISO(hoy);
  const contrato = datos.contratos[0];
  const propiedad = contrato && datos.propiedades.find((p) => p.id === contrato.propiedad_id);
  const pendientes = datos.movimientos
    .filter((m) => { const e = estadoReal(m, h); return e === 'pendiente' || e === 'atrasado'; })
    .sort((a, b) => (a.fecha_vencimiento ?? '').localeCompare(b.fecha_vencimiento ?? ''));
  const proximo = pendientes[0];
  const alDia = datos.movimientos.filter((m) => m.estado === 'pagado').length;
  const docsContrato = datos.documentos.filter((d) => d.tipo === 'contrato');

  if (!contrato || !propiedad) {
    return (
      <>
        <Encabezado titulo="Mi arriendo" />
        <Vacio titulo="Aún no hay un contrato asociado" texto="Pídele a tu arrendador que registre el contrato con tu correo. Aparecerá aquí apenas lo haga." />
      </>
    );
  }

  const atrasado = proximo && estadoReal(proximo, h) === 'atrasado';

  return (
    <>
      <Encabezado titulo="Mi arriendo" sub={`Hola, ${usuario?.nombre.split(' ')[0] ?? ''}. ${propiedad.nombre}`} />

      <section className="barrio" style={{ paddingBottom: 20 }} aria-label="Próximo pago">
        {proximo ? (
          <>
            <p style={{ color: '#c9d3e6' }}>{atrasado ? 'Pago atrasado' : 'Próximo pago'}</p>
            <p className="puntaje num" style={{ fontSize: '2.6rem', marginTop: 6 }}>{dinero(proximo.monto, proximo.moneda)}</p>
            <p style={{ marginTop: 10, color: atrasado ? '#ffb4a6' : '#c9d3e6', fontWeight: 700 }}>
              {proximo.fecha_vencimiento ? `${cuandoVence(proximo.fecha_vencimiento, h)}, ${fechaLarga(proximo.fecha_vencimiento)}` : 'Pendiente'}
            </p>
            <p className="chico" style={{ marginTop: 12, color: '#c9d3e6' }}>Cuando pagues, tu arrendador lo marcará como recibido y verás aquí el cambio.</p>
          </>
        ) : (
          <>
            <p style={{ color: '#c9d3e6' }}>Estás al día</p>
            <p className="puntaje" style={{ fontSize: '2.2rem', marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}><ICheck width={34} height={34} style={{ color: 'var(--luz)' }} />Sin pagos pendientes</p>
            <p className="chico" style={{ marginTop: 10, color: '#c9d3e6' }}>Tu próximo arriendo vence el día {contrato.dia_pago} del mes.</p>
          </>
        )}
      </section>

      <dl className="panel datos" style={{ marginTop: 12 }}>
        <dt>Arriendo mensual</dt><dd>{dinero(contrato.monto_arriendo, contrato.moneda)}</dd>
        <dt>Día de pago</dt><dd>Día {contrato.dia_pago}</dd>
        <dt>Contrato desde</dt><dd>{fechaLarga(contrato.fecha_inicio)}</dd>
        {contrato.fecha_termino && <><dt>Hasta</dt><dd>{fechaLarga(contrato.fecha_termino)}</dd></>}
        <dt>Pagos registrados</dt><dd>{alDia}</dd>
      </dl>

      {docsContrato.length > 0 && (
        <>
          <h2>Tu contrato</h2>
          <div className="lista">{docsContrato.map((d) => <FilaDocumento key={d.id} id={d.id} />)}</div>
        </>
      )}

      <h2>¿Algo no funciona?</h2>
      <Link to="/solicitudes?nueva=1" className="panel accion">
        <span className="icono" style={{ background: 'var(--puerto-suave)', color: 'var(--puerto)' }}><IHerramienta /></span>
        <span><span className="titulo">Avisar un problema</span><span className="quieto chico" style={{ display: 'block' }}>Una filtración, algo roto o una mantención pendiente</span></span>
      </Link>
    </>
  );
}

export function PagosArrendatario() {
  const { datos } = useApp();
  const hoy = useHoy();
  const h = aISO(hoy);
  const lista = useMemo(() => [...datos.movimientos].sort((a, b) => (b.fecha_vencimiento ?? b.fecha).localeCompare(a.fecha_vencimiento ?? a.fecha)), [datos.movimientos]);
  return (
    <>
      <Encabezado titulo="Pagos" sub="Historial de tu arriendo" />
      {lista.length === 0 ? <p className="quieto">Todavía no hay cobros registrados.</p> : (
        <div className="lista">
          {lista.map((m) => {
            const e = estadoReal(m, h);
            const mes = (m.fecha_vencimiento ?? m.fecha).slice(0, 7);
            return (
              <div key={m.id} className="fila">
                <span className="cuerpo">
                  <span className="titulo" style={{ textTransform: 'capitalize' }}>{nombreMes(mes)} {mes.slice(0, 4)}</span>
                  <span className="detalle" style={{ display: 'block' }}>{e === 'pagado' ? `Pagado${m.medio_pago ? ` por ${m.medio_pago}` : ''}` : m.fecha_vencimiento ? cuandoVence(m.fecha_vencimiento, h) : 'Pendiente'}</span>
                </span>
                <span style={{ display: 'grid', justifyItems: 'end', gap: 4 }}>
                  <span className="monto">{dinero(m.monto, m.moneda)}</span>
                  <span className={`etiqueta ${e === 'pagado' ? 'e-ok' : e === 'atrasado' ? 'e-urgente' : 'e-alerta'}`}>{e === 'pagado' ? 'Pagado' : e === 'atrasado' ? 'Atrasado' : 'Pendiente'}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export function SolicitudesArrendatario() {
  const { datos, membresia, recargar, aviso } = useApp();
  const [abierta, setAbierta] = useState(() => new URLSearchParams(location.hash.split('?')[1]).get('nueva') === '1');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [urgente, setUrgente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const propiedad = datos.propiedades[0];

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!membresia || !propiedad) return;
    setError(null);
    try {
      await api.crear<Solicitud>('solicitudes', {
        espacio_id: membresia.espacio.id, propiedad_id: propiedad.id, titulo: titulo.trim(), descripcion: descripcion.trim() || null,
        es_mantencion: false, estado: 'abierta', prioridad: urgente ? 1 : 2, fecha_programada: null,
      });
      await recargar();
      aviso('Aviso enviado a tu arrendador');
      setTitulo(''); setDescripcion(''); setUrgente(false);
      setAbierta(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar.');
    }
  }

  return (
    <>
      <Encabezado titulo="Solicitudes" sub="Tus avisos y su estado"
        accion={propiedad && <button className="btn-icono" aria-label="Avisar un problema" onClick={() => setAbierta(true)}><IMas2 /></button>} />
      <ListaSolicitudes solicitudes={datos.solicitudes} editable={false} />
      {propiedad && <button className="btn primario ancho" style={{ marginTop: 14 }} onClick={() => setAbierta(true)}>Avisar un problema</button>}
      <Hoja titulo="Avisar un problema" abierta={abierta} cerrar={() => setAbierta(false)}>
        <form className="form" onSubmit={enviar}>
          <Campo etiqueta="¿Qué pasa?" ayuda="Por ejemplo: no sale agua caliente"><input value={titulo} onChange={(e) => setTitulo(e.target.value)} required /></Campo>
          <Campo etiqueta="Detalles" ayuda="Desde cuándo, dónde, horarios en que pueden visitar"><textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></Campo>
          <label className="check"><input type="checkbox" checked={urgente} onChange={(e) => setUrgente(e.target.checked)} />Es urgente (filtración, sin luz, sin agua)</label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn primario ancho">Enviar aviso</button>
        </form>
      </Hoja>
    </>
  );
}
