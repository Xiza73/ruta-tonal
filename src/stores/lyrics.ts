import { create } from "zustand";
import {
  runLyricsPipeline,
  type LyricNote,
  type Stage,
} from "../lib/lyrics-pipeline";
import { tauriDeps } from "../lib/tauri-lyrics";

interface LyricsState {
  running: boolean;
  /** Etapa en curso, o `null` si no está corriendo. */
  stage: Stage | null;
  error: string | null;
  words: LyricNote[];
  /** Fracción anclada a un tiempo real de whisper; el resto se interpoló. */
  anchored: number;
  withNote: number;
  process: (input: { url: string; artist: string; track: string }) => Promise<void>;
  reset: () => void;
}

const EMPTY = {
  stage: null,
  error: null,
  words: [] as LyricNote[],
  anchored: 0,
  withNote: 0,
};

export const useLyricsStore = create<LyricsState>((set) => ({
  running: false,
  ...EMPTY,

  process: async (input) => {
    set({ running: true, ...EMPTY });
    try {
      const result = await runLyricsPipeline(input, {
        ...tauriDeps,
        onStage: (stage) => set({ stage }),
      });
      set({
        running: false,
        stage: null,
        words: result.words,
        anchored: result.anchored,
        withNote: result.withNote,
      });
    } catch (cause) {
      set({
        running: false,
        stage: null,
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  },

  reset: () => set({ running: false, ...EMPTY }),
}));
