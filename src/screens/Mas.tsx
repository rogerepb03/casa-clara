import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useHoy } from '../state/App';
import { api } from '../lib/data';
import { cambiarRolDemo, reiniciarDemo } from '../lib/data/local';
import { Barra, Campo, Encabezado, Hoja, Vacio } from '../components/Comunes';
import { IBoleta, IBrujula, ICalendario, ICarpeta, IDocumentos, IEscudo, IFlecha, ILibro, ILlama, ILlave, IMas2, IPersonas, IPropiedades, ISalir } from '../components/Iconos';
import { logros, racha, saludPropiedad, type Logro } from '../lib/juego';
import { ETIQUETA_ROL, ETIQUETA_TIPO_PERSONA } from '../lib/formato';
import type { Persona, Rol, TipoPersona } from '../lib/types';

export default function Mas() {
  const { usuario, membresia, esArrendatario, iniciar } = useApp();
  const local = api.modo === 'local';

  async function salir() {
    await api.salir();
    await iniciar();
  }

  async function verComo(rol: Rol) {
    cambiarRolDemo(rol);
    await iniciar();
  }

  return (
    <>
      <Encabezado titulo={usuario?.nombre ?? 'Mi cuenta'} sub={`${membresia ? ETIQUETA_ROL[membresia.rol] : ''} en ${membresia?.espacio.nombre ?? ''}`} />
      <div className="lista">
        <Link className="fila" to="/documentos"><IDocumentos /><span className="cuerpo titulo">Documentos</span><IFlecha width={18} /></Link>
        {!esArrendatario && <Link className="fila" to="/logros"><ILlama /><span className="cuerpo titulo">Logros y racha</span><IFlecha width={18} /></Link>}
        {!esArrendatario && <Link className="fila" to="/seguros"><IEscudo /><span className="cuerpo titulo">Seguros</span><IFlecha width={18} /></Link>}
        <Link className="fila" to="/test-vivienda"><IBrujula /><span className="cuerpo titulo">Test de vivienda</span><IFlecha width={18} /></Link>
        {!esArrendatario && <Link className="fila" to="/personas"><IPersonas /><span className="cuerpo titulo">Personas</span><IFlecha width={18} /></Link>}
        {membresia?.rol === 'administrador' && <Link className="fila" to="/miembros"><IPropiedades /><span className="cuerpo titulo">Quién tiene acceso</span><IFlecha width={18} /></Link>}
        <button className="fila" onClick={salir}><ISalir /><span className="cuerpo titulo">Cerrar sesión</span></button>
      </div>

      {local && (
        <>
          <h2>Modo de prueba</h2>
          <div className="panel" style={{ padding: 16, display: 'grid', gap: 12 }}>
            <p className="quieto chico">Cambia de rol para ver la app como la vería cada persona. Los datos viven solo en este navegador.</p>
            <div className="segmentos" role="group" aria-label="Ver como">
              <button aria-pressed={membresia?.rol === 'administrador'} onClick={() => verComo('administrador')}>Administrador</button>
              <button aria-pressed={membresia?.rol === 'arrendatario'} onClick={() => verComo('arrendatario')}>Arrendataria</button>
            </div>
            <button className="btn chico" onClick={async () => { reiniciarDemo(); await iniciar(); }}>Restablecer datos de ejemplo</button>
          </div>
        </>
      )}
      <p className="quieto chico" style={{ marginTop: 24 }}>Casa Clara 0.1. {local ? 'Modo de prueba.' : 'Conectado a tu base de datos.'}</p>
    </>
  );
}

const ICONO_LOGRO: Record<Logro['forma'], JSX.Element> = {
  llave: <ILlave />, carpeta: <ICarpeta />, calendario: <ICalendario />, llama: <ILlama />,
  libro: <ILibro />, equipo: <IPersonas />, barrio: <IPropiedades />, boleta: <IBoleta />,
};

export function Logros() {
  const { datos } = useApp();
  const hoy = useHoy();
  const saludes = useMemo(() => datos.propiedades.map((p) => saludPropiedad(p, datos, hoy)), [datos, hoy]);
  const lista = useMemo(() => logros(datos, hoy, saludes), [datos, hoy, saludes]);
  const r = racha(datos, hoy);
  const ganados = lista.filter((l) => l.logrado).length;

  return (
    <>
      <Encabezado titulo="Logros" sub={`${ganados} de ${lista.length} conseguidos`} volver="/mas" />
      <div className="panel" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
        <span className="sello" style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--noche)', color: 'var(--luz)', display: 'grid', placeItems: 'center' }}><ILlama /></span>
        <span>
          <strong className="num" style={{ fontFamily: 'var(--f-titulo)', fontSize: '1.4rem' }}>{r.semanas} {r.semanas === 1 ? 'semana' : 'semanas'} de racha</strong>
          <span className="quieto chico" style={{ display: 'block' }}>
            {r.activaEstaSemana ? 'Esta semana ya registraste movimientos.' : 'Registra un movimiento esta semana para no perderla.'}
          </span>
        </span>
      </div>
      <h2>Tus logros</h2>
      <div className="logros">
        {lista.map((l) => (
          <div key={l.id} className={`panel logro${l.logrado ? ' ganado' : ''}`}>
            <span className="sello">{ICONO_LOGRO[l.forma]}</span>
            <span className="nombre">{l.nombre}</span>
            <span className="desc">{l.descripcion}</span>
            {l.logrado ? <span className="etiqueta e-ok" style={{ justifySelf: 'start' }}>Conseguido</span> : (
              <>
                <Barra valor={l.actual / l.meta} />
                <span className="chico quieto num">{l.actual} de {l.meta}</span>
              </>
            )}
          </div>
        ))}
      </div>
      <h2>Cómo se calcula</h2>
      <p className="quieto">Cada propiedad parte con 100 puntos. Pierde puntos por pagos atrasados, contratos por terminar, documentos vencidos o faltantes, estar desocupada o tener solicitudes sin respuesta. Las ventanas encendidas de su casa muestran el resultado: 4 ventanas sobre 90 puntos.</p>
    </>
  );
}

export function Personas() {
  const { datos, puedeEditar } = useApp();
  const [abierta, setAbierta] = useState(false);
  const [filtro, setFiltro] = useState<TipoPersona | ''>('');
  const tipos = [...new Set(datos.personas.map((p) => p.tipo))];
  const lista = datos.personas.filter((p) => !filtro || p.tipo === filtro).sort((a, b) => a.nombre.localeCompare(b.nombre));
  return (
    <>
      <Encabezado titulo="Personas" sub={`${datos.personas.length} registradas`} volver="/mas"
        accion={puedeEditar && <button className="btn-icono" aria-label="Agregar persona" onClick={() => setAbierta(true)}><IMas2 /></button>} />
      {tipos.length > 1 && (
        <div className="filtros" role="group" aria-label="Filtrar por tipo">
          <button aria-pressed={!filtro} onClick={() => setFiltro('')}>Todas</button>
          {tipos.map((t) => <button key={t} aria-pressed={filtro === t} onClick={() => setFiltro(t)}>{ETIQUETA_TIPO_PERSONA[t]}</button>)}
        </div>
      )}
      {lista.length === 0 ? (
        <Vacio titulo="Sin personas" texto="Agrega familiares, arrendatarios, propietarios y contactos de emergencia."
          accion={puedeEditar && <button className="btn primario" onClick={() => setAbierta(true)}>Agregar persona</button>} />
      ) : (
        <div className="lista">
          {lista.map((p) => {
            const props = datos.propiedad_personas.filter((pp) => pp.persona_id === p.id).map((pp) => datos.propiedades.find((x) => x.id === pp.propiedad_id)?.nombre).filter(Boolean);
            return (
              <div key={p.id} className="fila">
                <span className="cuerpo">
                  <span className="titulo">{p.nombre}</span>
                  <span className="detalle" style={{ display: 'block' }}>{ETIQUETA_TIPO_PERSONA[p.tipo]}{props.length ? `, ${props.join(' y ')}` : ''}</span>
                </span>
                {p.telefono && <a className="btn chico" href={`tel:${p.telefono.replace(/\s/g, '')}`}>Llamar</a>}
              </div>
            );
          })}
        </div>
      )}
      <FormPersona abierta={abierta} cerrar={() => setAbierta(false)} />
    </>
  );
}

function FormPersona({ abierta, cerrar }: { abierta: boolean; cerrar: () => void }) {
  const { membresia, recargar, aviso } = useApp();
  const [f, setF] = useState({ nombre: '', tipo: 'arrendatario' as TipoPersona, rut: '', email: '', telefono: '' });
  const [invitar, setInvitar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esAdmin = membresia?.rol === 'administrador';
  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!membresia) return;
    setError(null);
    try {
      const p = await api.crear<Persona>('personas', {
        espacio_id: membresia.espacio.id, nombre: f.nombre.trim(), tipo: f.tipo, rut: f.rut || null, email: f.email || null,
        telefono: f.telefono || null, notas: null, user_id: null,
      });
      if (invitar && f.email) {
        const rol: Rol = f.tipo === 'arrendatario' ? 'arrendatario' : f.tipo === 'propietario' ? 'propietario' : f.tipo === 'familiar' || f.tipo === 'hijo' ? 'familiar' : 'invitado';
        await api.invitar(membresia.espacio.id, f.email.trim(), rol, p.id);
      }
      await recargar();
      aviso(invitar && f.email ? 'Persona agregada e invitada' : 'Persona agregada');
      setF({ nombre: '', tipo: 'arrendatario', rut: '', email: '', telefono: '' });
      setInvitar(false);
      cerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    }
  }
  const c = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <Hoja titulo="Nueva persona" abierta={abierta} cerrar={cerrar}>
      <form className="form" onSubmit={guardar}>
        <Campo etiqueta="Nombre"><input value={f.nombre} onChange={c('nombre')} autoComplete="off" required /></Campo>
        <Campo etiqueta="Tipo">
          <select value={f.tipo} onChange={c('tipo')}>
            {Object.entries(ETIQUETA_TIPO_PERSONA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </Campo>
        <div className="dos">
          <Campo etiqueta="RUT"><input value={f.rut} onChange={c('rut')} /></Campo>
          <Campo etiqueta="Teléfono"><input type="tel" value={f.telefono} onChange={c('telefono')} /></Campo>
        </div>
        <Campo etiqueta="Correo"><input type="email" value={f.email} onChange={c('email')} /></Campo>
        {esAdmin && f.email && (
          <label className="check"><input type="checkbox" checked={invitar} onChange={(e) => setInvitar(e.target.checked)} />Darle acceso a la app con este correo</label>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primario ancho">Guardar persona</button>
      </form>
    </Hoja>
  );
}

export function Miembros() {
  const { datos } = useApp();
  return (
    <>
      <Encabezado titulo="Quién tiene acceso" sub="Cada rol ve solo lo que le corresponde" volver="/mas" />
      <div className="lista">
        {datos.miembros.map((m) => (
          <div key={m.id} className="fila">
            <span className="cuerpo">
              <span className="titulo">{datos.personas.find((p) => p.id === m.persona_id)?.nombre ?? m.email}</span>
              <span className="detalle" style={{ display: 'block' }}>{ETIQUETA_ROL[m.rol]}, {m.email}</span>
            </span>
            <span className={`etiqueta ${m.estado === 'activo' ? 'e-ok' : 'e-alerta'}`}>{m.estado === 'activo' ? 'Activo' : 'Invitado'}</span>
          </div>
        ))}
      </div>
      <p className="quieto chico" style={{ marginTop: 12 }}>Para invitar a alguien, agrégalo en Personas con su correo y marca “Darle acceso”. Cuando cree su cuenta con ese correo, entra con su rol.</p>
    </>
  );
}
