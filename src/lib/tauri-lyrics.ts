/**
 * Puente entre el pipeline de letras y el backend de Tauri.
 *
 * Aislado en su propio módulo para que `lyrics-pipeline.ts` siga siendo puro y
 * testeable sin levantar la app.
 */

import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { getAudioContext } from "../audio/context";
import type { TimedWord } from "./align";
import { findSyncedLyrics } from "./lrclib";
import type { PipelineDeps } from "./lyrics-pipeline";

/**
 * Lee el stem de voz desde el disco y lo decodifica.
 *
 * Pasa por el protocolo `asset` de Tauri (habilitado en tauri.conf con scope
 * `$APPCACHE/**`): el WebView no puede abrir rutas del filesystem, pero sí
 * puede pedir esa URL. Después `decodeAudioData` hace el resto — el mismo
 * camino que ya usa el resto del audio de la app.
 */
async function loadSamples(wavPath: string) {
  const response = await fetch(convertFileSrc(wavPath));
  if (!response.ok) throw new Error(`No pude leer el stem de voz: ${response.status}`);
  const decoded = await getAudioContext().decodeAudioData(await response.arrayBuffer());
  // Mono: el pitch se mide sobre un canal, y la voz separada viene centrada.
  return { samples: decoded.getChannelData(0), sampleRate: decoded.sampleRate };
}

/** Dependencias reales del pipeline. Tauri mapea camelCase → snake_case solo. */
export const tauriDeps: Omit<PipelineDeps, "onStage"> = {
  downloadAudio: (url) => invoke<string>("download_audio", { url }),
  separateVocals: (audioPath) => invoke<string>("separate_vocals", { path: audioPath }),
  transcribeWords: (wavPath) => invoke<TimedWord[]>("transcribe_words", { wavPath }),
  findLyrics: (opts) => findSyncedLyrics(opts),
  loadSamples,
};
