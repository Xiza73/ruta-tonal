import { describe, expect, it } from "vitest";
import { exportFileName, toMarkdown, type ExportMeta } from "./lyrics-markdown";
import type { LyricNote } from "./lyrics-pipeline";
import { frequencyToNote } from "./notes";

const HZ: Record<string, number> = { C4: 261.63, D4: 293.66, B3: 246.94 };

function word(text: string, note: string | null, line = 0): LyricNote {
  return {
    text,
    from: 0,
    to: 1,
    line,
    inferred: false,
    note: note ? frequencyToNote(HZ[note], "scientific") : null,
  };
}

const META: ExportMeta = {
  artist: "Radiohead",
  track: "Karma Police",
  url: "https://www.youtube.com/watch?v=1uYWYWPc9HU",
  processedAt: "2026-08-10",
  anchored: 0.28,
  withNote: 0.85,
};

describe("exportFileName", () => {
  it("arma el nombre con artista y título", () => {
    expect(exportFileName("Radiohead", "Karma Police")).toBe("Radiohead - Karma Police.md");
  });

  it("conserva espacios y guiones: son parte del título", () => {
    expect(exportFileName("Zoé", "Labios Rotos")).toBe("Zoé - Labios Rotos.md");
  });

  it("saca los caracteres prohibidos en Windows", () => {
    expect(exportFileName('AC/DC', 'Hell: "Bells"?')).toBe("ACDC - Hell Bells.md");
  });

  it("no deja que el nombre navegue directorios", () => {
    const name = exportFileName("../../etc", "passwd");
    expect(name).not.toContain("/");
    expect(name).not.toContain("\\");
    expect(name.startsWith(".")).toBe(false);
  });

  it("cae a un nombre por defecto si no queda nada usable", () => {
    expect(exportFileName("///", "***")).toBe("letra.md");
  });

  it("acorta los títulos larguísimos", () => {
    expect(exportFileName("a".repeat(200), "b".repeat(200)).length).toBeLessThan(180);
  });
});

describe("toMarkdown", () => {
  const words = [
    word("Karma", "C4", 0),
    word("police", "D4", 0),
    word("Arrest", "C4", 1),
    word("this", "C4", 1),
  ];

  it("pone artista, título y procedencia en el encabezado", () => {
    const md = toMarkdown(words, META);
    expect(md).toContain("# Karma Police");
    expect(md).toContain("**Radiohead**");
    expect(md).toContain(META.url);
    expect(md).toContain("2026-08-10");
    expect(md).toContain("85% con nota");
  });

  it("escribe la nota UNA vez por tramo sostenido", () => {
    // "Arrest this" comparten C4: la nota va sobre la primera, no sobre las dos.
    const md = toMarkdown(words, META);
    const verso = md.split("\n").find((l) => l.includes("Arrest"));
    const notas = md.split("\n")[md.split("\n").indexOf(verso!) - 1];
    expect(notas.match(/C4/g)).toHaveLength(1);
  });

  /** Renglones de la letra: los de adentro del bloque de código. */
  function body(md: string): string[] {
    const lines = md.split("\n");
    return lines.slice(lines.indexOf("```text") + 1, lines.lastIndexOf("```"));
  }

  it("alinea cada nota sobre su palabra", () => {
    const lines = body(toMarkdown([word("Karma", "C4"), word("police", "D4")], META));
    const texto = lines.find((l) => l.includes("Karma"))!;
    const notas = lines[lines.indexOf(texto) - 1];
    expect(notas.indexOf("C4")).toBe(texto.indexOf("Karma"));
    expect(notas.indexOf("D4")).toBe(texto.indexOf("police"));
  });

  it("separa los versos en renglones distintos", () => {
    const md = toMarkdown(words, META);
    const conKarma = md.split("\n").find((l) => l.includes("Karma"))!;
    expect(conKarma).not.toContain("Arrest");
  });

  it("deja en blanco donde no hay nota, sin romper la alineación", () => {
    const md = toMarkdown([word("sin", null), word("nota", "C4")], META);
    const lines = md.split("\n");
    const texto = lines.find((l) => l.includes("sin nota"))!;
    const notas = lines[lines.indexOf(texto) - 1];
    expect(notas.indexOf("C4")).toBe(texto.indexOf("nota"));
  });

  it("envuelve la letra en un bloque de código para forzar monoespaciado", () => {
    const md = toMarkdown(words, META);
    expect(md).toContain("```text");
    expect(md.trimEnd().endsWith("```")).toBe(true);
  });
});
