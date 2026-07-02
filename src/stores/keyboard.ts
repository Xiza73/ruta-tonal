import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildProfile, type KeyboardProfile } from "../lib/keyboard";
import type { Notation } from "../lib/notes";

interface KeyboardState {
  notation: Notation;
  octaves: number;
  startMidi: number;
  soundType: OscillatorType;
  setNotation: (notation: Notation) => void;
  setOctaves: (octaves: number) => void;
  setStartMidi: (startMidi: number) => void;
  setSoundType: (soundType: OscillatorType) => void;
}

/**
 * Config del teclado, compartida entre el panel y el piano. Persistida en
 * localStorage (offline-first): la configuración sobrevive al reiniciar.
 */
export const useKeyboardStore = create<KeyboardState>()(
  persist(
    (set) => ({
      notation: "scientific",
      octaves: 2,
      startMidi: 48, // C3
      soundType: "triangle",
      setNotation: (notation) => set({ notation }),
      setOctaves: (octaves) => set({ octaves }),
      setStartMidi: (startMidi) => set({ startMidi }),
      setSoundType: (soundType) => set({ soundType }),
    }),
    { name: "ruta-tonal-keyboard" },
  ),
);

/** Deriva el KeyboardProfile actual desde el store (selectores por campo). */
export function useKeyboardProfile(): KeyboardProfile {
  const notation = useKeyboardStore((s) => s.notation);
  const octaves = useKeyboardStore((s) => s.octaves);
  const startMidi = useKeyboardStore((s) => s.startMidi);
  const soundType = useKeyboardStore((s) => s.soundType);
  return buildProfile({ notation, startMidi, octaves, soundType });
}
