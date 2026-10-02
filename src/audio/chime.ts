/**
 * Aviso de fin del temporizador.
 *
 * Se sintetiza en vez de reproducir un archivo: dos osciladores cortos pesan
 * cero, no suman un asset al bundle y comparten el AudioContext que ya usan el
 * piano y el afinador.
 */

import { getAudioContext } from "./context";

/** Dos notas cortas, ascendentes: se distingue de una nota del piano. */
export function playChime(): void {
  const ctx = getAudioContext();
  void ctx.resume();

  const start = ctx.currentTime;
  // A5 y E6: un intervalo abierto, audible por encima de un instrumento.
  for (const [i, frequency] of [880, 1318.5].entries()) {
    const at = start + i * 0.18;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;

    // Envolvente con rampas: un corte seco produce un click audible.
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.25, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);

    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.2);
  }
}
