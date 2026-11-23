import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../state/App';
import { api } from '../lib/data';
import { Campo, Encabezado, Hoja, Vacio } from '../components/Comunes';
import { IMas2 } from '../components/Iconos';
import { FilaDocumento } from './Propiedades';
import { ETIQUETA_DOCUMENTO } from '../lib/formato';
import type { Documento, TipoDocumento } from '../lib/types';

export default function Documentos() {
  const { datos, puedeEditar, esArrendatario } = useApp();
  const [params, setParams] = useSearchParams();
  const [buscar, setBuscar] = useState('');
  const subir = params.get('subir') === '1';

  const grupos = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    const docs = datos.documentos.filter((d) => !q || d.nombre.toLowerCase().includes(q) || ETIQUETA_DOCUMENTO[d.tipo].toLowerCase().includes(q));
    const porProp = new Map<string, Documento[]>();
    for (const d of docs) {
      const k = d.propiedad_id ?? 'familia';
      porProp.set(k, [...(porProp.get(k) ?? []), d]);
    }
    return [...porProp.entries()].map(([k, ds]) => ({ nombre: datos.propiedades.find((p) => p.id === k)?.nombre ?? 'Familia y personas', docs: ds }));
  }, [datos, buscar]);

  return (
    <>
      <Encabezado titulo="Documentos" sub={esArrendatario ? 'Los que compartió tu arrendador' : 'Contratos, escrituras, certificados y boletas'}
        accion={puedeEditar && <button className="btn-icono" aria-label="Subir documento" onClick={() => setParams({ subir: '1' })}><IMas2 /></button>} />
      {datos.documentos.length > 4 && (
        <Campo etiqueta="Buscar"><input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Nombre o tipo, por ejemplo: escritura" /></Campo>
      )}
      {datos.documentos.length === 0 ? (
        <Vacio titulo="Sin documentos" texto="Sube contratos, escrituras y certificados. Quedan guardados en una carpeta privada de tu familia."
          accion={puedeEditar && <button className="btn primario" onClick={() => setParams({ subir: '1' })}>Subir documento</button>} />
      ) : grupos.length === 0 ? (
        <p className="quieto" style={{ marginTop: 16 }}>Nada coincide con “{buscar}”.</p>
      ) : (
        grupos.map((g) => (
          <section key={g.nombre}>
            <h2>{g.nombre}</h2>
            <div className="lista">{g.docs.map((d) => <FilaDocumento key={d.id} id={d.id} />)}</div>
          </section>
        ))
      )}
      <SubirDocumento abierta={subir} cerrar={() => setParams({})} propiedadInicial={params.get('propiedad') ?? ''} />
    </>
  );
}

function SubirDocumento({ abierta, cerrar, propiedadInicial }: { abierta: boolean; cerrar: () => void; propiedadInicial: string }) {
  const { datos, membresia, recargar, aviso } = useApp();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoDocumento>('contrato');
  const [propiedad, setPropiedad] = useState(propiedadInicial);
  const [vence, setVence] = useState('');
  const [arrendatario, setArrendatario] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!membresia || !archivo) { setError('Elige un archivo.'); return; }
    setEnviando(true);
    setError(null);
    try {
      const prop = propiedad || propiedadInicial;
      const ruta = await api.subirArchivo(membresia.espacio.id, prop ? `propiedades/${prop}` : 'familia', archivo);
      const contrato = prop ? datos.contratos.find((c) => c.propiedad_id === prop && c.estado === 'vigente') : undefined;
      await api.crear<Documento>('documentos', {
        espacio_id: membresia.espacio.id, nombre: nombre.trim() || archivo.name, tipo, ruta_archivo: ruta,
        propiedad_id: prop || null, persona_id: null, contrato_id: tipo === 'contrato' && contrato ? contrato.id : null,
        vence_el: vence || null, visible_arrendatario: arrendatario, visible_propietario: true,
      });
      await recargar();
      aviso('Documento guardado');
      setArchivo(null); setNombre(''); setVence('');
      cerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Hoja titulo="Subir documento" abierta={abierta} cerrar={cerrar}>
      <form className="form" onSubmit={guardar}>
        <label className="btn ancho" style={{ borderStyle: 'dashed', minHeight: 64 }}>
          {archivo ? archivo.name : 'Elegir archivo o tomar foto'}
          <input type="file" accept="image/*,application/pdf" className="sr" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
        </label>
        <Campo etiqueta="Nombre" ayuda="Por ejemplo: Escritura Depto Ñuñoa"><input value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
        <div className="dos">
          <Campo etiqueta="Tipo">
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoDocumento)}>
              {Object.entries(ETIQUETA_DOCUMENTO).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Vence el" ayuda="Si aplica"><input type="date" value={vence} onChange={(e) => setVence(e.target.value)} /></Campo>
        </div>
        <Campo etiqueta="Propiedad">
          <select value={propiedad || propiedadInicial} onChange={(e) => setPropiedad(e.target.value)}>
            <option value="">Ninguna (familia)</option>
            {datos.propiedades.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Campo>
        <label className="check"><input type="checkbox" checked={arrendatario} onChange={(e) => setArrendatario(e.target.checked)} />Compartir con el arrendatario de la propiedad</label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primario ancho" disabled={enviando}>{enviando ? 'Subiendo…' : 'Guardar documento'}</button>
      </form>
    </Hoja>
  );
}
