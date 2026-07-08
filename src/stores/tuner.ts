import { create } from "zustand";
import { createPitchDetector, type MicPitchDetector } from "../audio/pitch";
import { continuousMidi, median } from "../lib/pitch-graph";
import { midiToNote, type DetectedNote } from "../lib/notes";

export const TUNER_CAPACITY = 300; // muestras en pantalla
const SMOOTH_WINDOW = 7; // mediana anti-salto-de-octava

/**
 * Buffer NO reactivo: lo lee el canvas cada frame; mutarlo no dispara render.
 * Vive a nivel módulo para poder separar el display (canvas) del control (mic).
 */
// Pre-lleno con null (largo fijo): las notas nacen a la derecha y scrollean a
// la izquierda; nunca "crecen desde la izquierda" al reiniciar.
export const pitchBuffer: (number | null)[] = new Array(TUNER_CAPACITY).fill(null);
let recent: number[] = [];
let detector: MicPitchDetector | null = null;

interface TunerState {
  listening: boolean;
  error: string | null;
  /** Nota actual (para a11y / texto); cambia solo al cambiar de nota. */
  label: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

export const useTunerStore = create<TunerState>((set, get) => ({
  listening: false,
  error: null,
  label: null,

  start: async () => {
    set({ error: null });
    if (!detector) {
      detector = createPitchDetector({
        onReading: (note: DetectedNote | null) => {
          const raw = continuousMidi(note);
          let smoothed: number | null;
          if (raw == null) {
            recent.length = 0;
            smoothed = null;
          } else {
            recent.push(raw);
            if (recent.length > SMOOTH_WINDOW) recent.shift();
            smoothed = median(recent);
          }
          pitchBuffer.push(smoothed);
          if (pitchBuffer.length > TUNER_CAPACITY) pitchBuffer.shift();

          // label (a11y) solo cuando cambia la nota → sin renders por frame.
          const label = smoothed === null ? null : midiToNote(Math.round(smoothed)).label;
          if (label !== get().label) set({ label });
        },
      });
    }
    try {
      await detector.start();
      set({ listening: true });
    } catch {
      set({ error: "No se pudo acceder al micrófono. Revisá los permisos." });
    }
  },

  stop: () => {
    detector?.stop();
    pitchBuffer.fill(null); // limpia sin cambiar el largo (playhead sigue a la derecha)
    recent = [];
    set({ listening: false, label: null });
  },
}));
