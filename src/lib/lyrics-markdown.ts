/**
 * La letra con sus notas, como Markdown.
 *
 * Markdown y no imagen: se busca, se edita, se versiona y se abre en cualquier
 * lado. Las notas van alineadas sobre las palabras dentro de un bloque de
 * código, así cualquier visor las muestra en monoespaciado y las columnas caen
 * donde tienen que caer.
 */

import type { LyricNote } from "./lyrics-pipeline";

export interface ExportMeta {
  artist: string;
  track: string;
  url: string;
  /** Fecha ya formateada por el llamador: este módulo no lee el reloj. */
  processedAt: string;
  anchored: number;
  withNote: number;
}

/** Corta la lista plana en versos. */
function byLine(words: LyricNote[]): LyricNote[][] {
  const lines: LyricNote[][] = [];
  for (const word of words) {
    if (lines.length === 0 || word.line !== lines[lines.length - 1][0].line) lines.push([]);
    lines[lines.length - 1].push(word);
  }
  return lines;
}

/**
 * Un verso como dos renglones: notas arriba, palabras abajo, en columnas.
 *
 * La nota se escribe UNA vez por tramo sostenido, sobre la primera palabra —
 * igual que en pantalla. Repetirla en cada palabra haría parecer que son notas
 * distintas.
 */
function renderLine(line: LyricNote[]): { notes: string; words: string } {
  let notes = "";
  let words = "";
  let previousLabel: string | null = null;

  for (const word of line) {
    const label = word.note?.label ?? null;
    // Solo se escribe al ABRIR el tramo; si la nota sigue igual, va en blanco.
    const head = label !== null && label !== previousLabel ? label : "";
    const width = Math.max(head.length, word.text.length);

    notes += head.padEnd(width) + " ";
    words += word.text.padEnd(width) + " ";
    previousLabel = label;
  }

  return { notes: notes.trimEnd(), words: words.trimEnd() };
}

/** Nombre de archivo seguro a partir de artista y título. */
export function exportFileName(artist: string, track: string): string {
  const clean = (value: string) =>
    value
      .trim()
      // Prohibidos en Windows y separadores de ruta: un NOMBRE no navega
      // directorios. Espacios y guiones se conservan, son parte del titulo.
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, " ")
      .replace(/^\.+/, "")
      .slice(0, 80)
      .trim();

  const artistPart = clean(artist);
  const trackPart = clean(track);
  const base = [artistPart, trackPart].filter(Boolean).join(" - ");
  return `${base || "letra"}.md`;
}

/** Documento Markdown completo. */
export function toMarkdown(words: LyricNote[], meta: ExportMeta): string {
  const header = [
    `# ${meta.track}`,
    "",
    `**${meta.artist}**`,
    "",
    `- Fuente: ${meta.url}`,
    `- Procesado: ${meta.processedAt}`,
    `- ${words.length} palabras · ${Math.round(meta.withNote * 100)}% con nota · ${Math.round(
      meta.anchored * 100,
    )}% con tiempo medido`,
    "",
  ];

  const body = byLine(words).flatMap((line) => {
    const { notes, words: text } = renderLine(line);
    return [notes, text, ""];
  });

  // El bloque de código fuerza monoespaciado; sin eso las columnas se pierden.
  return [...header, "```text", ...body, "```", ""].join("\n");
}
