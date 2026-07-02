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
import { getAudioContext } from "./context";

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
  /** Detiene el loop y libera el micrófono. El AudioContext es compartido: no se cierra. */
  stop(): void;
}

const FFT_SIZE = 2048;

export function createPitchDetector(options: PitchDetectorOptions): MicPitchDetector {
  let stream: MediaStream | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let rafId: number | null = null;

  async function start() {
    if (stream) return; // ya corriendo
    // Señal cruda: desactivamos el procesado del browser. Para un afinador
    // queremos el audio más fiel posible; AEC/NS/AGC distorsionan (sobre todo
    // los agudos) y arruinan la precisión del pitch.
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    const ctx = getAudioContext(); // compartido con el synth
    await ctx.resume();
    source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    source.connect(analyser); // NO a destination → evita el loop de feedback

    const detector = Pitchy.forFloat32Array(analyser.fftSize);
    const input = new Float32Array(detector.inputLength);

    const tick = () => {
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
    source?.disconnect();
    source = null;
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  }

  return { start, stop };
}
