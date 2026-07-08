/**
 * Motor de piano por MUESTRAS (smplr). Detrás de la MISMA interfaz `Synth` que
 * el oscilador, así el componente del piano no distingue uno de otro.
 *
 * Las muestras (un Steinway grabado) se cargan de un soundfont LOCAL en
 * public/soundfonts/ → funciona offline. Comparte el AudioContext único.
 */

import { Soundfont } from "smplr";
import { getAudioContext } from "./context";
import type { Synth, Voice } from "./synth";

/** Soundfont local (bundleado en public/). Sin internet. */
const SOUNDFONT_URL = "/soundfonts/acoustic_grand_piano-mp3.js";

export function createSampler(): Synth {
  const ctx = getAudioContext();
  // Empieza a cargar las muestras al crearse (preload).
  const piano = Soundfont(ctx, { instrumentUrl: SOUNDFONT_URL });

  return {
    play(midi: number): Voice {
      const stop = piano.start({ note: midi, velocity: 100 });
      let released = false;
      return {
        release() {
          if (released) return;
          released = true;
          stop();
        },
      };
    },
    setType() {
      // El sampler no tiene tipos de onda; no-op.
    },
    resume: () => ctx.resume(),
    dispose() {
      piano.stop();
      piano.disconnect();
    },
  };
}
