/** Guardado diferido: espera `delayMs` tras el último cambio, y `flush` guarda ya lo pendiente (al salir de la app). */
export function createAutosaver<T>(save: (value: T) => void, delayMs: number) {
  let pending: { value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    pending = null;
  };

  const flush = () => {
    const current = pending;
    cancel();
    if (current) save(current.value);
  };

  const schedule = (value: T) => {
    if (timer !== null) clearTimeout(timer);
    pending = { value };
    timer = setTimeout(flush, delayMs);
  };

  return { schedule, flush, cancel };
}
