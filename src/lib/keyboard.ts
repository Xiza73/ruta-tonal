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

/** Tipo de sonido del teclado: oscilador (Web Audio) o piano por muestras. */
export type SoundType = OscillatorType | "piano";

export interface KeyboardProfile {
  name: string;
  /** Rango inclusivo en MIDI. */
  range: { low: number; high: number };
  notation: Notation;
  /** Tipo de sonido (OscillatorType para el synth del MVP). */
  soundType: SoundType;
  /** KeyboardEvent.code → offset de semitonos desde range.low. */
  keyMap: Record<string, number>;
}

export interface KeyboardKey extends Note {
  /** Tecla negra (sostenido) vs blanca. */
  isSharp: boolean;
  /** KeyboardEvent.code(s) físicos asignados a esta nota (puede haber más de uno). */
  codes: string[];
}

/** Rango de `octaves` octavas desde una nota MIDI (inclusivo en ambos extremos). */
export function octaveRange(startMidi: number, octaves: number): { low: number; high: number } {
  return { low: startMidi, high: startMidi + 12 * octaves };
}

/** Notas del teclado de grave a aguda, con su tecla física asignada. */
export function keysForProfile(profile: KeyboardProfile): KeyboardKey[] {
  // Un offset puede tener varias teclas físicas (varias keys → misma nota).
  const offsetToCodes = new Map<number, string[]>();
  for (const [code, offset] of Object.entries(profile.keyMap)) {
    const list = offsetToCodes.get(offset);
    if (list) list.push(code);
    else offsetToCodes.set(offset, [code]);
  }

  const keys: KeyboardKey[] = [];
  for (let midi = profile.range.low; midi <= profile.range.high; midi++) {
    const note = midiToNote(midi, profile.notation);
    keys.push({
      ...note,
      isSharp: note.name.includes("#"),
      codes: offsetToCodes.get(midi - profile.range.low) ?? [],
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
  soundType: SoundType;
  /** Mapeo de teclas; por defecto DEFAULT_KEYMAP. */
  keyMap?: Record<string, number>;
}

/** Construye un KeyboardProfile a partir de los ajustes. */
export function buildProfile(settings: ProfileSettings): KeyboardProfile {
  return {
    name: "Custom",
    range: octaveRange(settings.startMidi, settings.octaves),
    notation: settings.notation,
    soundType: settings.soundType,
    keyMap: settings.keyMap ?? DEFAULT_KEYMAP,
  };
}

/** Símbolos cortos para teclas no alfanuméricas (KeyboardEvent.code → glifo). */
const SPECIAL_KEY_LABELS: Record<string, string> = {
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backslash: "\\",
  BracketLeft: "[",
  BracketRight: "]",
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  Space: "␣",
};

/** Etiqueta corta de un KeyboardEvent.code: "KeyZ" → "Z", "Semicolon" → ";". */
export function keyLabel(code: string): string {
  return SPECIAL_KEY_LABELS[code] ?? code.replace(/^Key/, "").replace(/^Digit/, "");
}

/** Snapshot de la config del teclado (lo que compone un perfil). */
export interface ConfigSnapshot {
  notation: Notation;
  octaves: number;
  startMidi: number;
  soundType: SoundType;
  customKeyMap: Record<string, number> | null;
}

/** Un perfil guardado: un snapshot con id y nombre. */
export interface Profile extends ConfigSnapshot {
  id: string;
  name: string;
}

/** Igualdad de dos keymaps (null = default). */
export function keyMapEqual(
  a: Record<string, number> | null,
  b: Record<string, number> | null,
): boolean {
  if (a === null || b === null) return a === b;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((k) => a[k] === b[k]);
}

/** ¿La config actual coincide con la de un perfil guardado? */
export function configMatchesProfile(c: ConfigSnapshot, p: Profile): boolean {
  return (
    c.notation === p.notation &&
    c.octaves === p.octaves &&
    c.startMidi === p.startMidi &&
    c.soundType === p.soundType &&
    keyMapEqual(c.customKeyMap, p.customKeyMap)
  );
}
