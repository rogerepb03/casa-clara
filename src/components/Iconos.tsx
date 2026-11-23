// Íconos de línea propios (sin librerías), 24×24, heredan el color del texto.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...p,
});

export const IInicio = (p: P) => <svg {...base(p)}><path d="M4 11.5 12 5l8 6.5" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></svg>;
export const IPropiedades = (p: P) => <svg {...base(p)}><path d="M3 20h18" /><path d="M5 20V10l5-4 5 4v10" /><path d="M15 20v-7l4-3v10" /><path d="M8.5 13h3M8.5 16h3" /></svg>;
export const IFinanzas = (p: P) => <svg {...base(p)}><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18" /><path d="M7 15h4" /></svg>;
export const IDocumentos = (p: P) => <svg {...base(p)}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /><path d="M10 13h6M10 17h6" /></svg>;
export const IMas = (p: P) => <svg {...base(p)}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" /></svg>;
export const IPersonas = (p: P) => <svg {...base(p)}><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c.9-3 3-4.5 5.5-4.5s4.6 1.5 5.5 4.5" /><circle cx="17" cy="9.5" r="2.4" /><path d="M16 14.6c2.3-.2 4 1.2 4.6 3.9" /></svg>;
export const IMas2 = (p: P) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const IVolver = (p: P) => <svg {...base(p)}><path d="m15 5-7 7 7 7" /></svg>;
export const IFlecha = (p: P) => <svg {...base(p)}><path d="m9 5 7 7-7 7" /></svg>;
export const IAlerta = (p: P) => <svg {...base(p)}><path d="M12 4 2.8 19.5h18.4z" /><path d="M12 10v4.5M12 17.2v.3" /></svg>;
export const ICheck = (p: P) => <svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
export const ICamara = (p: P) => <svg {...base(p)}><path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4z" /><circle cx="12" cy="13.2" r="3.4" /></svg>;
export const ILlama = (p: P) => <svg {...base(p)}><path d="M12 21c3.6 0 6-2.4 6-5.8 0-3.9-3.3-5.9-4-10.2-2.7 1.8-3.6 4.4-3.3 6.6-1.2-.6-2-1.8-2.2-3C6.9 10 6 12.4 6 15.2 6 18.6 8.4 21 12 21Z" /></svg>;
export const ILlave = (p: P) => <svg {...base(p)}><circle cx="8" cy="12" r="4" /><path d="M12 12h9M18 12v3M15.5 12v2" /></svg>;
export const ICarpeta = (p: P) => <svg {...base(p)}><path d="M3 7.5V18a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 21 18V9a1.5 1.5 0 0 0-1.5-1.5H12L10 5H4.5A1.5 1.5 0 0 0 3 6.5z" /></svg>;
export const ICalendario = (p: P) => <svg {...base(p)}><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="m9 15 2 2 4-4" /></svg>;
export const ILibro = (p: P) => <svg {...base(p)}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></svg>;
export const IBoleta = (p: P) => <svg {...base(p)}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></svg>;
export const ISalir = (p: P) => <svg {...base(p)}><path d="M14 4h5v16h-5" /><path d="M10 8l-4 4 4 4M6 12h10" /></svg>;
export const IHerramienta = (p: P) => <svg {...base(p)}><path d="M14.5 5.5a4 4 0 0 0-5.3 5.2L4 16l4 4 5.3-5.2a4 4 0 0 0 5.2-5.3l-2.4 2.4-2.9-.7-.7-2.9z" /></svg>;
export const ICorazon = (p: P) => <svg {...base(p)}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>;
export const IFiesta = (p: P) => <svg {...base(p)}><path d="M4 20 9 7l8 8z" /><path d="M14 4v2M19 9h2M17.5 5.5 16 7M12 2.5l.5 1" /></svg>;
export const ICandado = (p: P) => <svg {...base(p)}><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /><path d="M12 14.5v2.5" /></svg>;
export const IRayo = (p: P) => <svg {...base(p)}><path d="M13 3 5 14h6l-1 7 8-11h-6z" /></svg>;
export const IEscudo = (p: P) => <svg {...base(p)}><path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6z" /><path d="m9 12 2 2 4-4" /></svg>;
export const IFoto = (p: P) => <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-8 8" /></svg>;
export const IBrujula = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></svg>;
