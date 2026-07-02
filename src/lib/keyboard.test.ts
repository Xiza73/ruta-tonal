import {
  buildProfile,
  DEFAULT_PROFILE,
  keysForProfile,
  midiForCode,
  octaveRange,
  type KeyboardProfile,
} from "./keyboard";

describe("octaveRange", () => {
  test("una octava cubre 12 semitonos", () => {
    expect(octaveRange(60, 1)).toEqual({ low: 60, high: 72 });
  });
  test("dos octavas desde C3", () => {
    expect(octaveRange(48, 2)).toEqual({ low: 48, high: 72 });
  });
});

describe("keysForProfile", () => {
  test("perfil default: C4 a C5, 13 teclas", () => {
    const keys = keysForProfile(DEFAULT_PROFILE);
    expect(keys).toHaveLength(13);
    expect(keys[0].label).toBe("C4");
    expect(keys.at(-1)!.label).toBe("C5");
  });

  test("una octava tiene 5 teclas negras", () => {
    const keys = keysForProfile(DEFAULT_PROFILE);
    expect(keys.filter((k) => k.isSharp)).toHaveLength(5);
  });

  test("asigna la tecla física a cada nota del rango", () => {
    const keys = keysForProfile(DEFAULT_PROFILE);
    expect(keys[0].code).toBe("KeyZ"); // C4 (offset 0)
    expect(keys.at(-1)!.code).toBe("KeyQ"); // C5 (offset 12)
  });

  test("el mismo keyMap sirve en otra octava (offset relativo)", () => {
    const profile: KeyboardProfile = {
      ...DEFAULT_PROFILE,
      range: octaveRange(48, 1), // C3–C4
    };
    const keys = keysForProfile(profile);
    expect(keys[0].label).toBe("C3");
    expect(keys[0].code).toBe("KeyZ"); // misma tecla física, otra octava
  });

  test("respeta la notación del perfil", () => {
    const keys = keysForProfile({ ...DEFAULT_PROFILE, notation: "solfege" });
    expect(keys[0].name).toBe("Do");
  });
});

describe("buildProfile", () => {
  test("arma el perfil desde los ajustes", () => {
    const profile = buildProfile({
      notation: "solfege",
      startMidi: 48,
      octaves: 2,
      soundType: "square",
    });
    expect(profile.range).toEqual({ low: 48, high: 72 });
    expect(profile.notation).toBe("solfege");
    expect(profile.soundType).toBe("square");
  });

  test("el perfil resultante genera las teclas correctas", () => {
    const profile = buildProfile({
      notation: "scientific",
      startMidi: 60,
      octaves: 1,
      soundType: "sine",
    });
    const keys = keysForProfile(profile);
    expect(keys).toHaveLength(13); // C4–C5
    expect(keys[0].label).toBe("C4");
  });
});

describe("midiForCode", () => {
  test("tecla mapeada → MIDI absoluto", () => {
    expect(midiForCode(DEFAULT_PROFILE, "KeyZ")).toBe(60); // C4
    expect(midiForCode(DEFAULT_PROFILE, "KeyQ")).toBe(72); // C5
  });
  test("tecla no mapeada → undefined", () => {
    expect(midiForCode(DEFAULT_PROFILE, "Escape")).toBeUndefined();
  });
});
