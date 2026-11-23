import { Link } from 'react-router-dom';
import type { Propiedad } from '../lib/types';
import type { Salud } from '../lib/juego';

// Fachadas de colores, como los cerros de Valparaíso
const FACHADAS = ['#e7a83e', '#5b8fd0', '#6aa77c', '#cf7ea8', '#8f7fd0', '#e08a5a'];

interface Props {
  propiedades: Propiedad[];
  saludes: Salud[];
  enlaces?: boolean;
}

/**
 * Cada propiedad es una casa en el cerro. Las ventanas encendidas (0 a 4)
 * muestran su salud. Es el corazón del modo juego.
 */
export function Barrio({ propiedades, saludes, enlaces = true }: Props) {
  const visibles = propiedades.slice(0, 6);
  const n = Math.max(visibles.length, 1);
  const W = 400;
  const suelo = (x: number) => 156 - 26 * Math.sin((Math.PI * x) / W);

  return (
    <svg className="cerro" viewBox={`0 0 ${W} 200`} role="group" aria-label="Tus propiedades como un barrio: más ventanas encendidas, mejor salud">
      {/* estrellas */}
      {[[30, 22], [92, 12], [168, 30], [250, 14], [330, 26], [372, 8], [210, 6]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 1.1} fill="#fff" opacity={0.55} />
      ))}
      <circle cx="352" cy="44" r="13" fill="#f5e7c2" opacity="0.9" />
      <circle cx="358" cy="40" r="12" fill="#1c2b4b" />
      {/* cerro trasero */}
      <path d={`M0 150 Q 120 92 220 128 T ${W} 118 V200 H0Z`} fill="#2b3e66" opacity="0.7" />

      {visibles.map((p, i) => {
        const s = saludes.find((x) => x.propiedadId === p.id);
        const ventanas = s?.ventanas ?? 0;
        const cx = ((i + 0.5) * W) / n;
        const w = Math.min(70, W / n - 16);
        const h = w * 0.82 + (i % 3) * 9;
        const base = suelo(cx) + 6;
        const x0 = cx - w / 2;
        const techo = base - h;
        const vw = w * 0.2;
        const posiciones = [
          [x0 + w * 0.2, techo + h * 0.22], [x0 + w * 0.6, techo + h * 0.22],
          [x0 + w * 0.2, techo + h * 0.56], [x0 + w * 0.6, techo + h * 0.56],
        ];
        const etiqueta = `${p.nombre}: salud ${s?.puntaje ?? 0} de 100`;
        const casa = (
          <g>
            <path d={`M${x0 - 4} ${techo + 2} L${cx} ${techo - w * 0.36} L${x0 + w + 4} ${techo + 2} Z`} fill="#1a2747" />
            <rect x={x0} y={techo} width={w} height={h} rx="3" fill={FACHADAS[i % FACHADAS.length]} />
            {posiciones.map(([vx, vy], j) => (
              <rect key={j} x={vx} y={vy} width={vw} height={vw * 1.1} rx="1.5"
                fill={j < ventanas ? '#f5c04f' : '#1a2747'} opacity={j < ventanas ? 1 : 0.55} />
            ))}
            {ventanas > 0 && <rect x={x0} y={techo} width={w} height={h} rx="3" fill="#f5c04f" opacity={0.05 * ventanas} />}
          </g>
        );
        return enlaces ? (
          <Link key={p.id} to={`/propiedades/${p.id}`} className="casa" aria-label={etiqueta}>
            <title>{etiqueta}</title>
            {casa}
          </Link>
        ) : (
          <g key={p.id} aria-label={etiqueta} role="img">{casa}</g>
        );
      })}
      {/* cerro delantero */}
      <path d={`M0 ${suelo(0) + 6} ${Array.from({ length: 21 }, (_, k) => `L${(k * W) / 20} ${suelo((k * W) / 20) + 6}`).join(' ')} V200 H0Z`} fill="#121c33" />
      {visibles.map((p, i) => {
        const cx = ((i + 0.5) * W) / n;
        return (
          <text key={p.id} x={cx} y={suelo(cx) + 26} textAnchor="middle" fontSize="11.5" fill="#dbe3f2" fontFamily="var(--f-texto)" aria-hidden="true">
            {p.nombre.length > 14 ? `${p.nombre.slice(0, 13)}…` : p.nombre}
          </text>
        );
      })}
      {propiedades.length > 6 && (
        <text x={W - 10} y="194" textAnchor="end" fontSize="11" fill="#c9d3e6">+{propiedades.length - 6} más</text>
      )}
    </svg>
  );
}

/** Casa pequeña para listas: misma regla de ventanas. */
export function CasaMini({ ventanas, color = 0 }: { ventanas: number; color?: number }) {
  const pos = [[18, 30], [36, 30], [18, 44], [36, 44]];
  return (
    <svg viewBox="0 0 68 68" width="68" height="68" aria-hidden="true">
      <path d="M8 30 L34 10 L60 30Z" fill="#0f1930" />
      <rect x="12" y="26" width="44" height="34" rx="3" fill={FACHADAS[color % FACHADAS.length]} />
      {pos.map(([x, y], j) => (
        <rect key={j} x={x} y={y} width="12" height="10" rx="1.5" fill={j < ventanas ? '#f5c04f' : '#1a2747'} opacity={j < ventanas ? 1 : 0.55} />
      ))}
    </svg>
  );
}
