/** `1 vértice`, `0 vértices`, `5 vértices`: el singular solo para 1. */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Resumen de tamaño, p. ej. `5 vértices · 5 aristas`. */
export function countsLabel(vertices: number, edges: number): string {
  return `${plural(vertices, 'vértice', 'vértices')} · ${plural(edges, 'arista', 'aristas')}`;
}

/** Une frases en un texto para lectores de pantalla, cada una con un solo signo de cierre (`.`, `?` o `!`). */
export function sentences(...parts: string[]): string {
  return parts.map((part) => (/[.?!]$/.test(part) ? part : `${part}.`)).join(' ');
}

/** `A`, `A y B`, `A, B y C`. Ante sonido i la conjunción es "e" (`E, F e I`), como pide la RAE. */
export function joinSpanish(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  const last = items[items.length - 1];
  const conjunction = /^(?:[iíIÍ]|[hH][iíIÍ](?![aeoáéó]))/.test(last) ? 'e' : 'y';
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${last}`;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const pad2 = (n: number) => String(n).padStart(2, '0');
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Hoy, 14:05", "Ayer, 09:30" o "27 oct 2026", en hora local. Sin `Intl`, para no depender de la configuración de Hermes. */
export function formatSavedDate(iso: string, now: Date): string {
  const date = new Date(iso);
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  if (sameDay(date, now)) return `Hoy, ${time}`;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(date, yesterday)) return `Ayer, ${time}`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
