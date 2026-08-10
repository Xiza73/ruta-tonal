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
  /** Índice del verso de la letra al que pertenece. La letra tiene renglones. */
  line: number;
  /**
   * La nota no se midió en esta palabra: se dedujo porque quedó ENCERRADA entre
   * dos con la misma nota. Se marca para no hacer pasar por medición algo que
   * no lo es.
   */
  inferred: boolean;
}

/**
 * Rellena huecos de nota cuando una palabra queda entre dos que suenan IGUAL.
 *
 * Una consonante o una respiración corta el pitch en el medio de una nota
 * sostenida y deja un `null` que en pantalla es un guión. Si las dos vecinas del
 * mismo verso comparten nota, esa palabra se cantó en esa nota — es el mismo
 * criterio de interpolación entre anclas que ya se usa para los tiempos.
 *
 * Si las vecinas suenan distinto NO se inventa nada: el guión se queda.
 */
export function fillNoteGaps(words: LyricNote[]): LyricNote[] {
  return words.map((word, i) => {
    if (word.note) return word;
    const previous = words[i - 1];
    const next = words[i + 1];
    const sameLine = previous?.line === word.line && next?.line === word.line;
    const sameNote =
      previous?.note && next?.note && previous.note.label === next.note.label;
    if (!sameLine || !sameNote) return word;
    return { ...word, note: previous.note, inferred: true };
  });
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
  // Se aplana para alinear —Needleman-Wunsch trabaja sobre una secuencia— pero
  // se conserva a qué verso pertenece cada palabra. Perder eso deja la letra
  // como un chorro de palabras sin renglones.
  const flat: { text: string; line: number }[] = [];
  let lineIndex = 0;
  for (const line of parseLrc(found.syncedLyrics)) {
    const wordsOfLine = line.text.split(/\s+/).filter(Boolean);
    if (wordsOfLine.length === 0) continue; // interludio: no aporta renglón
    for (const text of wordsOfLine) flat.push({ text, line: lineIndex });
    lineIndex++;
  }
  if (flat.length === 0) throw new Error("La letra vino vacía.");
  const lyrics = flat.map((w) => w.text);

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
  const words = fillNoteGaps(
    aligned.map((word, i) => ({
      ...word,
      note: noteInSpan(track, word.from, word.to),
      line: flat[i].line,
      inferred: false,
    })),
  );

  return {
    words,
    anchored: anchorRate(pairing),
    withNote: words.filter((w) => w.note !== null).length / words.length,
    track,
  };
}
