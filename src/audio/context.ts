/**
 * Un ÚNICO AudioContext para toda la app: lo comparten el synth (piano) y el
 * detector (tuner). Dos contextos separados se pisan (glitches al arrancar un
 * nodo en uno mientras el otro analiza el mic). El skill web-audio: "reuse ONE".
 *
 * Perezoso: se crea en el primer uso (que siempre es tras un gesto del usuario,
 * respetando la autoplay policy del browser).
 *
 * Todo lo que suena pasa por `getOutput()`: un gain maestro (volumen) antes de
 * `destination`. El dispositivo de salida se elige con `setSinkId` del contexto.
 * Volumen y salida se pueden fijar ANTES de que exista el contexto (los aplica
 * el store al cargar); se guardan acá y se aplican al crearlo.
 */
let shared: AudioContext | null = null;
let output: GainNode | null = null;
let volume = 1;
let sinkId = "";

/** `setSinkId` en AudioContext: Chromium 110+, todavía fuera de lib.dom. */
type SinkableContext = AudioContext & { setSinkId(id: string): Promise<void> };

/** WebView2 (Windows) lo soporta; WKWebView (macOS) no. */
export const canSelectOutput =
  typeof AudioContext !== "undefined" && "setSinkId" in AudioContext.prototype;

export function getAudioContext(): AudioContext {
  if (!shared) {
    shared = new AudioContext();
    if (sinkId) void applySink(shared);
  }
  return shared;
}

/** Nodo al que se conecta todo lo audible, en lugar de `ctx.destination`. */
export function getOutput(): GainNode {
  if (!output) {
    const ctx = getAudioContext();
    output = ctx.createGain();
    output.gain.value = volume;
    output.connect(ctx.destination);
  }
  return output;
}

/** Volumen maestro, 0–1. */
export function setOutputVolume(next: number): void {
  volume = next;
  if (output) output.gain.value = next;
}

/** `""` = salida del sistema. */
export function setOutputDevice(next: string): Promise<void> {
  sinkId = next;
  return shared ? applySink(shared) : Promise.resolve();
}

async function applySink(ctx: AudioContext): Promise<void> {
  if (!canSelectOutput) return;
  try {
    await (ctx as SinkableContext).setSinkId(sinkId);
  } catch {
    // El dispositivo guardado se desenchufó: mejor sonar por el del sistema que
    // quedar mudo.
    await (ctx as SinkableContext).setSinkId("");
  }
}
