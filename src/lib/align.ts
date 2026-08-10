/**
 * Cruza la letra correcta con los tiempos que sí corresponden a nuestro audio.
 *
 * El problema, medido: whisper acierta los TIEMPOS pero falla 1 de cada 5
 * PALABRAS; LRCLIB tiene el texto correcto pero sus marcas son de otra
 * grabación (8.5s de deriva entre la primera y la segunda mitad de un tema).
 *
 * Emparejar por posición no sirve: al primer error de whisper se corre todo y
 * ya no se recupera. Por eso se alinean las dos secuencias con
 * Needleman-Wunsch, que tolera inserciones y borrados.
 */

/** Palabra con tiempos, tal como la devuelve `transcribe_words`. */
export interface TimedWord {
  text: string;
  from: number;
  to: number;
}

/**
 * Vocales acentuadas del español → sin acento.
 *
 * Mapa explícito en vez de `normalize("NFD")` + barrer diacríticos: ese camino
 * descompone la Ñ en `n` + tilde combinante y la dejaría en `n`. En español la
 * ñ es letra propia — "año" y "ano" no son la misma palabra. Acá se conserva
 * sola, por no estar en el mapa.
 */
const SIN_ACENTO: Record<string, string> = {
  á: "a",
  é: "e",
  í: "i",
  ó: "o",
  ú: "u",
  ü: "u",
};

/**
 * Normaliza para comparar: sin acentos, sin puntuación, en minúscula.
 * "Corazón," y "corazon" tienen que emparejar.
 */
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[áéíóúü]/g, (vocal) => SIN_ACENTO[vocal])
    .replace(/[^\p{L}\p{N}]/gu, "");
}

const MATCH = 2;
const MISMATCH = -1;
const GAP = -1;

/**
 * Needleman-Wunsch entre la letra real y lo que transcribió whisper.
 *
 * Devuelve, para cada palabra de la letra, el índice de la palabra de whisper
 * que le corresponde, o `null` si whisper no la transcribió.
 */
export function matchWords(lyrics: string[], heard: string[]): (number | null)[] {
  const n = lyrics.length;
  const m = heard.length;
  const a = lyrics.map(normalizeWord);
  const b = heard.map(normalizeWord);

  // score[i][j] = mejor puntaje alineando los primeros i de la letra con los
  // primeros j de whisper.
  const score: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) score[i][0] = i * GAP;
  for (let j = 1; j <= m; j++) score[0][j] = j * GAP;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diagonal = score[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? MATCH : MISMATCH);
      score[i][j] = Math.max(diagonal, score[i - 1][j] + GAP, score[i][j - 1] + GAP);
    }
  }

  // Backtrack desde la esquina: solo se acepta el emparejamiento cuando el
  // texto coincide de verdad; un "mismatch" alinea posiciones pero no es
  // evidencia de que sea la misma palabra.
  const pairing = new Array<number | null>(n).fill(null);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const diagonal = score[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? MATCH : MISMATCH);
    if (score[i][j] === diagonal) {
      if (a[i - 1] === b[j - 1]) pairing[i - 1] = j - 1;
      i--;
      j--;
    } else if (score[i][j] === score[i - 1][j] + GAP) {
      i--;
    } else {
      j--;
    }
  }
  return pairing;
}

/**
 * Reparte en el tiempo las palabras que whisper no reconoció.
 *
 * Se interpolan entre las dos ancladas que las rodean; las que quedan antes de
 * la primera o después de la última ancla se apoyan en los límites del tramo.
 * Sin esto, una palabra sin match no tendría dónde ir.
 */
function fillGaps(
  words: (TimedWord | null)[],
  bounds: { from: number; to: number },
): TimedWord[] {
  const filled = [...words];
  let cursor = 0;
  while (cursor < filled.length) {
    if (filled[cursor]) {
      cursor++;
      continue;
    }
    const start = cursor;
    while (cursor < filled.length && !filled[cursor]) cursor++;
    const end = cursor; // primer índice con ancla, o el final

    const before = start > 0 ? filled[start - 1]!.to : bounds.from;
    const after = end < filled.length ? filled[end]!.from : bounds.to;
    const step = (after - before) / (end - start);
    for (let k = start; k < end; k++) {
      filled[k] = {
        text: "",
        from: before + step * (k - start),
        to: before + step * (k - start + 1),
      };
    }
  }
  return filled as TimedWord[];
}

export interface AlignOptions {
  /** Palabras de la letra correcta, en orden (de LRCLIB). */
  lyrics: string[];
  /** Lo que transcribió whisper, con tiempos anclados a nuestro audio. */
  heard: TimedWord[];
  /** Duración del audio. Se usa como borde derecho si no se pasa `bounds`. */
  duration: number;
  /**
   * Dónde empieza y termina el canto. Las palabras sin ancla en las puntas se
   * apoyan acá.
   *
   * Importa: si se deja el default `[0, duration]`, las palabras previas al
   * primer ancla se estiran desde el segundo 0, y en un tema que arranca a los
   * 24s eso son 24 segundos de error visible. Pasando el primer y último tramo
   * cantado de la traza de pitch, quedan donde corresponde.
   */
  bounds?: { from: number; to: number };
}

/**
 * Letra correcta + tiempos de nuestro audio.
 *
 * Cada palabra devuelta tiene el texto de LRCLIB y, cuando whisper la reconoció,
 * sus tiempos exactos. Las que no reconoció se interpolan entre vecinas.
 */
export function alignLyrics(options: AlignOptions): TimedWord[] {
  const { lyrics, heard, duration } = options;
  const bounds = options.bounds ?? { from: 0, to: duration };
  if (lyrics.length === 0) return [];
  if (heard.length === 0) {
    // Sin anclas no hay nada que alinear: repartir parejo es lo único honesto.
    const step = (bounds.to - bounds.from) / lyrics.length;
    return lyrics.map((text, i) => ({
      text,
      from: bounds.from + i * step,
      to: bounds.from + (i + 1) * step,
    }));
  }

  const pairing = matchWords(
    lyrics,
    heard.map((w) => w.text),
  );
  const anchored = pairing.map((j) => (j === null ? null : { ...heard[j] }));
  const filled = fillGaps(anchored, bounds);
  return filled.map((word, i) => ({ ...word, text: lyrics[i] }));
}

/** Cuántas palabras de la letra quedaron ancladas a un tiempo real. */
export function anchorRate(pairing: (number | null)[]): number {
  if (pairing.length === 0) return 0;
  return pairing.filter((p) => p !== null).length / pairing.length;
}
