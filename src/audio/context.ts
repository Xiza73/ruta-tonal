/**
 * Un ÚNICO AudioContext para toda la app: lo comparten el synth (piano) y el
 * detector (tuner). Dos contextos separados se pisan (glitches al arrancar un
 * nodo en uno mientras el otro analiza el mic). El skill web-audio: "reuse ONE".
 *
 * Perezoso: se crea en el primer uso (que siempre es tras un gesto del usuario,
 * respetando la autoplay policy del browser).
 */
let shared: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  shared ??= new AudioContext();
  return shared;
}
