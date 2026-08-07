import { describe, expect, it } from "vitest";
import { trackPitch } from "./offline-pitch";

const SAMPLE_RATE = 44100;

/** Suma de senos. Cada parcial es [frecuencia Hz, amplitud]. */
function tone(partials: [number, number][], seconds: number): Float32Array {
  const samples = new Float32Array(Math.round(SAMPLE_RATE * seconds));
  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    let value = 0;
    for (const [frequency, amplitude] of partials) {
      value += amplitude * Math.sin(2 * Math.PI * frequency * t);
    }
    samples[i] = value;
  }
  return samples;
}

/** La nota que más se repite en la traza, ignorando los silencios. */
function dominantNote(track: ReturnType<typeof trackPitch>): string | null {
  const counts = new Map<string, number>();
  for (const { note } of track) {
    if (!note) continue;
    counts.set(note.label, (counts.get(note.label) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) [best, bestCount] = [name, count];
  }
  return best;
}

describe("trackPitch", () => {
  it("sigue una voz limpia: A4 sola da A4", () => {
    const track = trackPitch(tone([[440, 1]], 1), SAMPLE_RATE);
    expect(track.length).toBeGreaterThan(30);
    expect(dominantNote(track)).toBe("A4");
  });

  it("ubica cada nota en su tramo de tiempo", () => {
    const samples = new Float32Array(SAMPLE_RATE); // 1s: A4 y después A5
    samples.set(tone([[440, 1]], 0.5), 0);
    samples.set(tone([[880, 1]], 0.5), SAMPLE_RATE / 2);
    const track = trackPitch(samples, SAMPLE_RATE);

    const early = track.find((s) => s.time > 0.1 && s.time < 0.4);
    const late = track.find((s) => s.time > 0.6 && s.time < 0.9);
    expect(early?.note?.label).toBe("A4");
    expect(late?.note?.label).toBe("A5");
  });

  it("respeta el rango: descarta lo que queda fuera", () => {
    const track = trackPitch(tone([[440, 1]], 0.5), SAMPLE_RATE, {
      minFrequency: 500,
      maxFrequency: 2000,
    });
    expect(track.every((s) => s.note === null)).toBe(true);
  });

  // ESTE es el test que justifica separar la voz antes de medir el pitch.
  // Mezcla realista: voz en A4 por encima de un bajo en E2 más fuerte.
  // La autocorrelación se engancha con la fundamental grave, no con la voz.
  it("sobre una mezcla NO devuelve la voz: el bajo se la come", () => {
    const mixed = tone(
      [
        [82.41, 0.7], // E2, bajo
        [440, 0.3], // A4, voz
      ],
      1,
    );
    const detected = dominantNote(trackPitch(mixed, SAMPLE_RATE));
    expect(detected).not.toBe("A4");
  });

  it("aislar la voz de esa misma mezcla sí devuelve A4", () => {
    const isolated = tone([[440, 0.3]], 1);
    expect(dominantNote(trackPitch(isolated, SAMPLE_RATE))).toBe("A4");
  });
});
