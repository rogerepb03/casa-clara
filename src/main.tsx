import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/bricolage-grotesque/700.css';
import '@fontsource/bricolage-grotesque/800.css';
import './styles.css';
import { ProveedorApp, useApp } from './state/App';
import Ingreso, { CrearEspacio } from './screens/Ingreso';
import Inicio from './screens/Inicio';
import Propiedades, { DetallePropiedad } from './screens/Propiedades';
import Finanzas, { NuevoMovimiento } from './screens/Finanzas';
import Documentos from './screens/Documentos';
import Mas, { Logros, Miembros, Personas } from './screens/Mas';
import MiArriendo, { PagosArrendatario, SolicitudesArrendatario } from './screens/Arrendatario';
import Bitacora, { NuevaPublicacion } from './screens/Bitacora';
import Seguros from './screens/Seguros';
import TestVivienda from './screens/TestVivienda';
import { ICamara, IFinanzas, IHerramienta, IInicio, IMas, IPropiedades } from './components/Iconos';

function Navegacion({ arrendatario }: { arrendatario: boolean }) {
  const items = arrendatario
    ? [['/', 'Mi arriendo', IInicio], ['/pagos', 'Pagos', IFinanzas], ['/bitacora', 'Bitácora', ICamara], ['/solicitudes', 'Avisos', IHerramienta], ['/mas', 'Cuenta', IMas]] as const
    : [['/', 'Inicio', IInicio], ['/propiedades', 'Propiedades', IPropiedades], ['/finanzas', 'Finanzas', IFinanzas], ['/bitacora', 'Bitácora', ICamara], ['/mas', 'Más', IMas]] as const;
  return (
    <nav className="nav" aria-label="Principal">
      <ul>
        {items.map(([to, texto, Icono]) => (
          <li key={to}><NavLink to={to} end={to === '/'}><Icono />{texto}</NavLink></li>
        ))}
      </ul>
    </nav>
  );
}

function Raiz() {
  const { cargando, usuario, membresia, error, esArrendatario, textoAviso, iniciar } = useApp();
  const { pathname } = useLocation();

  if (cargando) {
    return <main className="app" aria-busy="true"><div className="encabezado"><h1 style={{ color: 'var(--tinta-3)' }}>Casa Clara</h1></div></main>;
  }
  if (error && !membresia) {
    return (
      <main className="app">
        <div className="encabezado"><h1>No pudimos cargar tus datos</h1></div>
        <p className="error">{error}</p>
        <button className="btn primario" style={{ marginTop: 16 }} onClick={() => void iniciar()}>Reintentar</button>
      </main>
    );
  }
  if (!usuario) return pathname.startsWith('/test-vivienda') ? <TestVivienda /> : <Ingreso />;
  if (!membresia) return <CrearEspacio />;

  return (
    <>
      <main className="app">
        <Routes>
          {esArrendatario ? (
            <>
              <Route path="/" element={<MiArriendo />} />
              <Route path="/pagos" element={<PagosArrendatario />} />
              <Route path="/solicitudes" element={<SolicitudesArrendatario />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Inicio />} />
              <Route path="/propiedades" element={<Propiedades />} />
              <Route path="/propiedades/:id" element={<DetallePropiedad />} />
              <Route path="/finanzas" element={<Finanzas />} />
              <Route path="/finanzas/nuevo" element={<NuevoMovimiento />} />
              <Route path="/personas" element={<Personas />} />
              <Route path="/miembros" element={<Miembros />} />
              <Route path="/logros" element={<Logros />} />
            </>
          )}
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/bitacora" element={<Bitacora />} />
          <Route path="/bitacora/nueva" element={<NuevaPublicacion />} />
          <Route path="/seguros" element={<Seguros />} />
          <Route path="/test-vivienda" element={<TestVivienda />} />
          <Route path="/mas" element={<Mas />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Navegacion arrendatario={esArrendatario} />
      {textoAviso && <div className="aviso" role="status">{textoAviso}</div>}
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <ProveedorApp>
        <Raiz />
      </ProveedorApp>
    </HashRouter>
  </StrictMode>,
);
