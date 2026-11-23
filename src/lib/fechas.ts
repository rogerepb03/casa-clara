// Utilidades de fecha en hora local (sin librerías).
// Las fechas de negocio se guardan como 'YYYY-MM-DD' (igual que en PostgreSQL).

export function aISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function deISO(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function sumarDias(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

export function sumarMeses(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const ultimo = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(d.getDate(), ultimo));
  return r;
}

export function inicioMes(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function claveMes(s: string): string {
  return s.slice(0, 7);
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((deISO(hasta).getTime() - deISO(desde).getTime()) / 86_400_000);
}

/** Lunes de la semana de la fecha (semana chilena empieza el lunes). */
export function inicioSemana(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dia = (r.getDay() + 6) % 7;
  r.setDate(r.getDate() - dia);
  return r;
}

export function fechaCorta(s: string | null | undefined): string {
  if (!s) return '—';
  return deISO(s).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).replace('.', '');
}

export function fechaLarga(s: string | null | undefined): string {
  if (!s) return '—';
  return deISO(s).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
}

export function nombreMes(clave: string, corto = false): string {
  const d = deISO(`${clave}-01`);
  return d.toLocaleDateString('es-CL', { month: corto ? 'short' : 'long' }).replace('.', '');
}

export function cuandoVence(fecha: string, hoy: string): string {
  const n = diasEntre(hoy, fecha);
  if (n < -1) return `atrasado ${-n} días`;
  if (n === -1) return 'venció ayer';
  if (n === 0) return 'vence hoy';
  if (n === 1) return 'vence mañana';
  return `en ${n} días`;
}
