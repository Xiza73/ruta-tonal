import { describe, expect, it } from "vitest";
import { lyricSpans, parseLrc } from "./lrc";

describe("parseLrc", () => {
  it("lee marcas de tiempo y las convierte a segundos", () => {
    const lines = parseLrc("[00:24.48]primera\n[01:05.10]segunda");
    expect(lines).toEqual([
      { time: 24.48, text: "primera" },
      { time: 65.1, text: "segunda" },
    ]);
  });

  it("descarta los tags de metadata", () => {
    const lines = parseLrc("[ar:Zoé]\n[ti:Tema]\n[00:10.00]la unica linea real");
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe("la unica linea real");
  });

  it("repite el texto cuando la línea trae varias marcas", () => {
    const lines = parseLrc("[00:10.00][01:20.00]estribillo");
    expect(lines).toEqual([
      { time: 10, text: "estribillo" },
      { time: 80, text: "estribillo" },
    ]);
  });

  it("conserva las líneas vacías: marcan los interludios", () => {
    const lines = parseLrc("[00:10.00]canta\n[00:14.00]\n[00:30.00]vuelve");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toEqual({ time: 14, text: "" });
  });

  it("acepta mm:ss sin centésimos y el separador con dos puntos", () => {
    expect(parseLrc("[00:09]sin decimales")[0].time).toBe(9);
    expect(parseLrc("[00:09:50]con dos puntos")[0].time).toBe(9.5);
  });

  it("ordena por tiempo aunque el archivo venga desordenado", () => {
    const lines = parseLrc("[02:00.00]tarde\n[00:30.00]temprano");
    expect(lines.map((l) => l.text)).toEqual(["temprano", "tarde"]);
  });

  it("devuelve vacío si no hay ninguna marca", () => {
    expect(parseLrc("letra suelta sin timestamps")).toEqual([]);
  });
});

describe("lyricSpans", () => {
  it("cierra cada línea donde empieza la siguiente", () => {
    const spans = lyricSpans(parseLrc("[00:10.00]una\n[00:14.00]otra"), 20);
    expect(spans).toEqual([
      { from: 10, to: 14, text: "una" },
      { from: 14, to: 20, text: "otra" },
    ]);
  });

  it("usa los interludios para cortar, pero no los devuelve", () => {
    // Sin la línea vacía, "canta" se estiraría 20s sobre el instrumental.
    const spans = lyricSpans(parseLrc("[00:10.00]canta\n[00:14.00]\n[00:30.00]vuelve"), 40);
    expect(spans).toEqual([
      { from: 10, to: 14, text: "canta" },
      { from: 30, to: 40, text: "vuelve" },
    ]);
  });
});
