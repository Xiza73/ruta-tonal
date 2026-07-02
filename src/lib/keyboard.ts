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
 * Mapeo default tipo tracker (2 octavas):
 * - Octava baja en la fila inferior (Z X C V B N M + S D G H J).
 * - Octava alta en la fila superior (Q W E R T Y U + 2 3 5 6 7).
 * Offsets 0..24. Más allá de 2 octavas no hay tecla física (se toca con mouse).
 */
export const DEFAULT_KEYMAP: Record<string, number> = {
  // Octava baja
  KeyZ: 0, // C
  KeyS: 1, // C#
  KeyX: 2, // D
  KeyD: 3, // D#
  KeyC: 4, // E
  KeyV: 5, // F
  KeyG: 6, // F#
  KeyB: 7, // G
  KeyH: 8, // G#
  KeyN: 9, // A
  KeyJ: 10, // A#
  KeyM: 11, // B
  // Octava alta
  KeyQ: 12, // C
  Digit2: 13, // C#
  KeyW: 14, // D
  Digit3: 15, // D#
  KeyE: 16, // E
  KeyR: 17, // F
  Digit5: 18, // F#
  KeyT: 19, // G
  Digit6: 20, // G#
  KeyY: 21, // A
  Digit7: 22, // A#
  KeyU: 23, // B
  KeyI: 24, // C (fin de la 2da octava)
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
