import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildProfile, DEFAULT_KEYMAP, type KeyboardProfile, type Profile } from "../lib/keyboard";
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
  /** Perfiles guardados (config completa con nombre). Persistidos. */
  profiles: Profile[];
  setNotation: (notation: Notation) => void;
  setOctaves: (octaves: number) => void;
  setStartMidi: (startMidi: number) => void;
  setSoundType: (soundType: OscillatorType) => void;
  setConfigMode: (configMode: boolean) => void;
  /** Asigna una tecla física a un offset (una tecla por nota). */
  bindKey: (code: string, offset: number) => void;
  /** Vuelve al mapeo default. */
  resetKeyMap: () => void;
  /** Guarda la config actual como un perfil nombrado. */
  saveProfile: (name: string) => void;
  /** Carga un perfil guardado en la config actual. */
  loadProfile: (id: string) => void;
  /** Borra un perfil guardado. */
  deleteProfile: (id: string) => void;
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
      profiles: [],
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
      saveProfile: (name) =>
        set((s) => ({
          profiles: [
            ...s.profiles,
            {
              id: crypto.randomUUID(),
              name,
              notation: s.notation,
              octaves: s.octaves,
              startMidi: s.startMidi,
              soundType: s.soundType,
              customKeyMap: s.customKeyMap,
            },
          ],
        })),
      loadProfile: (id) =>
        set((s) => {
          const p = s.profiles.find((x) => x.id === id);
          if (!p) return {};
          return {
            notation: p.notation,
            octaves: p.octaves,
            startMidi: p.startMidi,
            soundType: p.soundType,
            customKeyMap: p.customKeyMap,
          };
        }),
      deleteProfile: (id) =>
        set((s) => ({ profiles: s.profiles.filter((x) => x.id !== id) })),
    }),
    {
      name: "ruta-tonal-keyboard",
      partialize: (s) => ({
        notation: s.notation,
        octaves: s.octaves,
        startMidi: s.startMidi,
        soundType: s.soundType,
        customKeyMap: s.customKeyMap,
        profiles: s.profiles,
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
