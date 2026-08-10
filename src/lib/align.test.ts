import { describe, expect, it } from "vitest";
import { alignLyrics, anchorRate, matchWords, normalizeWord, type TimedWord } from "./align";

/** Atajo para armar lo que devuelve whisper. */
function heard(...items: [string, number, number][]): TimedWord[] {
  return items.map(([text, from, to]) => ({ text, from, to }));
}

describe("normalizeWord", () => {
  it("iguala acentos, mayúsculas y puntuación", () => {
    expect(normalizeWord("Corazón,")).toBe(normalizeWord("corazon"));
    expect(normalizeWord("¡Qué!")).toBe("que");
  });

  it("conserva la eñe, que no es un acento", () => {
    expect(normalizeWord("niña")).toBe("niña");
    expect(normalizeWord("niña")).not.toBe(normalizeWord("nina"));
  });
});

describe("matchWords", () => {
  it("empareja uno a uno cuando whisper acertó todo", () => {
    expect(matchWords(["hola", "mundo"], ["hola", "mundo"])).toEqual([0, 1]);
  });

  it("deja sin ancla la palabra que whisper erró, sin correr el resto", () => {
    // Este es el caso que rompe un emparejamiento por posición.
    const pairing = matchWords(["uno", "dos", "tres"], ["uno", "XXX", "tres"]);
    expect(pairing).toEqual([0, null, 2]);
  });

  it("absorbe palabras que whisper inventó de más", () => {
    const pairing = matchWords(["uno", "dos"], ["uno", "basura", "inventada", "dos"]);
    expect(pairing).toEqual([0, 3]);
  });

  it("absorbe palabras que whisper se comió", () => {
    const pairing = matchWords(["uno", "dos", "tres", "cuatro"], ["uno", "cuatro"]);
    expect(pairing[0]).toBe(0);
    expect(pairing[3]).toBe(1);
    expect(pairing[1]).toBeNull();
    expect(pairing[2]).toBeNull();
  });

  it("no ancla nada si no hay ninguna coincidencia real", () => {
    expect(matchWords(["uno", "dos"], ["aaa", "bbb"])).toEqual([null, null]);
  });

  it("empareja ignorando acentos y puntuación", () => {
    expect(matchWords(["Corazón,", "roto"], ["corazon", "roto"])).toEqual([0, 1]);
  });
});

describe("alignLyrics", () => {
  it("usa el texto de la letra y los tiempos de whisper", () => {
    const result = alignLyrics({
      lyrics: ["Corazón", "roto"],
      heard: heard(["corazon", 1, 1.5], ["roto", 1.5, 2]),
      duration: 10,
    });
    expect(result).toEqual([
      { text: "Corazón", from: 1, to: 1.5 },
      { text: "roto", from: 1.5, to: 2 },
    ]);
  });

  it("interpola la palabra que whisper no reconoció, entre sus vecinas", () => {
    const result = alignLyrics({
      lyrics: ["uno", "dos", "tres"],
      heard: heard(["uno", 0, 1], ["XXX", 1, 3], ["tres", 3, 4]),
      duration: 10,
    });
    expect(result[0]).toEqual({ text: "uno", from: 0, to: 1 });
    expect(result[2]).toEqual({ text: "tres", from: 3, to: 4 });
    // La del medio se reparte el hueco que queda entre 1 y 3.
    expect(result[1]).toEqual({ text: "dos", from: 1, to: 3 });
  });

  it("apoya en los extremos del audio lo que queda sin ancla en las puntas", () => {
    const result = alignLyrics({
      lyrics: ["antes", "ancla", "despues"],
      heard: heard(["ancla", 4, 5]),
      duration: 10,
    });
    expect(result[0]).toEqual({ text: "antes", from: 0, to: 4 });
    expect(result[1]).toEqual({ text: "ancla", from: 4, to: 5 });
    expect(result[2]).toEqual({ text: "despues", from: 5, to: 10 });
  });

  it("reparte parejo si whisper no devolvió nada", () => {
    const result = alignLyrics({ lyrics: ["a", "b"], heard: [], duration: 10 });
    expect(result).toEqual([
      { text: "a", from: 0, to: 5 },
      { text: "b", from: 5, to: 10 },
    ]);
  });

  it("devuelve vacío si no hay letra", () => {
    expect(alignLyrics({ lyrics: [], heard: heard(["x", 0, 1]), duration: 10 })).toEqual([]);
  });

  it("apoya en bounds y no en el segundo cero cuando se lo pasan", () => {
    // Sin esto, en un tema que arranca a los 24s la primera palabra sin ancla
    // se estira desde el 0: 24 segundos de error visible.
    const result = alignLyrics({
      lyrics: ["antes", "ancla"],
      heard: heard(["ancla", 30, 31]),
      duration: 240,
      bounds: { from: 24, to: 229 },
    });
    expect(result[0]).toEqual({ text: "antes", from: 24, to: 30 });
  });

  it("respeta bounds también cuando whisper no devolvió nada", () => {
    const result = alignLyrics({
      lyrics: ["a", "b"],
      heard: [],
      duration: 240,
      bounds: { from: 20, to: 40 },
    });
    expect(result).toEqual([
      { text: "a", from: 20, to: 30 },
      { text: "b", from: 30, to: 40 },
    ]);
  });

  it("mantiene los tiempos siempre crecientes", () => {
    const result = alignLyrics({
      lyrics: ["a", "b", "c", "d", "e"],
      heard: heard(["a", 1, 2], ["e", 8, 9]),
      duration: 10,
    });
    for (let i = 1; i < result.length; i++) {
      expect(result[i].from).toBeGreaterThanOrEqual(result[i - 1].from);
    }
  });
});

describe("anchorRate", () => {
  it("mide qué fracción de la letra quedó anclada a un tiempo real", () => {
    expect(anchorRate([0, null, 2, null])).toBe(0.5);
    expect(anchorRate([])).toBe(0);
  });
});
