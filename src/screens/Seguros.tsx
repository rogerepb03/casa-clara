import { useMemo, useState } from 'react';
import { useApp } from '../state/App';
import { Campo, Encabezado } from '../components/Comunes';
import { dinero, ETIQUETA_TIPO_PROPIEDAD } from '../lib/formato';
import { fechaLarga } from '../lib/fechas';

/**
 * Aseguradoras con cotización en línea en Chile. Los "desde" son los precios que cada sitio
 * publica (revisados el 23-11-2026); cambian seguido, por eso siempre se enlaza a la fuente.
 * Para agregar una: copia un bloque y cambia los datos.
 */
const REVISADO = '2026-11-23';
const ASEGURADORAS = [
  { nombre: 'Banco de Chile (Chubb)', producto: 'Seguro Hogar Protegido: contenido ante incendio, sismo y robo', desde: 'desde UF 0,35 al mes', url: 'https://sitiospublicos.bancochile.cl/personas/seguros/detalle/seguro-hogar-protegido', para: ['contenido'] },
  { nombre: 'Banco de Chile (Chubb)', producto: 'Seguro Hogar Modular: estructura, contenido o ambos', desde: 'desde UF 0,1338 al mes', url: 'https://sitiospublicos.bancochile.cl/personas/seguros/detalle/hogar-modular', para: ['estructura', 'contenido'] },
  { nombre: 'BCI Corredora de Seguros', producto: 'Seguro Hogar para propietarios que viven, propietarios que arriendan y arrendatarios', desde: 'desde UF 0,13 (valor publicado a julio 2025)', url: 'https://www.bci.cl/corredora-de-seguros/seguros/seguro-hogar', para: ['estructura', 'contenido'] },
  { nombre: 'Santander', producto: 'Seguro Hogar a tu Medida: contenido con coberturas adicionales', desde: null, url: 'https://banco.santander.cl/personas/seguros/hogar/detalles/seguro-hogar-a-tu-medida', para: ['contenido'] },
  { nombre: 'Zurich', producto: 'Hogar Digital: contenido, estructura o ambos, 100% en línea', desde: null, url: 'https://www.zurich.cl/', para: ['estructura', 'contenido'] },
  { nombre: 'Consorcio', producto: 'Seguro Hogar, cotización y contratación en línea', desde: null, url: 'https://www.consorcio.cl/', para: ['estructura', 'contenido'] },
] as const;

const COBERTURAS = [
  ['incendio', 'Incendio'],
  ['sismo', 'Sismo'],
  ['robo', 'Robo con fuerza o violencia'],
  ['naturaleza', 'Riesgos de la naturaleza (inundación, aluvión)'],
  ['agua', 'Rotura de cañerías y daños por agua'],
  ['rc', 'Responsabilidad civil'],
  ['contenido', 'Contenido (muebles y artefactos)'],
] as const;

export default function Seguros() {
  const { datos, usuario, membresia } = useApp();
  const [elegidas, setElegidas] = useState<string[]>(['incendio', 'sismo', 'robo', 'rc']);
  const [contacto, setContacto] = useState(usuario?.email ?? '');
  const [copiado, setCopiado] = useState(false);

  const totalUF = datos.propiedades.filter((p) => p.moneda_valor === 'UF' && p.valor).reduce((s, p) => s + (p.valor ?? 0), 0);
  const arrendadas = datos.propiedades.filter((p) => p.estado === 'arrendada').length;

  const solicitud = useMemo(() => {
    const lineas = [
      `Solicitud de cotización de seguro colectivo de hogar`,
      `Grupo: ${membresia?.espacio.nombre ?? ''}`,
      ``,
      `Propiedades a asegurar (${datos.propiedades.length}):`,
      ...datos.propiedades.map((p, i) => `${i + 1}. ${ETIQUETA_TIPO_PROPIEDAD[p.tipo]} en ${[p.direccion, p.comuna].filter(Boolean).join(', ') || p.nombre}. Valor: ${p.valor != null ? dinero(p.valor, p.moneda_valor) : 'por informar'}. Uso: ${p.estado === 'arrendada' ? 'arrendada a terceros' : p.estado === 'uso_propio' ? 'vivienda propia' : p.estado.replace('_', ' ')}.`),
      ``,
      `Coberturas solicitadas: ${COBERTURAS.filter(([k]) => elegidas.includes(k)).map(([, t]) => t.toLowerCase()).join(', ')}.`,
      `Solicito una póliza colectiva o descuento por asegurar varias propiedades en conjunto.`,
      ``,
      `Contacto: ${contacto}`,
    ];
    return lineas.join('\n');
  }, [datos.propiedades, elegidas, contacto, membresia]);

  async function copiar() {
    try { await navigator.clipboard.writeText(solicitud); setCopiado(true); setTimeout(() => setCopiado(false), 2500); } catch { setCopiado(false); }
  }
  const asunto = encodeURIComponent(`Cotización seguro colectivo de hogar, ${datos.propiedades.length} propiedades`);

  return (
    <>
      <Encabezado titulo="Seguros" sub="Protege tus propiedades y cotiza en conjunto" volver="/mas" />

      <section className="barrio" style={{ paddingBottom: 20 }}>
        <p style={{ color: '#c9d3e6' }}>Lo que podrías asegurar</p>
        <p className="puntaje num" style={{ fontSize: '2.4rem', marginTop: 6 }}>{totalUF ? `UF ${totalUF.toLocaleString('es-CL')}` : `${datos.propiedades.length} propiedades`}</p>
        <p className="chico" style={{ color: '#c9d3e6', marginTop: 10 }}>
          {datos.propiedades.length} propiedades, {arrendadas} arrendadas. Asegurarlas juntas con una corredora suele dar acceso a pólizas colectivas o descuentos por volumen.
        </p>
      </section>

      <h2>Arma tu solicitud de cotización colectiva</h2>
      <p className="quieto chico" style={{ marginBottom: 10 }}>Elige coberturas y envía la solicitud a una o varias corredoras. Así comparas ofertas reales con los mismos datos.</p>
      <div className="panel" style={{ padding: 16 }}>
        <div className="form">
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 2 }}>
            <legend style={{ fontWeight: 700, marginBottom: 6 }}>Coberturas</legend>
            {COBERTURAS.map(([k, t]) => (
              <label key={k} className="check">
                <input type="checkbox" checked={elegidas.includes(k)} onChange={(e) => setElegidas(e.target.checked ? [...elegidas, k] : elegidas.filter((x) => x !== k))} />{t}
              </label>
            ))}
          </fieldset>
          <Campo etiqueta="Correo o teléfono de contacto"><input value={contacto} onChange={(e) => setContacto(e.target.value)} /></Campo>
          <div className="solicitud" aria-label="Vista previa de la solicitud">{solicitud}</div>
          <div className="dos">
            <button type="button" className="btn" onClick={copiar}>{copiado ? 'Copiada' : 'Copiar texto'}</button>
            <a className="btn" href={`mailto:?subject=${asunto}&body=${encodeURIComponent(solicitud)}`}>Enviar por correo</a>
          </div>
          <a className="btn primario ancho" href={`https://wa.me/?text=${encodeURIComponent(solicitud)}`} target="_blank" rel="noopener noreferrer">Compartir por WhatsApp</a>
        </div>
      </div>

      <h2>Cotiza en línea</h2>
      <p className="quieto chico" style={{ marginBottom: 10 }}>Precios publicados por cada compañía, revisados el {fechaLarga(REVISADO)}. Cambian seguido: el valor final lo da la cotización en su sitio.</p>
      <div className="lista">
        {ASEGURADORAS.map((a) => (
          <div key={a.url} className="aseguradora">
            <strong>{a.nombre}</strong>
            <span className="quieto chico">{a.producto}</span>
            {a.desde && <span className="chico num" style={{ fontWeight: 700 }}>{a.desde}</span>}
            <div className="acciones"><a className="btn chico" href={a.url} target="_blank" rel="noopener noreferrer">Cotizar en su sitio</a></div>
          </div>
        ))}
      </div>

      <h2>Antes de contratar</h2>
      <div className="panel" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <p className="chico">Si arriendas una propiedad, el seguro de estructura (incendio y sismo) lo toma el dueño; el contenido lo asegura quien vive ahí.</p>
        <p className="chico">Revisa si el sismo está incluido o es adicional, el deducible y si la póliza aplica prorrateo o depreciación.</p>
        <p className="chico">Las inundaciones y aluviones muchas veces se contratan aparte.</p>
        <a className="btn chico" style={{ justifySelf: 'start' }} href="https://www.cmfchile.cl/educa/621/w3-propertyvalue-1627.html" target="_blank" rel="noopener noreferrer">Guía oficial de la CMF sobre seguros de incendio</a>
      </div>
    </>
  );
}
