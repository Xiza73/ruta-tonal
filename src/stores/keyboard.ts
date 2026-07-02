import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildProfile, DEFAULT_KEYMAP, type KeyboardProfile } from "../lib/keyboard";
import type { Notation } from "../lib/notes";

interface KeyboardState {
  notation: Notation;
  octaves: number;
  startMidi: number;
  soundType: OscillatorType;
  /** Mapeo custom (tecla → offset); null = usar DEFAULT_KEYMAP. Persistido. */
  customKeyMap: Record<string, number> | null;
  /** Modo configuración de teclas: el piano no suena, se reasignan teclas. */
  configMode: boolean;
  setNotation: (notation: Notation) => void;
  setOctaves: (octaves: number) => void;
  setStartMidi: (startMidi: number) => void;
  setSoundType: (soundType: OscillatorType) => void;
  setConfigMode: (configMode: boolean) => void;
  /** Asigna una tecla física a un offset (una tecla por nota). */
  bindKey: (code: string, offset: number) => void;
  /** Vuelve al mapeo default. */
  resetKeyMap: () => void;
}

/**
 * Config del teclado, compartida entre panel y piano. Persistida en localStorage
 * (offline-first). `configMode` es transitorio: no se persiste (partialize).
 */
export const useKeyboardStore = create<KeyboardState>()(
  persist(
    (set) => ({
      notation: "scientific",
      octaves: 2,
      startMidi: 48, // C3
      soundType: "triangle",
      customKeyMap: null,
      configMode: false,
      setNotation: (notation) => set({ notation }),
      setOctaves: (octaves) => set({ octaves }),
      setStartMidi: (startMidi) => set({ startMidi }),
      setSoundType: (soundType) => set({ soundType }),
      setConfigMode: (configMode) => set({ configMode }),
      bindKey: (code, offset) =>
        set((s) => {
          const base = s.customKeyMap ?? DEFAULT_KEYMAP;
          // Una tecla por nota: soltamos la tecla previa de ese offset y el
          // binding previo de `code`, y asignamos code → offset.
          const next: Record<string, number> = {};
          for (const [c, o] of Object.entries(base)) {
            if (c !== code && o !== offset) next[c] = o;
          }
          next[code] = offset;
          return { customKeyMap: next };
        }),
      resetKeyMap: () => set({ customKeyMap: null }),
    }),
    {
      name: "ruta-tonal-keyboard",
      partialize: (s) => ({
        notation: s.notation,
        octaves: s.octaves,
        startMidi: s.startMidi,
        soundType: s.soundType,
        customKeyMap: s.customKeyMap,
      }),
    },
  ),
);

/** Deriva el KeyboardProfile actual desde el store (selectores por campo). */
export function useKeyboardProfile(): KeyboardProfile {
  const notation = useKeyboardStore((s) => s.notation);
  const octaves = useKeyboardStore((s) => s.octaves);
  const startMidi = useKeyboardStore((s) => s.startMidi);
  const soundType = useKeyboardStore((s) => s.soundType);
  const customKeyMap = useKeyboardStore((s) => s.customKeyMap);
  return buildProfile({
    notation,
    startMidi,
    octaves,
    soundType,
    keyMap: customKeyMap ?? DEFAULT_KEYMAP,
  });
}
