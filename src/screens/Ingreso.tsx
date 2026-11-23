import { useState, type FormEvent } from 'react';
import { api } from '../lib/data';
import { useApp } from '../state/App';
import { Campo } from '../components/Comunes';
import { cambiarRolDemo } from '../lib/data/local';

function CerroIngreso() {
  return (
    <svg viewBox="0 0 400 110" aria-hidden="true">
      <path d="M0 80 Q 110 30 210 62 T 400 50 V110 H0Z" fill="#2b3e66" opacity=".7" />
      {[[40, 70, '#e7a83e', 3], [110, 58, '#5b8fd0', 4], [180, 64, '#6aa77c', 2], [250, 56, '#cf7ea8', 4], [320, 60, '#8f7fd0', 3]].map(([x, y, c, v], i) => (
        <g key={i}>
          <path d={`M${Number(x) - 22} ${y} L${x} ${Number(y) - 18} L${Number(x) + 22} ${y}Z`} fill="#1a2747" />
          <rect x={Number(x) - 18} y={y} width="36" height="34" rx="2" fill={String(c)} />
          {[0, 1, 2, 3].map((j) => (
            <rect key={j} x={Number(x) - 12 + (j % 2) * 15} y={Number(y) + 6 + Math.floor(j / 2) * 13} width="9" height="9" rx="1"
              fill={j < Number(v) ? '#f5c04f' : '#1a2747'} opacity={j < Number(v) ? 1 : 0.55} />
          ))}
        </g>
      ))}
      <path d="M0 96 Q 200 70 400 96 V110 H0Z" fill="#f2f5f8" />
    </svg>
  );
}

export default function Ingreso() {
  const { iniciar } = useApp();
  const [modo, setModo] = useState<'ingresar' | 'registrar'>('ingresar');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const local = api.modo === 'local';

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      if (modo === 'ingresar') {
        await api.ingresar(email.trim(), clave);
        await iniciar();
      } else {
        const r = await api.registrarse(email.trim(), clave, nombre.trim());
        if (r.requiereConfirmacion) setMensaje('Te enviamos un correo. Abre el enlace para confirmar tu cuenta y luego ingresa.');
        else await iniciar();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ingresar.');
    } finally {
      setEnviando(false);
    }
  }

  async function probar(rol: 'administrador' | 'arrendatario') {
    cambiarRolDemo(rol);
    await api.ingresar('', '');
    await iniciar();
  }

  return (
    <main className="ingreso">
      <div className="cielo">
        <h1>Casa Clara</h1>
        <p>Tus propiedades, arriendos, gastos y documentos, ordenados en un solo lugar.</p>
        <CerroIngreso />
      </div>
      <div className="caja">
        {local ? (
          <div className="form">
            <p className="modo-local">Modo de prueba: los datos son de ejemplo y se guardan solo en este navegador.</p>
            <button className="btn primario ancho" onClick={() => probar('administrador')}>Entrar como administrador</button>
            <button className="btn ancho" onClick={() => probar('arrendatario')}>Entrar como arrendataria</button>
            <p className="quieto chico">Para usar tus datos reales, conecta Supabase siguiendo la guía del repositorio.</p>
          </div>
        ) : mensaje ? (
          <div className="form">
            <p>{mensaje}</p>
            <button className="btn ancho" onClick={() => { setMensaje(null); setModo('ingresar'); }}>Ir a ingresar</button>
          </div>
        ) : (
          <form className="form" onSubmit={enviar}>
            <div className="segmentos" role="group" aria-label="Elige una opción">
              <button type="button" aria-pressed={modo === 'ingresar'} onClick={() => setModo('ingresar')}>Ingresar</button>
              <button type="button" aria-pressed={modo === 'registrar'} onClick={() => setModo('registrar')}>Crear cuenta</button>
            </div>
            {modo === 'registrar' && (
              <Campo etiqueta="Tu nombre">
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" required />
              </Campo>
            )}
            <Campo etiqueta="Correo">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" required />
            </Campo>
            <Campo etiqueta="Contraseña" ayuda={modo === 'registrar' ? 'Mínimo 6 caracteres.' : undefined}>
              <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete={modo === 'ingresar' ? 'current-password' : 'new-password'} minLength={6} required />
            </Campo>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="btn primario ancho" disabled={enviando}>
              {enviando ? 'Un momento…' : modo === 'ingresar' ? 'Ingresar' : 'Crear cuenta'}
            </button>
            {modo === 'registrar' && (
              <p className="quieto chico">Si te invitaron, usa el mismo correo de la invitación y quedarás conectado a tu familia automáticamente.</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}

export function CrearEspacio() {
  const { iniciar } = useApp();
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const id = await api.crearEspacio(nombre.trim());
      localStorage.setItem('casaclara:espacio', id);
      await iniciar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear.');
      setEnviando(false);
    }
  }

  return (
    <main className="app">
      <div className="encabezado"><div><h1>Crea tu espacio</h1><p className="sub">Es el lugar de tu familia. Podrás invitar a otros después.</p></div></div>
      <form className="form" onSubmit={crear}>
        <Campo etiqueta="Nombre" ayuda="Por ejemplo: Familia Pérez Soto">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </Campo>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primario ancho" disabled={enviando}>{enviando ? 'Creando…' : 'Crear espacio'}</button>
        <p className="quieto chico">Si alguien te invitó, no crees un espacio: pídele que revise que la invitación esté a tu correo.</p>
      </form>
    </main>
  );
}
