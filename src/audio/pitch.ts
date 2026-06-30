/**
 * Detector de pitch por micrófono (sección superior).
 *
 * Dos partes:
 * - readingToNote: PURA y testeable. Decide si una lectura cruda (Hz + clarity)
 *   es una nota real o basura (silencio/ruido/fuera de rango).
 * - createPitchDetector: el motor con Web Audio (mic → AnalyserNode → pitchy).
 *   Side-effectful; la lógica que importa está en readingToNote.
 *
 * Apoyado en notes.ts (frequencyToNote) y en el skill web-audio.
 */

import { PitchDetector as Pitchy } from "pitchy";
import { frequencyToNote, type DetectedNote, type Notation } from "../lib/notes";

export interface PitchGateOptions {
  notation?: Notation;
  /** Clarity mínima (0..1) para aceptar la lectura. Debajo = silencio/ruido. */
  clarityThreshold?: number;
  /** Rango plausible en Hz; filtra lo que no es musical. */
  minFrequency?: number;
  maxFrequency?: number;
}

const DEFAULTS = {
  notation: "scientific" as Notation,
  clarityThreshold: 0.9,
  minFrequency: 50, // ~G1
  maxFrequency: 2000, // ~B6
};

/**
 * Lectura cruda → nota, o `null` si no hay nota clara.
 * Esta es la regla que evita "ver" notas en el silencio. Pura y testeable.
 */
export function readingToNote(
  frequency: number,
  clarity: number,
  options: PitchGateOptions = {},
): DetectedNote | null {
  const o = { ...DEFAULTS, ...options };
  if (clarity < o.clarityThreshold) return null;
  if (frequency < o.minFrequency || frequency > o.maxFrequency) return null;
  return frequencyToNote(frequency, o.notation);
}

export interface PitchDetectorOptions extends PitchGateOptions {
  /** Llamado en cada frame con la nota detectada (o null si no hay). */
  onReading: (note: DetectedNote | null) => void;
}

export interface MicPitchDetector {
  /** Pide permiso de micrófono y arranca el loop. Llamar tras un gesto del usuario. */
  start(): Promise<void>;
  /** Detiene el loop, libera el micrófono y cierra el contexto. */
  stop(): void;
}

const FFT_SIZE = 2048;

export function createPitchDetector(options: PitchDetectorOptions): MicPitchDetector {
  let ctx: AudioContext | null = null;
  let stream: MediaStream | null = null;
  let rafId: number | null = null;

  async function start() {
    if (ctx) return; // ya corriendo
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    source.connect(analyser); // NO a destination → evita el loop de feedback

    const detector = Pitchy.forFloat32Array(analyser.fftSize);
    const input = new Float32Array(detector.inputLength);

    const tick = () => {
      if (!ctx) return;
      analyser.getFloatTimeDomainData(input);
      const [pitch, clarity] = detector.findPitch(input, ctx.sampleRate);
      options.onReading(readingToNote(pitch, clarity, options));
      rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  function stop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    void ctx?.close();
    ctx = null;
  }

  return { start, stop };
}
