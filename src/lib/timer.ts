/**
 * Lógica del temporizador: duración, edición por segmentos y cuenta regresiva.
 *
 * Pura y testeable, separada de la UI como el resto de la lógica del proyecto.
 *
 * Sobre la cuenta: NO se acumulan ticks. Un `setInterval` de 1000 ms no dispara
 * cada 1000 ms sino "al menos" cada 1000, y el error se suma: a los 5 minutos ya
 * se atrasa varios segundos. Acá se guarda el instante de fin y cada frame se
 * calcula lo que falta contra el reloj. La deriva no existe porque nunca se
 * suma nada.
 */

/** Tope: dos dígitos por segmento. */
export const MAX_TOTAL_SECONDS = 99 * 60 + 59;

export type Segment = "minutes" | "seconds";

export interface Duration {
  minutes: number;
  seconds: number;
}

/** Segundos totales → minutos y segundos. */
export function splitDuration(total: number): Duration {
  const clamped = clampTotal(total);
  return { minutes: Math.floor(clamped / 60), seconds: clamped % 60 };
}

/** Siempre dos dígitos: `7` → `"07"`. */
export function formatSegment(value: number): string {
  return String(Math.max(0, Math.floor(value))).padStart(2, "0");
}

/** `"04:09"` a partir de segundos totales. */
export function formatDuration(total: number): string {
  const { minutes, seconds } = splitDuration(total);
  return `${formatSegment(minutes)}:${formatSegment(seconds)}`;
}

export function clampTotal(total: number): number {
  // Solo NaN necesita guarda: los infinitos los recorta bien Math.min/max, y
  // mandarlos a cero seria devolver el extremo contrario al que corresponde.
  if (Number.isNaN(total)) return 0;
  return Math.min(MAX_TOTAL_SECONDS, Math.max(0, Math.floor(total)));
}

/**
 * Mueve la duración con las flechas.
 *
 * Las flechas operan sobre el TOTAL, no sobre el segmento aislado: el segmento
 * solo decide de a cuánto se mueve. Así `04:59` + 1 segundo da `05:00` en vez
 * de quedarse trabado en 59, que es lo que pasa si cada segmento se topea solo.
 */
export function stepDuration(total: number, segment: Segment, delta: number): number {
  const step = segment === "minutes" ? 60 : 1;
  return clampTotal(total + delta * step);
}

/** Máximo de cada segmento al escribir. */
export function segmentMax(segment: Segment): number {
  return segment === "minutes" ? 99 : 59;
}

export interface DigitResult {
  /** Lo que se está escribiendo, hasta dos dígitos. */
  draft: string;
  /**
   * El segmento no admite más dígitos y hay que pasar al siguiente.
   *
   * Pasa con dos dígitos, pero también con UNO solo cuando ningún número de dos
   * dígitos puede empezar así: en segundos, un `7` solo puede ser `07`, porque
   * `70` se pasa de 59.
   */
  done: boolean;
}

/** Escribe un dígito en un segmento, al estilo de los campos de hora. */
export function typeDigit(draft: string, digit: string, max: number): DigitResult {
  if (!/^\d$/.test(digit)) return { draft, done: false };

  // Con dos dígitos ya escritos se empieza de nuevo: escribir es reemplazar.
  const base = draft.length >= 2 ? "" : draft;
  const candidate = base + digit;

  if (Number(candidate) > max) {
    // No entra: el dígito arranca un valor nuevo.
    return { draft: digit, done: Number(digit) * 10 > max };
  }
  return { draft: candidate, done: candidate.length === 2 || Number(candidate) * 10 > max };
}

/** Reemplaza un segmento dejando el otro como está. */
export function commitSegment(total: number, segment: Segment, value: number): number {
  const { minutes, seconds } = splitDuration(total);
  const safe = Math.max(0, Math.min(segmentMax(segment), Math.floor(value) || 0));
  return clampTotal(
    segment === "minutes" ? safe * 60 + seconds : minutes * 60 + safe,
  );
}

/**
 * Lo que falta, en segundos, calculado contra el reloj y no acumulando.
 *
 * `now` entra por parámetro para poder testear sin esperar.
 */
export function remainingSeconds(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

/** Fracción transcurrida (0..1), para el anillo de progreso. */
export function elapsedFraction(totalSeconds: number, remaining: number): number {
  if (totalSeconds <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - remaining / totalSeconds));
}
