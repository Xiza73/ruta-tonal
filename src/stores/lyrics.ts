import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { exportFileName, toMarkdown } from "../lib/lyrics-markdown";
import { runLyricsPipeline, type LyricNote, type Stage } from "../lib/lyrics-pipeline";
import { tauriDeps } from "../lib/tauri-lyrics";

export interface LyricsInput {
  url: string;
  artist: string;
  track: string;
}

interface LyricsState {
  running: boolean;
  /** Etapa en curso, o `null` si no está corriendo. */
  stage: Stage | null;
  error: string | null;
  words: LyricNote[];
  /** Fracción anclada a un tiempo real de whisper; el resto se interpoló. */
  anchored: number;
  withNote: number;
  /** Con qué se procesó lo que está en pantalla. Hace falta para exportar. */
  input: LyricsInput | null;

  /** Carpeta de exportación. Se persiste: se elige una vez, no en cada canción. */
  exportDir: string | null;
  /** Ruta del último archivo escrito, para confirmarlo en pantalla. */
  exportedAt: string | null;

  process: (input: LyricsInput) => Promise<void>;
  pickExportDir: () => Promise<void>;
  exportMarkdown: () => Promise<void>;
  openExportDir: () => Promise<void>;
  reset: () => void;
}

const EMPTY = {
  stage: null,
  error: null,
  words: [] as LyricNote[],
  anchored: 0,
  withNote: 0,
  exportedAt: null,
};

export const useLyricsStore = create<LyricsState>()(
  persist(
    (set, get) => ({
      running: false,
      input: null,
      exportDir: null,
      ...EMPTY,

      process: async (input) => {
        set({ running: true, input, ...EMPTY });
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

      pickExportDir: async () => {
        const dir = await invoke<string | null>("pick_export_dir");
        if (dir) set({ exportDir: dir, error: null });
      },

      exportMarkdown: async () => {
        const { words, input, anchored, withNote } = get();
        let { exportDir } = get();
        if (words.length === 0 || !input) return;

        // Si todavía no eligió carpeta, se la pide en el momento en vez de
        // fallar: exportar es la intención, elegir dónde es el trámite.
        if (!exportDir) {
          await get().pickExportDir();
          exportDir = get().exportDir;
          if (!exportDir) return; // canceló
        }

        try {
          const markdown = toMarkdown(words, {
            ...input,
            processedAt: new Date().toISOString().slice(0, 10),
            anchored,
            withNote,
          });
          const path = await invoke<string>("save_lyrics", {
            dir: exportDir,
            fileName: exportFileName(input.artist, input.track),
            contents: markdown,
          });
          set({ exportedAt: path, error: null });
        } catch (cause) {
          set({ error: cause instanceof Error ? cause.message : String(cause) });
        }
      },

      openExportDir: async () => {
        const { exportDir } = get();
        if (!exportDir) return;
        try {
          await invoke("open_export_dir", { dir: exportDir });
        } catch (cause) {
          set({ error: cause instanceof Error ? cause.message : String(cause) });
        }
      },

      reset: () => set({ running: false, input: null, ...EMPTY }),
    }),
    {
      name: "ruta-tonal-lyrics",
      // Solo la carpeta sobrevive al cierre. El resultado de una canción no:
      // ocuparía megas en localStorage y se regenera procesando de nuevo.
      partialize: (state) => ({ exportDir: state.exportDir }),
    },
  ),
);
