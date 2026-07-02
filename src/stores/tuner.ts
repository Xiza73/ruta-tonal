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
export const pitchBuffer: (number | null)[] = [];
let recent: number[] = [];
let detector: MicPitchDetector | null = null;

interface TunerState {
  listening: boolean;
  error: string | null;
  /** Nota actual (para a11y / texto); cambia poco, no por frame. */
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

          const next = smoothed === null ? null : midiToNote(Math.round(smoothed)).label;
          if (next !== get().label) set({ label: next });
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
    pitchBuffer.length = 0;
    recent = [];
    set({ listening: false, label: null });
  },
}));
