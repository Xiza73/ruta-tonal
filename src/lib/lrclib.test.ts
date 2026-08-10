import { describe, expect, it } from "vitest";
import { pickByDuration, type LrclibTrack } from "./lrclib";

function track(partial: Partial<LrclibTrack> & { duration: number }): LrclibTrack {
  return {
    id: 1,
    trackName: "Labios Rotos",
    artistName: "Zoé",
    albumName: null,
    instrumental: false,
    plainLyrics: "letra",
    syncedLyrics: "[00:10.00]letra",
    ...partial,
  };
}

describe("pickByDuration", () => {
  // El caso real: LRCLIB tiene 20 versiones de este tema, de 242 a 263s.
  it("elige la versión más cercana en duración", () => {
    const elegida = pickByDuration(
      [
        track({ id: 1, duration: 263, albumName: "otra grabacion" }),
        track({ id: 2, duration: 240.5, albumName: "estudio" }),
        track({ id: 3, duration: 243, albumName: "MTV Unplugged" }),
      ],
      240,
    );
    expect(elegida?.id).toBe(2);
  });

  it("prefiere no devolver nada antes que una grabación distinta", () => {
    // Un vivo que dura 23s más desalinearia la letra entera.
    expect(pickByDuration([track({ duration: 263 })], 240)).toBeNull();
  });

  it("respeta una tolerancia explícita", () => {
    const candidatos = [track({ duration: 245 })];
    expect(pickByDuration(candidatos, 240)).toBeNull();
    expect(pickByDuration(candidatos, 240, 6)?.duration).toBe(245);
  });

  it("ignora las versiones sin letra sincronizada", () => {
    const elegida = pickByDuration(
      [
        track({ id: 1, duration: 240, syncedLyrics: null }),
        track({ id: 2, duration: 241 }),
      ],
      240,
    );
    expect(elegida?.id).toBe(2);
  });

  it("ignora las marcadas como instrumental", () => {
    expect(pickByDuration([track({ duration: 240, instrumental: true })], 240)).toBeNull();
  });

  it("devuelve null si no hay candidatos", () => {
    expect(pickByDuration([], 240)).toBeNull();
  });
});
