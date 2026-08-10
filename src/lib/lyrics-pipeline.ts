/**
 * Orquesta las cinco etapas del módulo de letras.
 *
 * Vive acá y no en el componente por la convención del proyecto: la lógica
 * fuera de la UI, pura y testeable. Las dependencias entran por parámetro para
 * poder probarla sin Tauri ni red.
 */

import { noteInSpan, trackPitch, type PitchSample } from "../audio/offline-pitch";
import { alignLyrics, anchorRate, matchWords, type TimedWord } from "./align";
import { parseLrc } from "./lrc";
import type { DetectedNote } from "./notes";

/** Etapas, en orden. Las tres primeras son las lentas. */
export const STAGES = ["descarga", "separacion", "transcripcion", "letra", "alineado"] as const;
export type Stage = (typeof STAGES)[number];

export interface LyricNote {
  text: string;
  from: number;
  to: number;
  /** `null` cuando en ese tramo no hubo pitch claro (consonantes, respiración). */
  note: DetectedNote | null;
}

export interface PipelineResult {
  words: LyricNote[];
  /** Fracción de palabras que quedaron ancladas a un tiempo real de whisper. */
  anchored: number;
  /** Fracción de palabras a las que se les pudo asignar una nota. */
  withNote: number;
  track: PitchSample[];
}

/**
 * Dependencias externas. Se inyectan para poder testear la orquestación sin
 * levantar Tauri: cada una es un borde del sistema.
 */
export interface PipelineDeps {
  downloadAudio: (url: string) => Promise<string>;
  separateVocals: (audioPath: string) => Promise<string>;
  transcribeWords: (wavPath: string) => Promise<TimedWord[]>;
  findLyrics: (opts: {
    artist: string;
    track: string;
    durationSeconds: number;
  }) => Promise<{ syncedLyrics: string | null } | null>;
  /** Lee el wav de voz y lo decodifica a muestras mono. */
  loadSamples: (wavPath: string) => Promise<{ samples: Float32Array; sampleRate: number }>;
  onStage?: (stage: Stage) => void;
}

export interface PipelineInput {
  url: string;
  artist: string;
  track: string;
}

/**
 * Bordes del canto según la traza de pitch.
 *
 * NO se sacan de whisper: whisper alucina sobre la intro instrumental y su
 * primera palabra puede caer en 0.0s, con lo cual las palabras sin ancla se
 * estirarían desde el inicio del archivo.
 */
function sungBounds(track: PitchSample[], duration: number): { from: number; to: number } {
  const voiced = track.filter((s) => s.note !== null);
  if (voiced.length === 0) return { from: 0, to: duration };
  return { from: voiced[0].time, to: voiced[voiced.length - 1].time };
}

/** URL de YouTube → letra con la nota de cada palabra. */
export async function runLyricsPipeline(
  input: PipelineInput,
  deps: PipelineDeps,
): Promise<PipelineResult> {
  const stage = (s: Stage) => deps.onStage?.(s);

  stage("descarga");
  const audioPath = await deps.downloadAudio(input.url);

  stage("separacion");
  const vocalsPath = await deps.separateVocals(audioPath);

  stage("transcripcion");
  const heard = await deps.transcribeWords(vocalsPath);

  // La traza de pitch sale del MISMO stem de voz que transcribió whisper, así
  // los tiempos de los dos hablan del mismo audio.
  const { samples, sampleRate } = await deps.loadSamples(vocalsPath);
  const track = trackPitch(samples, sampleRate);
  const duration = samples.length / sampleRate;

  stage("letra");
  const found = await deps.findLyrics({
    artist: input.artist,
    track: input.track,
    durationSeconds: duration,
  });
  if (!found?.syncedLyrics) {
    throw new Error(
      "No encontré la letra de ese tema con una duración parecida. Revisá artista y título.",
    );
  }
  const lyrics = parseLrc(found.syncedLyrics)
    .flatMap((line) => line.text.split(/\s+/))
    .filter(Boolean);
  if (lyrics.length === 0) throw new Error("La letra vino vacía.");

  stage("alineado");
  const pairing = matchWords(
    lyrics,
    heard.map((w) => w.text),
  );
  const aligned = alignLyrics({
    lyrics,
    heard,
    duration,
    bounds: sungBounds(track, duration),
  });
  const words: LyricNote[] = aligned.map((word) => ({
    ...word,
    note: noteInSpan(track, word.from, word.to),
  }));

  return {
    words,
    anchored: anchorRate(pairing),
    withNote: words.filter((w) => w.note !== null).length / words.length,
    track,
  };
}
