import { readingToNote } from "./pitch";

test("clarity alta + en rango → nota", () => {
  expect(readingToNote(440, 0.95)).toMatchObject({ label: "A4", cents: 0 });
});

test("clarity baja → null (silencio/ruido)", () => {
  expect(readingToNote(440, 0.5)).toBeNull();
});

test("clarity justo en el umbral (0.9) pasa", () => {
  expect(readingToNote(440, 0.9)).not.toBeNull();
});

test("fuera de rango → null aunque la clarity sea alta", () => {
  expect(readingToNote(30, 0.99)).toBeNull(); // demasiado grave
  expect(readingToNote(5000, 0.99)).toBeNull(); // demasiado agudo
});

test("respeta la notación pedida", () => {
  expect(readingToNote(261.63, 0.95, { notation: "solfege" })?.name).toBe("Do");
});

test("umbral de clarity configurable", () => {
  expect(readingToNote(440, 0.7)).toBeNull(); // default 0.9
  expect(readingToNote(440, 0.7, { clarityThreshold: 0.6 })).not.toBeNull();
});
