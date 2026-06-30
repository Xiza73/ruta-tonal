import {
  frequencyToMidi,
  frequencyToNote,
  midiToFrequency,
  midiToNote,
} from "./notes";

describe("midiToFrequency", () => {
  test("A4 (69) = 440 Hz", () => {
    expect(midiToFrequency(69)).toBe(440);
  });

  test("octava abajo/arriba dobla y mitad la frecuencia", () => {
    expect(midiToFrequency(57)).toBeCloseTo(220, 6); // A3
    expect(midiToFrequency(81)).toBeCloseTo(880, 6); // A5
  });

  test("C4 (middle C, 60) ≈ 261.63 Hz", () => {
    expect(midiToFrequency(60)).toBeCloseTo(261.63, 2);
  });
});

describe("frequencyToMidi", () => {
  test("440 Hz = MIDI 69", () => {
    expect(frequencyToMidi(440)).toBeCloseTo(69, 6);
  });

  test("round-trip MIDI → Hz → MIDI", () => {
    for (const midi of [21, 60, 69, 100, 108]) {
      expect(frequencyToMidi(midiToFrequency(midi))).toBeCloseTo(midi, 6);
    }
  });

  test("rechaza frecuencias no positivas", () => {
    expect(() => frequencyToMidi(0)).toThrow(RangeError);
    expect(() => frequencyToMidi(-440)).toThrow(RangeError);
  });
});

describe("midiToNote", () => {
  test("notación científica", () => {
    expect(midiToNote(60)).toMatchObject({ name: "C", octave: 4, label: "C4" });
    expect(midiToNote(69)).toMatchObject({ name: "A", octave: 4, label: "A4" });
    expect(midiToNote(61)).toMatchObject({ name: "C#", octave: 4 });
  });

  test("notación solfège (Do, Re, Mi…)", () => {
    expect(midiToNote(60, "solfege")).toMatchObject({ name: "Do", label: "Do4" });
    expect(midiToNote(69, "solfege")).toMatchObject({ name: "La", label: "La4" });
  });

  test("límites del piano (A0 y C8)", () => {
    expect(midiToNote(21).label).toBe("A0");
    expect(midiToNote(108).label).toBe("C8");
  });
});

describe("frequencyToNote", () => {
  test("440 Hz justo = A4 con 0 cents", () => {
    const n = frequencyToNote(440);
    expect(n.label).toBe("A4");
    expect(n.cents).toBe(0);
  });

  test("levemente sostenido → cents positivos", () => {
    expect(frequencyToNote(444)).toMatchObject({ label: "A4", cents: 16 });
  });

  test("levemente bemol → cents negativos", () => {
    expect(frequencyToNote(437)).toMatchObject({ label: "A4", cents: -12 });
  });

  test("respeta la notación pedida", () => {
    expect(frequencyToNote(261.63, "solfege").name).toBe("Do");
  });
});
