/**
 * Detección de pitch OFFLINE: sobre un buffer ya decodificado, no sobre el mic.
 *
 * Misma regla de aceptación que el detector en vivo (readingToNote), pero
 * recorriendo el buffer por ventanas en vez de por frames de animación.
 * Base del módulo de letras: audio → curva de notas en el tiempo.
 */

import { PitchDetector as Pitchy } from "pitchy";
import type { DetectedNote } from "../lib/notes";
import { readingToNote, type PitchGateOptions } from "./pitch";

export interface PitchSample {
  /** Segundos desde el inicio del buffer (centro de la ventana). */
  time: number;
  note: DetectedNote | null;
}

export interface TrackPitchOptions extends PitchGateOptions {
  /** Muestras por ventana de análisis. Potencia de 2. */
  windowSize?: number;
  /** Avance entre ventanas. Menor = más resolución temporal y más costo. */
  hopSize?: number;
}

/**
 * Recorre el buffer y devuelve una nota (o null) por ventana.
 *
 * ponytail: single-thread, sincrónico. Una canción de 3 min son ~7700 ventanas
 * y corre en menos de un segundo. Si molesta en la UI, moverlo a un Worker.
 */
export function trackPitch(
  samples: Float32Array,
  sampleRate: number,
  options: TrackPitchOptions = {},
): PitchSample[] {
  const windowSize = options.windowSize ?? 2048;
  const hopSize = options.hopSize ?? 1024;
  if (sampleRate <= 0) throw new Error("sampleRate debe ser > 0");
  if (hopSize <= 0) throw new Error("hopSize debe ser > 0");

  const detector = Pitchy.forFloat32Array(windowSize);
  const track: PitchSample[] = [];

  for (let start = 0; start + windowSize <= samples.length; start += hopSize) {
    const window = samples.subarray(start, start + windowSize);
    const [frequency, clarity] = detector.findPitch(window, sampleRate);
    track.push({
      time: (start + windowSize / 2) / sampleRate,
      note: readingToNote(frequency, clarity, options),
    });
  }

  return track;
}
