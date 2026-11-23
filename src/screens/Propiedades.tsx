import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp, useHoy } from '../state/App';
import { api } from '../lib/data';
import { Campo, Encabezado, Hoja, Vacio } from '../components/Comunes';
import { CasaMini } from '../components/Barrio';
import { ICamara, IMas2 } from '../components/Iconos';
import { saludPropiedad, type Salud } from '../lib/juego';
import { estadoReal, resultadoPropiedad } from '../lib/finanzas';
import { dinero, ETIQUETA_DOCUMENTO, ETIQUETA_ESTADO_PROPIEDAD, ETIQUETA_SOLICITUD, ETIQUETA_TIPO_PERSONA, ETIQUETA_TIPO_PROPIEDAD, leerMonto } from '../lib/formato';
import { aISO, claveMes, fechaCorta, fechaLarga } from '../lib/fechas';
import type { EstadoPropiedad, Moneda, Propiedad, RolEnPropiedad, Solicitud, TipoPropiedad } from '../lib/types';

function claseSalud(s?: Salud) {
  if (!s) return 'e-neutro';
  return s.nivel === 'excelente' || s.nivel === 'bien' ? 'e-ok' : s.nivel === 'atencion' ? 'e-alerta' : 'e-urgente';
}

export default function Propiedades() {
  const { datos, puedeEditar } = useApp();
  const hoy = useHoy();
  const [params, setParams] = useSearchParams();
  const saludes = useMemo(() => datos.propiedades.map((p) => saludPropiedad(p, datos, hoy)), [datos, hoy]);
  const mes = claveMes(aISO(hoy));
  const abierta = params.get('nueva') === '1';

  return (
    <>
      <Encabezado
        titulo="Propiedades"
        sub={`${datos.propiedades.length} en total`}
        accion={puedeEditar && <button className="btn-icono" aria-label="Agregar propiedad" onClick={() => setParams({ nueva: '1' })}><IMas2 /></button>}
      />
      {datos.propiedades.length === 0 ? (
        <Vacio titulo="Aún no hay propiedades" texto="Agrega la primera con su nombre y dirección. Luego podrás sumar fotos, contratos y personas."
          accion={puedeEditar && <button className="btn primario" onClick={() => setParams({ nueva: '1' })}>Agregar propiedad</button>} />
      ) : (
        <div className="lista">
          {datos.propiedades.map((p, i) => {
            const s = saludes.find((x) => x.propiedadId === p.id);
            const r = resultadoPropiedad(datos.movimientos, p.id, mes);
            return (
              <Link key={p.id} to={`/propiedades/${p.id}`} className="prop fila">
                <span className="miniatura"><Portadita p={p} ventanas={s?.ventanas ?? 0} color={i} /></span>
                <span className="cuerpo">
                  <span className="nombre" style={{ display: 'block' }}>{p.nombre}</span>
                  <span className="quieto chico" style={{ display: 'block' }}>{ETIQUETA_TIPO_PROPIEDAD[p.tipo]}, {ETIQUETA_ESTADO_PROPIEDAD[p.estado].toLowerCase()}</span>
                  <span style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className={`etiqueta ${claseSalud(s)}`}>Salud {s?.puntaje ?? 0}</span>
                    {(r.ingresos > 0 || r.gastos > 0) && <span className="chico num quieto">Mes: {dinero(r.resultado)}</span>}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
      <FormPropiedad abierta={abierta} cerrar={() => setParams({})} />
    </>
  );
}

function Portadita({ p, ventanas, color }: { p: Propiedad; ventanas: number; color: number }) {
  const url = useUrl(p.foto_portada);
  return url ? <img src={url} alt="" /> : <CasaMini ventanas={ventanas} color={color} />;
}

export function useUrl(ruta: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    if (!ruta) { setUrl(null); return; }
    api.urlArchivo(ruta).then((u) => vivo && setUrl(u)).catch(() => vivo && setUrl(null));
    return () => { vivo = false; };
  }, [ruta]);
  return url;
}

function FormPropiedad({ abierta, cerrar, editar }: { abierta: boolean; cerrar: () => void; editar?: Propiedad }) {
  const { membresia, recargar, aviso } = useApp();
  const navegar = useNavigate();
  const [f, setF] = useState({ nombre: '', direccion: '', comuna: '', tipo: 'departamento' as TipoPropiedad, estado: 'arrendada' as EstadoPropiedad, valor: '', moneda_valor: 'UF' as Moneda });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (abierta && editar) {
      setF({ nombre: editar.nombre, direccion: editar.direccion ?? '', comuna: editar.comuna ?? '', tipo: editar.tipo, estado: editar.estado, valor: editar.valor?.toLocaleString('es-CL') ?? '', moneda_valor: editar.moneda_valor });
    }
  }, [abierta, editar]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!membresia) return;
    setEnviando(true);
    setError(null);
    const fila = { ...f, direccion: f.direccion || null, comuna: f.comuna || null, valor: leerMonto(f.valor) };
    try {
      if (editar) {
        await api.editar<Propiedad>('propiedades', editar.id, fila);
        aviso('Propiedad guardada');
      } else {
        const nueva = await api.crear<Propiedad>('propiedades', { ...fila, espacio_id: membresia.espacio.id, foto_portada: null, notas: null });
        aviso('Propiedad agregada');
        navegar(`/propiedades/${nueva.id}`);
      }
      await recargar();
      cerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setEnviando(false);
    }
  }

  const cambiar = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <Hoja titulo={editar ? 'Editar propiedad' : 'Nueva propiedad'} abierta={abierta} cerrar={cerrar}>
      <form className="form" onSubmit={guardar}>
        <Campo etiqueta="Nombre" ayuda="Cómo la llaman en la familia, por ejemplo: Depto Ñuñoa">
          <input value={f.nombre} onChange={cambiar('nombre')} required />
        </Campo>
        <Campo etiqueta="Dirección"><input value={f.direccion} onChange={cambiar('direccion')} autoComplete="street-address" /></Campo>
        <Campo etiqueta="Comuna"><input value={f.comuna} onChange={cambiar('comuna')} /></Campo>
        <div className="dos">
          <Campo etiqueta="Tipo">
            <select value={f.tipo} onChange={cambiar('tipo')}>
              {Object.entries(ETIQUETA_TIPO_PROPIEDAD).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Estado">
            <select value={f.estado} onChange={cambiar('estado')}>
              {Object.entries(ETIQUETA_ESTADO_PROPIEDAD).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </Campo>
        </div>
        <div className="dos">
          <Campo etiqueta="Valor"><input value={f.valor} onChange={cambiar('valor')} inputMode="decimal" /></Campo>
          <Campo etiqueta="Moneda">
            <select value={f.moneda_valor} onChange={cambiar('moneda_valor')}><option>UF</option><option>CLP</option><option>USD</option></select>
          </Campo>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primario ancho" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar propiedad'}</button>
      </form>
    </Hoja>
  );
}

type Pestana = 'resumen' | 'personas' | 'finanzas' | 'documentos' | 'solicitudes';

export function DetallePropiedad() {
  const { id } = useParams();
  const { datos, puedeEditar, membresia, recargar, aviso } = useApp();
  const hoy = useHoy();
  const [pestana, setPestana] = useState<Pestana>('resumen');
  const [editando, setEditando] = useState(false);
  const [asociando, setAsociando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const p = datos.propiedades.find((x) => x.id === id);
  const portada = useUrl(p?.foto_portada ?? null);

  if (!p) return <><Encabezado titulo="Propiedad" volver="/propiedades" /><Vacio titulo="No encontramos esta propiedad" texto="Puede que se haya eliminado o que tu rol no tenga acceso." /></>;

  const s = saludPropiedad(p, datos, hoy);
  const h = aISO(hoy);
  const mes = claveMes(h);
  const r = resultadoPropiedad(datos.movimientos, p.id, mes);
  const contrato = datos.contratos.find((c) => c.propiedad_id === p.id && c.estado === 'vigente');
  const personas = datos.propiedad_personas.filter((pp) => pp.propiedad_id === p.id).map((pp) => ({ pp, persona: datos.personas.find((x) => x.id === pp.persona_id) }));
  const movs = datos.movimientos.filter((m) => m.propiedad_id === p.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const docs = datos.documentos.filter((d) => d.propiedad_id === p.id);
  const sols = datos.solicitudes.filter((x) => x.propiedad_id === p.id);
  const arrendatario = contrato && datos.personas.find((x) => x.id === contrato.arrendatario_id);

  async function subirPortada(file: File) {
    if (!membresia || !p) return;
    setSubiendo(true);
    try {
      const ruta = await api.subirArchivo(membresia.espacio.id, `propiedades/${p.id}`, file);
      await api.editar<Propiedad>('propiedades', p.id, { foto_portada: ruta });
      await recargar();
      aviso('Foto actualizada');
    } catch (err) {
      aviso(err instanceof Error ? err.message : 'No se pudo subir la foto');
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <>
      <Encabezado titulo={p.nombre} sub={[p.direccion, p.comuna].filter(Boolean).join(', ') || ETIQUETA_TIPO_PROPIEDAD[p.tipo]} volver="/propiedades"
        accion={puedeEditar && <button className="btn chico" onClick={() => setEditando(true)}>Editar</button>} />

      <div className="portada">
        {portada ? <img src={portada} alt={`Foto de ${p.nombre}`} /> : <CasaMini ventanas={s.ventanas} color={datos.propiedades.indexOf(p)} />}
        {puedeEditar && (
          <label className="btn chico subir">
            <ICamara width={18} height={18} />{subiendo ? 'Subiendo…' : portada ? 'Cambiar foto' : 'Agregar foto'}
            <input type="file" accept="image/*" className="sr" onChange={(e) => e.target.files?.[0] && subirPortada(e.target.files[0])} />
          </label>
        )}
      </div>

      <div className="pestanas" role="tablist">
        {(['resumen', 'personas', 'finanzas', 'documentos', 'solicitudes'] as Pestana[]).map((t) => (
          <button key={t} role="tab" aria-selected={pestana === t} onClick={() => setPestana(t)}>
            {{ resumen: 'Resumen', personas: 'Personas', finanzas: 'Pagos', documentos: 'Docs', solicitudes: 'Avisos' }[t]}
          </button>
        ))}
      </div>

      {pestana === 'resumen' && (
        <>
          <div className="panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 4px' }}>
              <strong>Salud de la propiedad</strong>
              <span className={`etiqueta ${claseSalud(s)}`}>{s.puntaje} de 100</span>
            </div>
            {s.motivos.length === 0 ? (
              <p className="quieto" style={{ padding: '6px 16px 16px' }}>Todo en orden. Las 4 ventanas están encendidas.</p>
            ) : (
              <div style={{ paddingTop: 6 }}>
                {s.motivos.map((m) => (
                  <Link key={m.texto} to={m.ruta} className="motivo">
                    <span className="pts num">{m.puntos}</span>
                    <span><strong>{m.texto}</strong><span className="quieto chico" style={{ display: 'block' }}>{m.accion}</span></span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <dl className="panel datos" style={{ marginTop: 10 }}>
            <dt>Estado</dt><dd>{ETIQUETA_ESTADO_PROPIEDAD[p.estado]}</dd>
            <dt>Valor</dt><dd>{p.valor != null ? dinero(p.valor, p.moneda_valor) : '—'}</dd>
            {contrato && <><dt>Arriendo</dt><dd>{dinero(contrato.monto_arriendo, contrato.moneda)}, día {contrato.dia_pago}</dd></>}
            {arrendatario && <><dt>Arrendatario</dt><dd>{arrendatario.nombre}</dd></>}
            {contrato?.fecha_termino && <><dt>Contrato hasta</dt><dd>{fechaLarga(contrato.fecha_termino)}</dd></>}
            <dt>Resultado del mes</dt><dd style={{ color: r.resultado < 0 ? 'var(--urgente)' : undefined }}>{dinero(r.resultado)}</dd>
          </dl>
          {puedeEditar && !contrato && <ContratoNuevo propiedadId={p.id} />}
        </>
      )}

      {pestana === 'personas' && (
        <>
          {personas.length === 0 ? <p className="quieto">Nadie asociado todavía.</p> : (
            <div className="lista">
              {personas.map(({ pp, persona }) => (
                <div key={pp.id} className="fila">
                  <span className="cuerpo">
                    <span className="titulo">{persona?.nombre ?? 'Persona'}</span>
                    <span className="detalle" style={{ display: 'block' }}>{rolEnPropiedad(pp.rol)}{pp.porcentaje ? `, ${pp.porcentaje}%` : ''}{persona?.telefono ? `, ${persona.telefono}` : ''}</span>
                  </span>
                  {persona?.telefono && <a className="btn chico" href={`tel:${persona.telefono.replace(/\s/g, '')}`}>Llamar</a>}
                </div>
              ))}
            </div>
          )}
          {puedeEditar && <button className="btn ancho" style={{ marginTop: 12 }} onClick={() => setAsociando(true)}><IMas2 />Asociar persona</button>}
        </>
      )}

      {pestana === 'finanzas' && (
        <>
          {movs.length === 0 ? <p className="quieto">Sin movimientos para esta propiedad.</p> : (
            <div className="lista">
              {movs.slice(0, 30).map((m) => {
                const est = estadoReal(m, h);
                return (
                  <Link key={m.id} to={`/finanzas?mov=${m.id}`} className="fila">
                    <span className="cuerpo"><span className="titulo">{m.descripcion}</span><span className="detalle" style={{ display: 'block' }}>{fechaCorta(m.fecha)}{est !== 'pagado' ? `, ${est}` : ''}</span></span>
                    <span className={`monto ${m.tipo}`}>{m.tipo === 'gasto' ? '−' : ''}{dinero(m.monto, m.moneda)}</span>
                  </Link>
                );
              })}
            </div>
          )}
          {puedeEditar && <Link className="btn ancho" style={{ marginTop: 12 }} to={`/finanzas/nuevo?propiedad=${p.id}`}><IMas2 />Registrar movimiento</Link>}
        </>
      )}

      {pestana === 'documentos' && (
        <>
          {docs.length === 0 ? <p className="quieto">Sin documentos. Sube la escritura o el contrato para no perderlos.</p> : (
            <div className="lista">{docs.map((d) => <FilaDocumento key={d.id} id={d.id} />)}</div>
          )}
          {puedeEditar && <Link className="btn ancho" style={{ marginTop: 12 }} to={`/documentos?subir=1&propiedad=${p.id}`}><IMas2 />Subir documento</Link>}
        </>
      )}

      {pestana === 'solicitudes' && <ListaSolicitudes solicitudes={sols} editable={puedeEditar} />}

      <FormPropiedad abierta={editando} cerrar={() => setEditando(false)} editar={p} />
      <AsociarPersona abierta={asociando} cerrar={() => setAsociando(false)} propiedadId={p.id} />
    </>
  );
}

function rolEnPropiedad(r: RolEnPropiedad) {
  return { propietario: 'Propietario', arrendatario: 'Arrendatario', administrador: 'Administra', residente: 'Residente', contacto_emergencia: 'Contacto de emergencia' }[r];
}

function AsociarPersona({ abierta, cerrar, propiedadId }: { abierta: boolean; cerrar: () => void; propiedadId: string }) {
  const { datos, membresia, recargar, aviso } = useApp();
  const [personaId, setPersonaId] = useState('');
  const [rol, setRol] = useState<RolEnPropiedad>('arrendatario');
  const [error, setError] = useState<string | null>(null);
  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!membresia || !personaId) return;
    try {
      await api.crear('propiedad_personas', { espacio_id: membresia.espacio.id, propiedad_id: propiedadId, persona_id: personaId, rol, porcentaje: null });
      await recargar();
      aviso('Persona asociada');
      cerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo asociar.');
    }
  }
  return (
    <Hoja titulo="Asociar persona" abierta={abierta} cerrar={cerrar}>
      {datos.personas.length === 0 ? (
        <p className="quieto">Primero agrega personas en Más, Personas.</p>
      ) : (
        <form className="form" onSubmit={guardar}>
          <Campo etiqueta="Persona">
            <select value={personaId} onChange={(e) => setPersonaId(e.target.value)} required>
              <option value="">Elige una persona</option>
              {datos.personas.map((x) => <option key={x.id} value={x.id}>{x.nombre} ({ETIQUETA_TIPO_PERSONA[x.tipo].toLowerCase()})</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Rol en esta propiedad">
            <select value={rol} onChange={(e) => setRol(e.target.value as RolEnPropiedad)}>
              <option value="propietario">Propietario</option><option value="arrendatario">Arrendatario</option>
              <option value="residente">Residente</option><option value="administrador">Administra</option>
              <option value="contacto_emergencia">Contacto de emergencia</option>
            </select>
          </Campo>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn primario ancho">Asociar</button>
        </form>
      )}
    </Hoja>
  );
}

function ContratoNuevo({ propiedadId }: { propiedadId: string }) {
  const { datos, membresia, recargar, aviso } = useApp();
  const [abierta, setAbierta] = useState(false);
  const [f, setF] = useState({ arrendatario_id: '', fecha_inicio: aISO(new Date()), fecha_termino: '', monto: '', moneda: 'CLP' as Moneda, dia_pago: '5' });
  const [error, setError] = useState<string | null>(null);
  const candidatos = datos.personas.filter((x) => x.tipo === 'arrendatario');
  async function guardar(e: FormEvent) {
    e.preventDefault();
    const monto = leerMonto(f.monto);
    if (!membresia || !monto) { setError('Ingresa el monto del arriendo.'); return; }
    try {
      await api.crear('contratos', {
        espacio_id: membresia.espacio.id, propiedad_id: propiedadId, arrendatario_id: f.arrendatario_id,
        fecha_inicio: f.fecha_inicio, fecha_termino: f.fecha_termino || null, monto_arriendo: monto, moneda: f.moneda,
        dia_pago: Number(f.dia_pago), estado: 'vigente',
      });
      if (!datos.propiedad_personas.some((pp) => pp.propiedad_id === propiedadId && pp.persona_id === f.arrendatario_id)) {
        await api.crear('propiedad_personas', { espacio_id: membresia.espacio.id, propiedad_id: propiedadId, persona_id: f.arrendatario_id, rol: 'arrendatario', porcentaje: null });
      }
      await api.editar<Propiedad>('propiedades', propiedadId, { estado: 'arrendada' });
      await recargar();
      aviso('Contrato registrado. El cobro se crea cada mes.');
      setAbierta(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    }
  }
  return (
    <>
      <button className="btn ancho" style={{ marginTop: 12 }} onClick={() => setAbierta(true)}><IMas2 />Registrar contrato de arriendo</button>
      <Hoja titulo="Contrato de arriendo" abierta={abierta} cerrar={() => setAbierta(false)}>
        {candidatos.length === 0 ? <p className="quieto">Primero agrega a la persona arrendataria en Más, Personas.</p> : (
          <form className="form" onSubmit={guardar}>
            <Campo etiqueta="Arrendatario">
              <select value={f.arrendatario_id} onChange={(e) => setF({ ...f, arrendatario_id: e.target.value })} required>
                <option value="">Elige una persona</option>
                {candidatos.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
              </select>
            </Campo>
            <div className="dos">
              <Campo etiqueta="Monto"><input value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} inputMode="decimal" required /></Campo>
              <Campo etiqueta="Moneda"><select value={f.moneda} onChange={(e) => setF({ ...f, moneda: e.target.value as Moneda })}><option>CLP</option><option>UF</option><option>USD</option></select></Campo>
            </div>
            <div className="dos">
              <Campo etiqueta="Inicio"><input type="date" value={f.fecha_inicio} onChange={(e) => setF({ ...f, fecha_inicio: e.target.value })} required /></Campo>
              <Campo etiqueta="Término"><input type="date" value={f.fecha_termino} onChange={(e) => setF({ ...f, fecha_termino: e.target.value })} /></Campo>
            </div>
            <Campo etiqueta="Día de pago"><input type="number" min={1} max={31} value={f.dia_pago} onChange={(e) => setF({ ...f, dia_pago: e.target.value })} /></Campo>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="btn primario ancho">Guardar contrato</button>
          </form>
        )}
      </Hoja>
    </>
  );
}

export function FilaDocumento({ id }: { id: string }) {
  const { datos } = useApp();
  const d = datos.documentos.find((x) => x.id === id);
  const h = aISO(new Date());
  if (!d) return null;
  const vencido = d.vence_el && d.vence_el < h;
  async function abrir() {
    if (!d) return;
    const url = await api.urlArchivo(d.ruta_archivo);
    window.open(url, '_blank', 'noopener');
  }
  return (
    <button className="fila" onClick={abrir}>
      <span className="cuerpo">
        <span className="titulo">{d.nombre}</span>
        <span className="detalle" style={{ display: 'block' }}>{ETIQUETA_DOCUMENTO[d.tipo]}{d.vence_el ? `, ${vencido ? 'venció' : 'vence'} ${fechaCorta(d.vence_el)}` : ''}</span>
      </span>
      {vencido ? <span className="etiqueta e-urgente">Vencido</span> : <span className="chico" style={{ color: 'var(--puerto)', fontWeight: 700 }}>Abrir</span>}
    </button>
  );
}

export function ListaSolicitudes({ solicitudes, editable }: { solicitudes: Solicitud[]; editable: boolean }) {
  const { recargar, aviso } = useApp();
  async function avanzar(id: string, estado: 'en_proceso' | 'resuelta') {
    try {
      await api.editar('solicitudes', id, { estado });
      await recargar();
      aviso(estado === 'resuelta' ? 'Marcada como resuelta' : 'Marcada en proceso');
    } catch (err) {
      aviso(err instanceof Error ? err.message : 'No se pudo actualizar');
    }
  }
  if (solicitudes.length === 0) return <p className="quieto">No hay solicitudes ni mantenciones.</p>;
  return (
    <div className="lista">
      {[...solicitudes].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).map((s) => (
        <div key={s.id} className="fila" style={{ alignItems: 'flex-start' }}>
          <span className="cuerpo">
            <span className="titulo">{s.titulo}</span>
            <span className="detalle" style={{ display: 'block' }}>
              {s.es_mantencion ? 'Mantención' : 'Solicitud'}{s.fecha_programada ? `, programada ${fechaCorta(s.fecha_programada)}` : ''}{s.created_at ? `, recibida ${fechaCorta(s.created_at.slice(0, 10))}` : ''}
            </span>
            {s.descripcion && <span className="detalle" style={{ display: 'block', marginTop: 4 }}>{s.descripcion}</span>}
            {editable && s.estado !== 'resuelta' && s.estado !== 'cancelada' && (
              <span className="acciones" style={{ marginTop: 10 }}>
                {s.estado === 'abierta' && <button className="btn chico" onClick={() => avanzar(s.id, 'en_proceso')}>Marcar en proceso</button>}
                <button className="btn chico" onClick={() => avanzar(s.id, 'resuelta')}>Marcar resuelta</button>
              </span>
            )}
          </span>
          <span className={`etiqueta ${s.estado === 'resuelta' ? 'e-ok' : s.estado === 'en_proceso' ? 'e-puerto' : s.estado === 'abierta' ? 'e-alerta' : 'e-neutro'}`}>{ETIQUETA_SOLICITUD[s.estado]}</span>
        </div>
      ))}
    </div>
  );
}
