import { create } from "zustand";
import { persist } from "zustand/middleware";
import { listMicrophones, resolveDeviceId, type Microphone } from "../audio/devices";
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
/** Con qué micrófono se creó el detector vigente, para saber si hay que rehacerlo. */
let detectorDeviceId: string | undefined;

interface TunerState {
  listening: boolean;
  error: string | null;
  /** Nota actual (para a11y / texto); cambia solo al cambiar de nota. */
  label: string | null;
  /** Micrófonos conectados. Se llena con `refreshDevices`. */
  devices: Microphone[];
  /** Micrófono elegido, persistido. `null` = el que elija el sistema. */
  deviceId: string | null;
  start: () => Promise<void>;
  stop: () => void;
  refreshDevices: () => Promise<void>;
  selectDevice: (deviceId: string | null) => Promise<void>;
}

export const useTunerStore = create<TunerState>()(
  persist(
    (set, get) => {
      /** Detector para el micrófono pedido, reusando el vigente si coincide. */
      function ensureDetector(deviceId: string | undefined): MicPitchDetector {
        if (detector && detectorDeviceId === deviceId) return detector;
        detector?.stop();
        detectorDeviceId = deviceId;
        detector = createPitchDetector({
          deviceId,
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
        return detector;
      }

      return {
        listening: false,
        error: null,
        label: null,
        devices: [],
        deviceId: null,

        start: async () => {
          set({ error: null });
          // Se refresca antes de arrancar: el micrófono guardado puede haberse
          // desenchufado desde la última sesión.
          await get().refreshDevices();
          const wanted = resolveDeviceId(get().devices, get().deviceId);
          try {
            await ensureDetector(wanted).start();
            set({ listening: true });
            // Recién con el permiso dado el browser expone los nombres reales,
            // así que vale la pena volver a pedirlos.
            await get().refreshDevices();
          } catch {
            set({ error: "No se pudo acceder al micrófono. Revisá los permisos." });
          }
        },

        stop: () => {
          detector?.stop();
          pitchBuffer.fill(null); // limpia sin cambiar el largo (playhead a la derecha)
          recent = [];
          set({ listening: false, label: null });
        },

        refreshDevices: async () => {
          try {
            set({ devices: await listMicrophones() });
          } catch {
            set({ devices: [] });
          }
        },

        selectDevice: async (deviceId) => {
          const wasListening = get().listening;
          if (wasListening) get().stop();
          set({ deviceId });
          // Reanudar solo si ya estaba escuchando: elegir micrófono no debería
          // encender el detector por su cuenta.
          if (wasListening) await get().start();
        },
      };
    },
    {
      name: "ruta-tonal-tuner",
      // Solo la elección de micrófono sobrevive al cierre; la lista se
      // reconstruye porque los dispositivos cambian entre sesiones.
      partialize: (state) => ({ deviceId: state.deviceId }),
    },
  ),
);
