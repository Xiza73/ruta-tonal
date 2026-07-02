/**
 * Perfil del teclado: data pura que describe un teclado configurable.
 *
 * Un "perfil" junta rango, notación, tipo de sonido y mapeo de teclas físicas.
 * Es solo un objeto → guardarlo/cargarlo después es trivial (no se hace acá).
 *
 * El keyMap mapea KeyboardEvent.code → OFFSET de semitonos desde range.low,
 * NO a un MIDI absoluto: así el mismo mapeo sirve para cualquier octava.
 */

import { midiToNote, type Note, type Notation } from "./notes";

export interface KeyboardProfile {
  name: string;
  /** Rango inclusivo en MIDI. */
  range: { low: number; high: number };
  notation: Notation;
  /** Tipo de sonido (OscillatorType para el synth del MVP). */
  soundType: OscillatorType;
  /** KeyboardEvent.code → offset de semitonos desde range.low. */
  keyMap: Record<string, number>;
}

export interface KeyboardKey extends Note {
  /** Tecla negra (sostenido) vs blanca. */
  isSharp: boolean;
  /** KeyboardEvent.code físico asignado, si hay. */
  code?: string;
}

/** Rango de `octaves` octavas desde una nota MIDI (inclusivo en ambos extremos). */
export function octaveRange(startMidi: number, octaves: number): { low: number; high: number } {
  return { low: startMidi, high: startMidi + 12 * octaves };
}

/** Notas del teclado de grave a aguda, con su tecla física asignada. */
export function keysForProfile(profile: KeyboardProfile): KeyboardKey[] {
  const offsetToCode = new Map<number, string>();
  for (const [code, offset] of Object.entries(profile.keyMap)) {
    if (!offsetToCode.has(offset)) offsetToCode.set(offset, code);
  }

  const keys: KeyboardKey[] = [];
  for (let midi = profile.range.low; midi <= profile.range.high; midi++) {
    const note = midiToNote(midi, profile.notation);
    keys.push({
      ...note,
      isSharp: note.name.includes("#"),
      code: offsetToCode.get(midi - profile.range.low),
    });
  }
  return keys;
}

/** Tecla física → MIDI según el perfil. `undefined` si esa tecla no está mapeada. */
export function midiForCode(profile: KeyboardProfile, code: string): number | undefined {
  const offset = profile.keyMap[code];
  return offset === undefined ? undefined : profile.range.low + offset;
}

/**
 * Mapeo default tipo GarageBand: fila base = blancas, fila de arriba = negras.
 * Una octava + el Do siguiente (offsets 0..12).
 */
export const DEFAULT_KEYMAP: Record<string, number> = {
  KeyA: 0, // C
  KeyW: 1, // C#
  KeyS: 2, // D
  KeyE: 3, // D#
  KeyD: 4, // E
  KeyF: 5, // F
  KeyT: 6, // F#
  KeyG: 7, // G
  KeyY: 8, // G#
  KeyH: 9, // A
  KeyU: 10, // A#
  KeyJ: 11, // B
  KeyK: 12, // C (octava siguiente)
};

/** Perfil inicial: una octava desde C4, notación científica, sonido triangle. */
export const DEFAULT_PROFILE: KeyboardProfile = {
  name: "Default",
  range: octaveRange(60, 1), // C4–C5
  notation: "scientific",
  soundType: "triangle",
  keyMap: DEFAULT_KEYMAP,
};

/** Ajustes configurables del teclado (lo que el usuario toca en el panel). */
export interface ProfileSettings {
  notation: Notation;
  /** Nota MIDI base (C de la octava más grave). */
  startMidi: number;
  /** Cantidad de octavas. */
  octaves: number;
  soundType: OscillatorType;
}

/** Construye un KeyboardProfile a partir de los ajustes + el keymap default. */
export function buildProfile(settings: ProfileSettings): KeyboardProfile {
  return {
    name: "Custom",
    range: octaveRange(settings.startMidi, settings.octaves),
    notation: settings.notation,
    soundType: settings.soundType,
    keyMap: DEFAULT_KEYMAP,
  };
}
