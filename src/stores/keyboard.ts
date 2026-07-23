import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  buildProfile,
  DEFAULT_KEYMAP,
  type KeyboardProfile,
  type Profile,
  type SoundType,
} from "../lib/keyboard";
import type { Notation } from "../lib/notes";

interface KeyboardState {
  notation: Notation;
  octaves: number;
  startMidi: number;
  soundType: SoundType;
  /** Mapeo custom (tecla → offset); null = usar DEFAULT_KEYMAP. Persistido. */
  customKeyMap: Record<string, number> | null;
  /** Modo configuración de teclas: el piano no suena, se reasignan teclas. */
  configMode: boolean;
  /** Perfiles guardados (config completa con nombre). Persistidos. */
  profiles: Profile[];
  setNotation: (notation: Notation) => void;
  setOctaves: (octaves: number) => void;
  setStartMidi: (startMidi: number) => void;
  setSoundType: (soundType: SoundType) => void;
  setConfigMode: (configMode: boolean) => void;
  /**
   * Toggle de una tecla física sobre un offset. Una tecla dispara UNA nota
   * (si estaba en otra, se mueve), pero una nota admite VARIAS teclas. Si la
   * tecla ya estaba en esta nota, se libera.
   */
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
      soundType: "piano",
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
          const next: Record<string, number> = { ...base };
          if (next[code] === offset) {
            // Ya estaba en esta nota → toggle off (la liberamos).
            delete next[code];
          } else {
            // Agrega o mueve: la tecla queda en UNA sola nota, pero la nota
            // puede tener varias teclas (no expulsamos las otras del offset).
            next[code] = offset;
          }
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
