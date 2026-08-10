/**
 * Cliente de LRCLIB (https://lrclib.net) — letra sincronizada, gratis y sin API key.
 *
 * Va en el frontend y no en Rust a propósito: LRCLIB responde con
 * `access-control-allow-origin: *`, así que `fetch` alcanza. Cero código de
 * backend, cero permisos de capability.
 *
 * Es la ÚNICA parte online del módulo. El resto del pipeline es local.
 */

export interface LrclibTrack {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string | null;
  /** Segundos. Puede venir con decimales. */
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  /** Formato LRC. `null` si solo hay letra sin sincronizar. */
  syncedLyrics: string | null;
}

const API = "https://lrclib.net/api";

/**
 * Tolerancia por default al elegir versión, en segundos.
 *
 * Medido: "Labios Rotos" de Zoé tiene 20 versiones en LRCLIB, de 242 a 263s
 * (estudio, MTV Unplugged, ediciones deluxe). Agarrar la equivocada desalinea
 * la letra entera y en silencio, así que se descarta lo que no encaje.
 */
const DEFAULT_TOLERANCE = 3;

/**
 * Elige la versión cuya duración más se acerca a la del audio que tenemos.
 *
 * Puro y testeable: acá está la regla que evita mezclar la grabación en vivo
 * con la de estudio. `/api/get` de LRCLIB matchea por nombre y devuelve
 * cualquier álbum, por eso no alcanza con confiar en él.
 */
export function pickByDuration(
  candidates: LrclibTrack[],
  durationSeconds: number,
  toleranceSeconds: number = DEFAULT_TOLERANCE,
): LrclibTrack | null {
  const usable = candidates.filter((c) => !c.instrumental && c.syncedLyrics);
  if (usable.length === 0) return null;

  let best: LrclibTrack | null = null;
  let bestDelta = Infinity;
  for (const candidate of usable) {
    const delta = Math.abs(candidate.duration - durationSeconds);
    if (delta < bestDelta) [best, bestDelta] = [candidate, delta];
  }
  return bestDelta <= toleranceSeconds ? best : null;
}

export interface FindLyricsOptions {
  artist: string;
  track: string;
  /** Duración del audio que tenemos, en segundos. Es lo que desempata. */
  durationSeconds: number;
  toleranceSeconds?: number;
  signal?: AbortSignal;
}

/**
 * Busca la letra sincronizada de un tema. `null` si no hay ninguna versión que
 * coincida en duración — mejor sin letra que con la letra de otra grabación.
 */
export async function findSyncedLyrics(
  options: FindLyricsOptions,
): Promise<LrclibTrack | null> {
  const query = new URLSearchParams({
    artist_name: options.artist,
    track_name: options.track,
  });

  const response = await fetch(`${API}/search?${query}`, { signal: options.signal });
  if (!response.ok) {
    throw new Error(`LRCLIB respondió ${response.status} ${response.statusText}`);
  }

  const candidates: LrclibTrack[] = await response.json();
  return pickByDuration(candidates, options.durationSeconds, options.toleranceSeconds);
}
