/**
 * Teoría musical pura. Sin React, sin Web Audio — solo números.
 *
 * La unidad canónica es el número MIDI: un entero por nota (A4 = 69).
 * Frecuencia y nombre son proyecciones de ese entero. El piano (nota → sonido)
 * y el detector (sonido → nota) comparten este módulo.
 *
 * Referencia: ISO 16 — A4 = 440 Hz, semitono = factor 2^(1/12).
 */

export const A4_FREQUENCY = 440;
export const A4_MIDI = 69;

/** Notación de los nombres de nota. */
export type Notation = "scientific" | "solfege";

const NAMES: Record<Notation, readonly string[]> = {
  scientific: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
  solfege: ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"],
};

export interface Note {
  /** Número MIDI (entero). */
  midi: number;
  /** Nombre según la notación pedida, ej. "A" / "La". */
  name: string;
  /** Octava en notación científica (C4 = octava 4, A4 = octava 4). */
  octave: number;
  /** Etiqueta completa, ej. "A4" / "La4". */
  label: string;
}

export interface DetectedNote extends Note {
  /** Frecuencia de entrada en Hz. */
  frequency: number;
  /** Desviación respecto a la nota exacta, en cents (−50..+50). */
  cents: number;
}

/** MIDI → frecuencia en Hz. */
export function midiToFrequency(midi: number): number {
  return A4_FREQUENCY * 2 ** ((midi - A4_MIDI) / 12);
}

/** Frecuencia en Hz → MIDI continuo (no redondeado). */
export function frequencyToMidi(frequency: number): number {
  if (!(frequency > 0)) {
    throw new RangeError(`frequency debe ser > 0, recibí ${frequency}`);
  }
  return A4_MIDI + 12 * Math.log2(frequency / A4_FREQUENCY);
}

/** MIDI (entero) → nota con nombre y octava. */
export function midiToNote(midi: number, notation: Notation = "scientific"): Note {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const name = NAMES[notation][pitchClass];
  return { midi, name, octave, label: `${name}${octave}` };
}

/**
 * Frecuencia → nota más cercana + desviación en cents.
 * El corazón del detector: toma el Hz del micrófono y dice qué nota es.
 */
export function frequencyToNote(
  frequency: number,
  notation: Notation = "scientific",
): DetectedNote {
  const exactMidi = frequencyToMidi(frequency);
  const midi = Math.round(exactMidi);
  const cents = Math.round((exactMidi - midi) * 100);
  return { ...midiToNote(midi, notation), frequency, cents };
}
