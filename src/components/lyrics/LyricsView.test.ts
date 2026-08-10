import { describe, expect, it } from "vitest";
import { frequencyToNote } from "../../lib/notes";
import type { LyricNote } from "../../lib/lyrics-pipeline";
import { groupIntoLines, groupIntoRuns } from "./LyricsView";

const HZ: Record<string, number> = { C4: 261.63, D4: 293.66, E4: 329.63, A4: 440 };

function word(text: string, note: string | null, line = 0, inferred = false): LyricNote {
  return {
    text,
    from: 0,
    to: 1,
    line,
    inferred,
    note: note ? frequencyToNote(HZ[note], "scientific") : null,
  };
}

describe("groupIntoLines", () => {
  it("corta un renglón por verso", () => {
    const lines = groupIntoLines([
      word("Karma", "C4", 0),
      word("police", "D4", 0),
      word("Arrest", "C4", 1),
    ]);
    expect(lines.map((l) => l.map((w) => w.text))).toEqual([["Karma", "police"], ["Arrest"]]);
  });

  it("no junta versos distintos aunque compartan nota", () => {
    const lines = groupIntoLines([word("fin", "A4", 0), word("inicio", "A4", 1)]);
    expect(lines).toHaveLength(2);
  });

  it("con una sola palabra devuelve un renglón", () => {
    expect(groupIntoLines([word("sola", "A4")])).toHaveLength(1);
  });

  it("sin palabras no devuelve renglones", () => {
    expect(groupIntoLines([])).toEqual([]);
  });
});

describe("groupIntoRuns", () => {
  it("junta palabras seguidas con la misma nota", () => {
    // Tres C4 seguidos son UNA nota sostenida, no tres notas.
    const runs = groupIntoRuns([word("this", "C4"), word("is", "C4"), word("what", "C4")]);
    expect(runs).toHaveLength(1);
    expect(runs[0].note).toBe("C4");
    expect(runs[0].words.map((w) => w.text)).toEqual(["this", "is", "what"]);
  });

  it("corta cuando cambia la nota", () => {
    const runs = groupIntoRuns([word("a", "C4"), word("b", "E4"), word("c", "C4")]);
    expect(runs.map((r) => r.note)).toEqual(["C4", "E4", "C4"]);
  });

  it("NO junta los huecos entre sí: cada uno es su propia incógnita", () => {
    const runs = groupIntoRuns([word("a", null), word("b", null)]);
    expect(runs).toHaveLength(2);
    expect(runs.every((r) => r.note === null)).toBe(true);
  });

  it("el grupo solo queda como deducido si TODAS sus palabras lo son", () => {
    const mixto = groupIntoRuns([word("medida", "C4", 0, false), word("deducida", "C4", 0, true)]);
    expect(mixto[0].inferred).toBe(false);

    const todas = groupIntoRuns([word("a", "C4", 0, true), word("b", "C4", 0, true)]);
    expect(todas[0].inferred).toBe(true);
  });
});
