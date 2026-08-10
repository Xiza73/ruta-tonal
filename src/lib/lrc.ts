/**
 * Parser del formato LRC (letra sincronizada), que es lo que devuelve LRCLIB
 * en `syncedLyrics`.
 *
 * Formato: `[mm:ss.xx] texto`, más tags de metadata como `[ar:artista]` que se
 * descartan. Una línea puede llevar varias marcas de tiempo cuando el mismo
 * texto se repite (estribillos).
 */

export interface LyricLine {
  /** Segundos desde el inicio del tema. */
  time: number;
  /** Texto de la línea. Vacío marca un interludio: acá se deja de cantar. */
  text: string;
}

/** `[mm:ss.xx]` o `[mm:ss]`. Los centésimos son opcionales. */
const TIMESTAMP = /\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g;

/**
 * Texto LRC → líneas ordenadas por tiempo.
 *
 * Las líneas de texto vacío SE CONSERVAN a propósito: marcan dónde termina de
 * cantarse la línea anterior, que es justo lo que necesita el módulo de letras
 * para no estirar una palabra sobre un interludio instrumental.
 */
export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];

  for (const raw of lrc.split(/\r?\n/)) {
    TIMESTAMP.lastIndex = 0;
    const stamps: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = TIMESTAMP.exec(raw)) !== null) {
      // Algunos archivos usan `mm:ss:xx` en vez de `mm:ss.xx`.
      stamps.push(Number(match[1]) * 60 + Number(match[2].replace(":", ".")));
    }
    if (stamps.length === 0) continue; // metadata (`[ar:…]`) o línea suelta

    const text = raw.replace(TIMESTAMP, "").trim();
    for (const time of stamps) lines.push({ time, text });
  }

  return lines.sort((a, b) => a.time - b.time);
}

/**
 * Tramo `[desde, hasta)` de cada línea, para poder pedirle la nota a
 * `noteInSpan`. El final de una línea es el inicio de la siguiente.
 */
export function lyricSpans(
  lines: LyricLine[],
  totalDuration: number,
): { from: number; to: number; text: string }[] {
  return lines
    .map((line, i) => ({
      from: line.time,
      to: lines[i + 1]?.time ?? totalDuration,
      text: line.text,
    }))
    .filter((span) => span.text.length > 0); // los interludios no se cantan
}
