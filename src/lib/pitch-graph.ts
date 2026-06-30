/**
 * Geometría pura del gráfico de afinación (piano roll del tuner).
 *
 * El canvas es imperativo, pero estas dos reglas son data y se testean:
 * - continuousMidi: reconstruye el pitch continuo desde la nota detectada.
 * - midiToY: mapea un MIDI a su posición vertical (agudas arriba, graves abajo).
 */

import type { DetectedNote } from "./notes";

export interface NoteRange {
  low: number;
  high: number;
}

/**
 * Pitch continuo en MIDI (midi + cents/100), o null si no hay nota.
 * No necesitamos exponer frequencyToMidi: la nota ya trae midi + cents.
 */
export function continuousMidi(note: DetectedNote | null): number | null {
  return note === null ? null : note.midi + note.cents / 100;
}

/**
 * MIDI → posición vertical 0..1 dentro del rango visible.
 * 0 = nota más aguda (arriba), 1 = más grave (abajo) — como un piano roll.
 * Clampea fuera de rango a [0, 1].
 */
export function midiToY(midi: number, range: NoteRange): number {
  const span = range.high - range.low;
  if (span <= 0) return 0.5;
  const t = (midi - range.low) / span; // 0 = grave, 1 = aguda
  return Math.min(1, Math.max(0, 1 - t));
}

/**
 * Mediana de los valores. Rechaza outliers (ej. saltos de octava de un frame
 * suelto del detector) sin dejarse arrastrar como el promedio. Asume no vacío.
 */
export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Ventana visible de `span` semitonos centrada en `center`. */
export function visibleRange(center: number, span: number): NoteRange {
  const half = span / 2;
  return { low: center - half, high: center + half };
}

/**
 * Auto-scroll: mueve el centro suavemente hacia `target` (lerp), acotado a
 * `bounds` para que la ventana no se vaya a un rango no musical.
 */
export function followCenter(
  prev: number,
  target: number,
  smooth: number,
  bounds: NoteRange,
): number {
  const next = prev + (target - prev) * smooth;
  return Math.min(bounds.high, Math.max(bounds.low, next));
}
