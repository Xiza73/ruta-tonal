import { continuousMidi, followCenter, median, midiToY, visibleRange } from "./pitch-graph";
import type { DetectedNote } from "./notes";

const note = (midi: number, cents: number): DetectedNote => ({
  midi,
  name: "A",
  octave: 4,
  label: "A4",
  frequency: 440,
  cents,
});

describe("continuousMidi", () => {
  test("null → null", () => {
    expect(continuousMidi(null)).toBeNull();
  });
  test("reconstruye pitch continuo desde midi + cents", () => {
    expect(continuousMidi(note(69, 0))).toBe(69);
    expect(continuousMidi(note(69, 16))).toBeCloseTo(69.16, 5);
    expect(continuousMidi(note(69, -12))).toBeCloseTo(68.88, 5);
  });
});

describe("midiToY", () => {
  const range = { low: 48, high: 72 }; // C3–C5

  test("la nota más aguda va arriba (y=0)", () => {
    expect(midiToY(72, range)).toBe(0);
  });
  test("la nota más grave va abajo (y=1)", () => {
    expect(midiToY(48, range)).toBe(1);
  });
  test("el centro del rango va al medio", () => {
    expect(midiToY(60, range)).toBeCloseTo(0.5, 5);
  });
  test("clampea fuera de rango a [0,1]", () => {
    expect(midiToY(100, range)).toBe(0);
    expect(midiToY(10, range)).toBe(1);
  });
});

describe("median", () => {
  test("impar → valor del medio", () => {
    expect(median([5, 1, 3])).toBe(3);
  });
  test("par → promedio de los dos del medio", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  test("rechaza el salto de octava de un frame suelto", () => {
    // 4 frames en La4 (69) + 1 frame una octava abajo (57) → sigue dando 69
    expect(median([69, 69, 57, 69, 69])).toBe(69);
  });
});

describe("visibleRange", () => {
  test("centra una ventana de span semitonos", () => {
    expect(visibleRange(60, 24)).toEqual({ low: 48, high: 72 });
  });
});

describe("followCenter", () => {
  const bounds = { low: 48, high: 72 };

  test("se acerca al target (lerp) sin pasarlo", () => {
    const next = followCenter(60, 70, 0.5, bounds);
    expect(next).toBe(65); // 60 + (70-60)*0.5
  });

  test("queda acotado a bounds", () => {
    expect(followCenter(72, 100, 1, bounds)).toBe(72); // no sube de high
    expect(followCenter(48, 10, 1, bounds)).toBe(48); // no baja de low
  });

  test("converge al target tras varios pasos", () => {
    let c = 60;
    for (let i = 0; i < 50; i++) c = followCenter(c, 67, 0.3, bounds);
    expect(c).toBeCloseTo(67, 3);
  });
});
