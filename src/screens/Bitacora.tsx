import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp, useHoy } from '../state/App';
import { api } from '../lib/data';
import { Campo, Encabezado, Vacio } from '../components/Comunes';
import { IAlerta, ICamara, ICandado, ICorazon, IFiesta, IHerramienta, IMas2, IRayo } from '../components/Iconos';
import { useUrl } from './Propiedades';
import { aISO, claveMes, fechaLarga, nombreMes } from '../lib/fechas';
import { ES_INCIDENTE, type Publicacion, type Solicitud, type TipoPublicacion } from '../lib/types';

export const TIPOS: Record<TipoPublicacion, { nombre: string; icono: ReactNode; ayuda: string }> = {
  recuerdo: { nombre: 'Recuerdo', icono: <ICorazon />, ayuda: 'Un momento que quieres guardar' },
  evento_familiar: { nombre: 'Evento familiar', icono: <IFiesta />, ayuda: 'Cumpleaños, fiestas, visitas' },
  incidente: { nombre: 'Incidente', icono: <IAlerta />, ayuda: 'Algo que pasó y hay que revisar' },
  robo: { nombre: 'Robo', icono: <ICandado />, ayuda: 'Robo o intento de robo' },
  dano: { nombre: 'Daño', icono: <IHerramienta />, ayuda: 'Filtración, rotura, desgaste' },
  desastre: { nombre: 'Emergencia', icono: <IRayo />, ayuda: 'Incendio, inundación, sismo' },
};
const GRAVEDAD: Record<number, string> = { 1: 'Leve', 2: 'Importante', 3: 'Grave' };

type Filtro = 'todo' | 'recuerdos' | 'incidentes' | 'abiertos';

export default function Bitacora() {
  const { datos, puedeEditar, esArrendatario } = useApp();
  const [params, setParams] = useSearchParams();
  const filtro = (params.get('ver') as Filtro) || 'todo';

  const lista = useMemo(() => datos.publicaciones
    .filter((p) => filtro === 'todo' || (filtro === 'recuerdos' ? !ES_INCIDENTE[p.tipo] : filtro === 'incidentes' ? ES_INCIDENTE[p.tipo] : ES_INCIDENTE[p.tipo] && !p.resuelto))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.created_at ?? '').localeCompare(a.created_at ?? '')), [datos.publicaciones, filtro]);

  const porMes = useMemo(() => {
    const g = new Map<string, Publicacion[]>();
    for (const p of lista) g.set(claveMes(p.fecha), [...(g.get(claveMes(p.fecha)) ?? []), p]);
    return [...g.entries()];
  }, [lista]);

  const abiertos = datos.publicaciones.filter((p) => ES_INCIDENTE[p.tipo] && !p.resuelto).length;
  const puedePublicar = puedeEditar || esArrendatario;
  const filtros: [Filtro, string][] = esArrendatario
    ? [['todo', 'Todo'], ['abiertos', `Abiertos${abiertos ? ` (${abiertos})` : ''}`]]
    : [['todo', 'Todo'], ['recuerdos', 'Recuerdos'], ['incidentes', 'Incidentes'], ['abiertos', `Abiertos${abiertos ? ` (${abiertos})` : ''}`]];

  return (
    <>
      <Encabezado titulo="Bitácora" sub={esArrendatario ? 'Reporta lo que pasa en tu arriendo' : 'Recuerdos de la familia e incidentes de las propiedades'}
        accion={puedePublicar && <Link className="btn-icono" to="/bitacora/nueva" aria-label="Nueva publicación"><IMas2 /></Link>} />
      <div className="filtros" role="group" aria-label="Filtrar bitácora">
        {filtros.map(([v, t]) => <button key={v} aria-pressed={filtro === v} onClick={() => setParams(v === 'todo' ? {} : { ver: v })}>{t}</button>)}
      </div>

      {lista.length === 0 ? (
        datos.publicaciones.length === 0 ? (
          <Vacio titulo={esArrendatario ? 'Nada reportado' : 'Tu bitácora está vacía'}
            texto={esArrendatario ? 'Si algo se daña o pasa algo en la propiedad, repórtalo con fotos. Tu arrendador recibe el aviso al instante.' : 'Guarda aquí cumpleaños, paseos y fiestas, y también los robos, daños o emergencias de tus propiedades, con fotos y fecha.'}
            accion={puedePublicar && <Link className="btn primario" to="/bitacora/nueva">{esArrendatario ? 'Reportar algo' : 'Crear la primera publicación'}</Link>} />
        ) : (
          <Vacio titulo={filtro === 'abiertos' ? 'Sin incidentes abiertos' : 'Nada con este filtro'} texto={filtro === 'abiertos' ? 'Todo lo reportado está resuelto.' : 'Prueba con otro filtro.'}
            accion={<button className="btn" onClick={() => setParams({})}>Ver todo</button>} />
        )
      ) : (
        porMes.map(([mes, pubs]) => (
          <section key={mes}>
            <h2 style={{ textTransform: 'capitalize' }}>{nombreMes(mes)} {mes.slice(0, 4)}</h2>
            {pubs.map((p) => <TarjetaPublicacion key={p.id} p={p} />)}
          </section>
        ))
      )}
      {puedePublicar && <Link to="/bitacora/nueva" className="flotante" aria-label="Nueva publicación"><ICamara width={26} height={26} /></Link>}
    </>
  );
}

function Foto({ ruta, alt, abrir }: { ruta: string; alt: string; abrir: (url: string) => void }) {
  const url = useUrl(ruta);
  return (
    <button onClick={() => url && abrir(url)} aria-label={`Ver foto: ${alt}`}>
      {url ? <img src={url} alt={alt} loading="lazy" /> : null}
    </button>
  );
}

function TarjetaPublicacion({ p }: { p: Publicacion }) {
  const { datos, puedeEditar, usuario, membresia, recargar, aviso } = useApp();
  const navegar = useNavigate();
  const [visor, setVisor] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const incidente = ES_INCIDENTE[p.tipo];
  const prop = datos.propiedades.find((x) => x.id === p.propiedad_id);
  const propio = p.creado_por === usuario?.id;

  async function resolver() {
    setOcupado(true);
    try { await api.editar<Publicacion>('publicaciones', p.id, { resuelto: !p.resuelto }); await recargar(); aviso(p.resuelto ? 'Marcado como abierto' : 'Marcado como resuelto'); }
    catch (e) { aviso(e instanceof Error ? e.message : 'No se pudo actualizar'); }
    finally { setOcupado(false); }
  }
  async function crearSolicitud() {
    if (!membresia || !p.propiedad_id) return;
    setOcupado(true);
    try {
      await api.crear<Solicitud>('solicitudes', { espacio_id: membresia.espacio.id, propiedad_id: p.propiedad_id, titulo: p.titulo, descripcion: p.texto, es_mantencion: true, estado: 'abierta', prioridad: p.gravedad === 3 ? 1 : 2, fecha_programada: null });
      await recargar();
      aviso('Reparación agregada a las solicitudes de la propiedad');
      navegar(`/propiedades/${p.propiedad_id}`);
    } catch (e) { aviso(e instanceof Error ? e.message : 'No se pudo crear'); setOcupado(false); }
  }
  async function borrar() {
    setOcupado(true);
    try { await api.borrar('publicaciones', p.id); await recargar(); aviso('Publicación eliminada'); }
    catch (e) { aviso(e instanceof Error ? e.message : 'No se pudo eliminar'); setOcupado(false); }
  }

  const clase = `panel post${incidente ? ' incidente' : ''}${p.gravedad === 3 ? ' grave' : ''}${p.resuelto ? ' resuelto' : ''}`;
  return (
    <article className={clase} aria-labelledby={`t-${p.id}`}>
      {p.fotos.length > 0 && (
        <>
          <div className="fotos">{p.fotos.map((f, i) => <Foto key={f} ruta={f} alt={`${p.titulo}, foto ${i + 1}`} abrir={setVisor} />)}</div>
          {p.fotos.length > 1 && <div className="cuantas"><span>{p.fotos.length} fotos</span></div>}
        </>
      )}
      <div className="cuerpo">
        <div className="meta">
          <span className={`etiqueta ${!incidente ? 'e-puerto' : p.resuelto ? 'e-ok' : p.gravedad === 3 ? 'e-urgente' : 'e-alerta'}`}>
            {TIPOS[p.tipo].nombre}{incidente ? `: ${p.resuelto ? 'resuelto' : GRAVEDAD[p.gravedad ?? 2].toLowerCase()}` : ''}
          </span>
          <span>{fechaLarga(p.fecha)}</span>
          {prop && <span>{prop.nombre}</span>}
        </div>
        <h3 id={`t-${p.id}`} style={{ fontFamily: 'var(--f-titulo)', fontSize: '1.15rem' }}>{p.titulo}</h3>
        {p.texto && <p className="quieto">{p.texto}</p>}
        {p.visibilidad === 'propiedad' && !incidente && <p className="chico quieto">Compartido con quienes viven en la propiedad.</p>}
        {(puedeEditar || propio) && (
          <div className="acciones" style={{ marginTop: 6 }}>
            {incidente && puedeEditar && <button className="btn chico" onClick={resolver} disabled={ocupado}>{p.resuelto ? 'Reabrir' : 'Marcar resuelto'}</button>}
            {incidente && puedeEditar && !p.resuelto && p.propiedad_id && <button className="btn chico" onClick={crearSolicitud} disabled={ocupado}>Agendar reparación</button>}
            {puedeEditar && <button className="btn chico peligro" onClick={borrar} disabled={ocupado}>Eliminar</button>}
          </div>
        )}
      </div>
      {visor && (
        <div className="visor" role="dialog" aria-modal="true" aria-label={p.titulo} onClick={() => setVisor(null)}>
          <button className="btn chico cerrar" onClick={() => setVisor(null)}>Cerrar</button>
          <img src={visor} alt={p.titulo} />
        </div>
      )}
    </article>
  );
}

/** Reduce la foto a 1600 px y JPEG 82% antes de subirla: ahorra datos y almacenamiento. */
async function comprimir(archivo: File): Promise<File> {
  if (!archivo.type.startsWith('image/') || archivo.type === 'image/gif' || archivo.type === 'image/svg+xml') return archivo;
  try {
    const bmp = await createImageBitmap(archivo);
    const escala = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (escala === 1 && archivo.size < 900_000) return archivo;
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(bmp.width * escala);
    lienzo.height = Math.round(bmp.height * escala);
    lienzo.getContext('2d')!.drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/jpeg', 0.82));
    return blob ? new File([blob], archivo.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : archivo;
  } catch {
    return archivo;
  }
}

export function NuevaPublicacion() {
  const { datos, membresia, esArrendatario, recargar, aviso } = useApp();
  const hoy = useHoy();
  const navegar = useNavigate();
  const tiposPermitidos = (Object.keys(TIPOS) as TipoPublicacion[]).filter((t) => !esArrendatario || ES_INCIDENTE[t]);
  const [tipo, setTipo] = useState<TipoPublicacion>(esArrendatario ? 'dano' : 'recuerdo');
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [fecha, setFecha] = useState(aISO(hoy));
  const [propiedad, setPropiedad] = useState(esArrendatario ? datos.propiedades[0]?.id ?? '' : '');
  const [gravedad, setGravedad] = useState(2);
  const [compartir, setCompartir] = useState(false);
  const [fotos, setFotos] = useState<{ archivo: File; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const incidente = ES_INCIDENTE[tipo];

  function agregarFotos(lista: FileList | null) {
    if (!lista) return;
    const nuevas = [...lista].slice(0, 12 - fotos.length).map((archivo) => ({ archivo, url: URL.createObjectURL(archivo) }));
    setFotos([...fotos, ...nuevas]);
  }

  async function publicar(e: FormEvent) {
    e.preventDefault();
    if (!membresia) return;
    if (incidente && !propiedad) { setError('Elige la propiedad donde ocurrió.'); return; }
    setEnviando(true);
    setError(null);
    try {
      const rutas: string[] = [];
      for (const f of fotos) rutas.push(await api.subirArchivo(membresia.espacio.id, 'bitacora', await comprimir(f.archivo)));
      const visibilidad = esArrendatario || (propiedad && (compartir || (incidente && compartir))) ? 'propiedad' : 'familia';
      await api.crear<Publicacion>('publicaciones', {
        espacio_id: membresia.espacio.id, tipo, titulo: titulo.trim(), texto: texto.trim() || null, fecha,
        propiedad_id: propiedad || null, fotos: rutas, visibilidad, gravedad: incidente ? gravedad : null, resuelto: false,
      });
      await recargar();
      aviso(incidente ? (esArrendatario ? 'Reporte enviado a tu arrendador' : 'Incidente registrado') : 'Guardado en la bitácora');
      navegar('/bitacora');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar.');
      setEnviando(false);
    }
  }

  return (
    <>
      <Encabezado titulo={esArrendatario ? 'Reportar algo' : 'Nueva publicación'} volver="/bitacora" />
      <form className="form" onSubmit={publicar}>
        <div className="campo">
          <span>¿Qué quieres registrar?</span>
          <div className="tipos" role="group" aria-label="Tipo de publicación">
            {tiposPermitidos.map((t) => (
              <button key={t} type="button" aria-pressed={tipo === t} className={t === 'robo' || t === 'desastre' ? 'grave' : undefined} onClick={() => { setTipo(t); setGravedad(t === 'robo' || t === 'desastre' ? 3 : 2); }}>
                {TIPOS[t].icono}{TIPOS[t].nombre}
              </button>
            ))}
          </div>
          <small>{TIPOS[tipo].ayuda}</small>
        </div>

        <label className="btn ancho" style={{ borderStyle: 'dashed', minHeight: 64 }}>
          <ICamara width={22} height={22} />{fotos.length ? 'Agregar más fotos' : 'Agregar fotos'}
          <input type="file" accept="image/*" multiple className="sr" onChange={(e) => { agregarFotos(e.target.files); e.target.value = ''; }} />
        </label>
        {fotos.length > 0 && (
          <div className="miniaturas">
            {fotos.map((f, i) => (
              <figure key={f.url}>
                <img src={f.url} alt={`Foto ${i + 1}`} />
                <button type="button" aria-label={`Quitar foto ${i + 1}`} onClick={() => setFotos(fotos.filter((_, j) => j !== i))}>×</button>
              </figure>
            ))}
          </div>
        )}

        <Campo etiqueta="Título" ayuda={incidente ? 'Por ejemplo: Se rompió la ventana del living' : 'Por ejemplo: Cumpleaños de la abuela'}>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={120} />
        </Campo>
        <Campo etiqueta={incidente ? '¿Qué pasó?' : 'Cuéntalo'} ayuda={incidente ? 'Cuándo, dónde, si hay daños o personas afectadas.' : undefined}>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} />
        </Campo>
        <div className="dos">
          <Campo etiqueta="Fecha"><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} max={aISO(hoy)} required /></Campo>
          {incidente ? (
            <Campo etiqueta="Gravedad">
              <select value={gravedad} onChange={(e) => setGravedad(Number(e.target.value))}>
                <option value={1}>Leve</option><option value={2}>Importante</option><option value={3}>Grave</option>
              </select>
            </Campo>
          ) : <span />}
        </div>
        {!esArrendatario && (
          <Campo etiqueta="Propiedad" ayuda={incidente ? undefined : 'Opcional'}>
            <select value={propiedad} onChange={(e) => setPropiedad(e.target.value)} required={incidente}>
              <option value="">{incidente ? 'Elige la propiedad' : 'Ninguna'}</option>
              {datos.propiedades.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Campo>
        )}
        {!esArrendatario && propiedad && (
          <label className="check"><input type="checkbox" checked={compartir} onChange={(e) => setCompartir(e.target.checked)} />Compartir con quienes viven en esa propiedad</label>
        )}
        {incidente && tipo === 'desastre' && (
          <p className="chico" style={{ color: 'var(--urgente)', fontWeight: 700 }}>Si hay personas en riesgo llama primero a Bomberos (132), Ambulancia (131) o Carabineros (133).</p>
        )}
        {incidente && tipo === 'robo' && (
          <p className="chico quieto">Recuerda hacer la denuncia en Carabineros (133) o en la PDI: el seguro te la pedirá.</p>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primario ancho" disabled={enviando}>{enviando ? (fotos.length ? 'Subiendo fotos…' : 'Guardando…') : incidente ? 'Enviar reporte' : 'Guardar en la bitácora'}</button>
      </form>
    </>
  );
}
