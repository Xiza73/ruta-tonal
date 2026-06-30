/**
 * Síntesis del piano. Le das una nota (MIDI), suena.
 *
 * Apoyado en src/lib/notes.ts: la nota se traduce a Hz ahí, no acá. Este módulo
 * solo arma el grafo de Web Audio. El AudioContext es inyectable para poder
 * testear sin un contexto real (jsdom no tiene Web Audio).
 */

import { midiToFrequency } from "../lib/notes";

/** Rampas cortas para evitar los clicks de arrancar/cortar en seco. */
const ATTACK_S = 0.005;
const RELEASE_S = 0.15;
/** Ganancia maestra con headroom para varias notas a la vez. */
const MASTER_GAIN = 0.2;

export interface SynthOptions {
  /** "Tipo de sonido" configurable del teclado. */
  type?: OscillatorType;
  /** Inyectable para tests; en el browser se crea uno solo. */
  context?: AudioContext;
}

/** Una nota en curso. `release()` la suelta (key up). */
export interface Voice {
  release(): void;
}

export interface Synth {
  /** Dispara una nota y devuelve su voz para soltarla luego. */
  play(midi: number): Voice;
  /** Cambia el tipo de oscilador para las próximas notas. */
  setType(type: OscillatorType): void;
  /** Llamar tras un gesto del usuario (autoplay policy del browser). */
  resume(): Promise<void>;
  /** Libera el contexto y el grafo. */
  dispose(): void;
}

export function createSynth(options: SynthOptions = {}): Synth {
  const ctx = options.context ?? new AudioContext();
  let type: OscillatorType = options.type ?? "triangle";

  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ctx.destination);

  function play(midi: number): Voice {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.value = midiToFrequency(midi);

    const now = ctx.currentTime;
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(1, now + ATTACK_S);

    osc.connect(env).connect(master);
    osc.start(now);

    let released = false;
    return {
      release() {
        if (released) return;
        released = true;
        const t = ctx.currentTime;
        // ponytail: hold-then-ramp. cancelAndHoldAtTime sería más prolijo pero no
        // está en todos los browsers; esto evita el click igual.
        env.gain.cancelScheduledValues(t);
        env.gain.setValueAtTime(env.gain.value, t);
        env.gain.linearRampToValueAtTime(0, t + RELEASE_S);
        osc.stop(t + RELEASE_S);
        osc.onended = () => {
          osc.disconnect();
          env.disconnect();
        };
      },
    };
  }

  return {
    play,
    setType(next) {
      type = next;
    },
    resume: () => ctx.resume(),
    dispose() {
      master.disconnect();
      void ctx.close();
    },
  };
}
