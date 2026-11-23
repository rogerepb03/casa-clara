import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useHoy } from '../state/App';
import { Barrio } from '../components/Barrio';
import { Barra, Encabezado, GraficoMeses, Vacio } from '../components/Comunes';
import { IAlerta, IFlecha, IMas2 } from '../components/Iconos';
import { indicadores, proximosVencimientos, serieMensual } from '../lib/finanzas';
import { desafioDelMes, proximaMejorAccion, puntajeHogar, racha, saludPropiedad } from '../lib/juego';
import { dinero } from '../lib/formato';
import { aISO, cuandoVence } from '../lib/fechas';

export default function Inicio() {
  const { datos, usuario, membresia, puedeEditar } = useApp();
  const hoy = useHoy();
  const h = aISO(hoy);

  const saludes = useMemo(() => datos.propiedades.map((p) => saludPropiedad(p, datos, hoy)), [datos, hoy]);
  const puntaje = puntajeHogar(saludes);
  const r = useMemo(() => racha(datos, hoy), [datos, hoy]);
  const accion = useMemo(() => proximaMejorAccion(datos, hoy, saludes), [datos, hoy, saludes]);
  const desafio = useMemo(() => desafioDelMes(datos, hoy), [datos, hoy]);
  const ind = useMemo(() => indicadores(datos.movimientos, hoy), [datos.movimientos, hoy]);
  const serie = useMemo(() => serieMensual(datos.movimientos, hoy), [datos.movimientos, hoy]);
  const venc = useMemo(() => proximosVencimientos(datos, hoy).slice(0, 5), [datos, hoy]);

  const saludo = hoy.getHours() < 12 ? 'Buenos días' : hoy.getHours() < 20 ? 'Buenas tardes' : 'Buenas noches';
  const mes = hoy.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

  return (
    <>
      <Encabezado titulo={`${saludo}${usuario && usuario.nombre !== 'Tú' ? `, ${usuario.nombre.split(' ')[0]}` : ''}`} sub={`${membresia?.espacio.nombre ?? ''}, ${mes}`} />

      {datos.propiedades.length === 0 ? (
        <Vacio
          titulo="Tu barrio está vacío"
          texto="Agrega tu primera propiedad. Aparecerá como una casa, y sus ventanas se encienden cuando todo está al día."
          accion={puedeEditar && <Link className="btn primario" to="/propiedades?nueva=1"><IMas2 />Agregar propiedad</Link>}
        />
      ) : (
        <section className="barrio" aria-labelledby="t-hogar">
          <div className="cabeza">
            <div>
              <h2 id="t-hogar" className="sr">Puntaje del hogar</h2>
              <div className="puntaje num">{puntaje}<small> / 100</small></div>
              <p className="leyenda">
                {puntaje >= 90 ? 'Todo al día. El barrio brilla.' : puntaje >= 70 ? 'Vas bien. Quedan detalles por resolver.' : 'Hay pendientes que apagan ventanas.'}
              </p>
            </div>
            <Link to="/logros" className="racha" style={{ textDecoration: 'none' }}>
              <b className="num">{r.semanas}</b>
              {r.semanas === 1 ? 'semana' : 'semanas'} de racha
            </Link>
          </div>
          <Barrio propiedades={datos.propiedades} saludes={saludes} />
        </section>
      )}

      {accion && (
        <>
          <h2>Lo que más suma hoy</h2>
          <Link to={accion.ruta} className="panel accion">
            <span className="icono"><IAlerta /></span>
            <span>
              <span className="titulo">{accion.titulo}</span>
              <span className="quieto chico" style={{ display: 'block' }}>{accion.detalle}</span>
            </span>
            {accion.puntos > 0 && <span className="puntos num">+{accion.puntos} pts</span>}
          </Link>
        </>
      )}

      <h2>Este mes</h2>
      <div className="indicadores">
        <div className="panel indicador"><div className="etq">Por cobrar</div><div className="val">{dinero(ind.porCobrar)}</div></div>
        <div className="panel indicador"><div className="etq">Por pagar</div><div className="val">{dinero(ind.porPagar)}</div></div>
        <div className={`panel indicador${ind.atrasados ? ' malo' : ''}`}><div className="etq">Atrasados</div><div className="val">{ind.atrasados} {ind.atrasados === 1 ? 'pago' : 'pagos'}</div></div>
        <div className={`panel indicador${ind.saldoMes < 0 ? ' malo' : ''}`}><div className="etq">Saldo pagado</div><div className="val">{dinero(ind.saldoMes)}</div></div>
      </div>
      {ind.otrasMonedas.length > 0 && <p className="quieto chico" style={{ marginTop: 8 }}>Además hay pendientes en {ind.otrasMonedas.join(' y ')}; los ves en Finanzas.</p>}

      <div className="panel" style={{ padding: 16, marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <strong>Desafío: {desafio.titulo.toLowerCase()}</strong>
          <span className="quieto num">{Math.round(desafio.progreso * 100)}%</span>
        </div>
        <Barra valor={desafio.progreso} ok={desafio.progreso === 1} />
        <p className="quieto chico" style={{ marginTop: 8 }}>{desafio.texto}</p>
      </div>

      <h2>Próximos vencimientos</h2>
      {venc.length === 0 ? (
        <p className="quieto">Nada vence en los próximos días.</p>
      ) : (
        <div className="lista">
          {venc.map((v) => (
            <Link key={v.clave} to={v.ruta} className="fila">
              <span className="cuerpo">
                <span className="titulo">{v.titulo}</span>
                <span className="detalle" style={{ display: 'block' }}>{cuandoVence(v.fecha, h)}</span>
              </span>
              <span className={`etiqueta ${v.urgencia === 'atrasado' ? 'e-urgente' : v.urgencia === 'pronto' ? 'e-alerta' : 'e-neutro'}`}>
                {v.urgencia === 'atrasado' ? 'Atrasado' : v.urgencia === 'pronto' ? 'Pronto' : 'Programado'}
              </span>
              <IFlecha width={18} height={18} style={{ color: 'var(--tinta-3)' }} />
            </Link>
          ))}
        </div>
      )}

      <h2>Últimos 6 meses</h2>
      <GraficoMeses serie={serie} />

      {puedeEditar && (
        <Link to="/finanzas/nuevo" className="flotante" aria-label="Registrar movimiento"><IMas2 width={28} height={28} /></Link>
      )}
    </>
  );
}
