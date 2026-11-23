import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IVolver } from './Iconos';
import { dineroCorto } from '../lib/formato';
import { nombreMes } from '../lib/fechas';
import type { ResumenMes } from '../lib/finanzas';

export function Encabezado({ titulo, sub, volver, accion }: { titulo: string; sub?: string; volver?: string | true; accion?: ReactNode }) {
  const navegar = useNavigate();
  return (
    <header>
      {volver && (
        <div style={{ paddingTop: 'calc(10px + env(safe-area-inset-top))' }}>
          {volver === true ? (
            <button className="volver" onClick={() => navegar(-1)}><IVolver width={18} height={18} />Volver</button>
          ) : (
            <Link className="volver" to={volver}><IVolver width={18} height={18} />Volver</Link>
          )}
        </div>
      )}
      <div className="encabezado" style={volver ? { paddingTop: 4 } : undefined}>
        <div>
          <h1>{titulo}</h1>
          {sub && <p className="sub">{sub}</p>}
        </div>
        {accion}
      </div>
    </header>
  );
}

export function Hoja({ titulo, abierta, cerrar, children }: { titulo: string; abierta: boolean; cerrar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierta) return;
    const previo = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && cerrar();
    window.addEventListener('keydown', tecla);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', tecla);
      document.body.style.overflow = '';
      previo?.focus();
    };
  }, [abierta, cerrar]);
  if (!abierta) return null;
  return (
    <div className="velo" onClick={cerrar}>
      <div className="hoja" role="dialog" aria-modal="true" aria-label={titulo} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="asa" />
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

export function Vacio({ titulo, texto, accion }: { titulo: string; texto: string; accion?: ReactNode }) {
  return (
    <div className="vacio panel">
      <h3>{titulo}</h3>
      <p>{texto}</p>
      {accion}
    </div>
  );
}

export function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      {children}
      {ayuda && <small>{ayuda}</small>}
    </label>
  );
}

/** Barras de ingresos y gastos por mes (CLP pagado). */
export function GraficoMeses({ serie }: { serie: ResumenMes[] }) {
  const max = Math.max(1, ...serie.flatMap((s) => [s.ingresos, s.gastos]));
  const W = 320, H = 150, base = 124, alto = 104;
  const col = W / serie.length;
  const bw = Math.min(16, col / 3);
  return (
    <div className="grafico panel">
      <div className="clave">
        <span><i style={{ background: 'var(--puerto)' }} />Ingresos</span>
        <span><i style={{ background: 'var(--luz)' }} />Gastos</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
        aria-label={`Ingresos y gastos de los últimos ${serie.length} meses. ${serie.map((s) => `${nombreMes(s.mes)}: ingresos ${dineroCorto(s.ingresos)}, gastos ${dineroCorto(s.gastos)}`).join('. ')}`}>
        <line x1="0" x2={W} y1={base} y2={base} stroke="var(--linea)" />
        {serie.map((s, i) => {
          const cx = col * i + col / 2;
          const hi = (s.ingresos / max) * alto;
          const hg = (s.gastos / max) * alto;
          const actual = i === serie.length - 1;
          return (
            <g key={s.mes}>
              <rect x={cx - bw - 1} y={base - hi} width={bw} height={hi} rx="3" fill="var(--puerto)" opacity={actual ? 1 : 0.85} />
              <rect x={cx + 1} y={base - hg} width={bw} height={hg} rx="3" fill="var(--luz)" />
              <text x={cx} y={base + 17} textAnchor="middle" fontSize="11" fill={actual ? 'var(--tinta)' : 'var(--tinta-2)'} fontWeight={actual ? 700 : 400}>
                {nombreMes(s.mes, true)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function Barra({ valor, ok }: { valor: number; ok?: boolean }) {
  return (
    <div className={`barra${ok ? ' ok' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(valor * 100)}>
      <span style={{ width: `${Math.max(0, Math.min(1, valor)) * 100}%` }} />
    </div>
  );
}
