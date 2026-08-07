import { describe, expect, it } from "vitest";
import { noteInSpan, trackPitch } from "./offline-pitch";

const SAMPLE_RATE = 44100;

/**
 * Voz cantada sintética: armónicos + vibrato.
 * La fase se INTEGRA muestra a muestra; escribir `sin(2π·f(t)·t)` no es
 * modulación de frecuencia y produce excursiones enormes.
 */
function sungVoice(f0: number, seconds: number, vibratoCents: number): Float32Array {
  const samples = new Float32Array(Math.round(SAMPLE_RATE * seconds));
  let phase = 0;
  for (let i = 0; i < samples.length; i++) {
    const vibrato = vibratoCents * Math.sin((2 * Math.PI * 5.5 * i) / SAMPLE_RATE);
    phase += (2 * Math.PI * f0 * 2 ** (vibrato / 1200)) / SAMPLE_RATE;
    let value = 0;
    for (let harmonic = 1; harmonic <= 6; harmonic++) {
      value += (1 / harmonic) * Math.sin(phase * harmonic);
    }
    samples[i] = value * 0.3;
  }
  return samples;
}

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

  it("sobre voz cantada con armónicos sigue el vibrato sin perder lecturas", () => {
    const track = trackPitch(sungVoice(220, 1.5, 50), SAMPLE_RATE);
    // Cero silencio: el umbral del afinador en vivo sirve tal cual para voz.
    expect(track.every((s) => s.note !== null)).toBe(true);
    // El error sigue al vibrato, no lo excede: |desviación| ≤ la profundidad.
    const worst = Math.max(...track.map((s) => Math.abs(1200 * Math.log2(s.note!.frequency / 220))));
    expect(worst).toBeLessThanOrEqual(50);
  });
});

describe("noteInSpan", () => {
  it("recupera la nota cantada aunque el vibrato haga saltar las lecturas", () => {
    const track = trackPitch(sungVoice(220, 1.5, 100), SAMPLE_RATE);
    // Vibrato ±100 cents = un semitono completo: ventana a ventana salta de nota.
    expect(new Set(track.map((s) => s.note?.label)).size).toBeGreaterThan(1);
    // La mediana sobre el tramo lo resuelve igual.
    expect(noteInSpan(track, 0, 1.5)?.label).toBe("A3");
  });

  it("distingue notas por tramo, como palabras de una letra", () => {
    const samples = new Float32Array(SAMPLE_RATE * 2);
    samples.set(sungVoice(220, 1, 30), 0); // A3
    samples.set(sungVoice(440, 1, 30), SAMPLE_RATE); // A4
    const track = trackPitch(samples, SAMPLE_RATE);

    expect(noteInSpan(track, 0.1, 0.9)?.label).toBe("A3");
    expect(noteInSpan(track, 1.1, 1.9)?.label).toBe("A4");
  });

  it("devuelve null en un tramo sin lecturas", () => {
    const track = trackPitch(sungVoice(220, 0.5, 0), SAMPLE_RATE);
    expect(noteInSpan(track, 10, 20)).toBeNull();
  });
});
