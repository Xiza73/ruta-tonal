import { describe, expect, it } from "vitest";
import {
  clampTotal,
  commitSegment,
  elapsedFraction,
  formatDuration,
  formatSegment,
  MAX_TOTAL_SECONDS,
  remainingSeconds,
  segmentMax,
  splitDuration,
  stepDuration,
  typeDigit,
} from "./timer";

describe("formato", () => {
  it("siempre muestra dos dígitos", () => {
    expect(formatSegment(7)).toBe("07");
    expect(formatSegment(0)).toBe("00");
    expect(formatSegment(59)).toBe("59");
  });

  it("arma mm:ss desde segundos totales", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(65)).toBe("01:05");
    expect(formatDuration(MAX_TOTAL_SECONDS)).toBe("99:59");
  });

  it("parte la duración en minutos y segundos", () => {
    expect(splitDuration(249)).toEqual({ minutes: 4, seconds: 9 });
  });
});

describe("clampTotal", () => {
  it("no baja de cero ni pasa del tope", () => {
    expect(clampTotal(-30)).toBe(0);
    expect(clampTotal(MAX_TOTAL_SECONDS + 100)).toBe(MAX_TOTAL_SECONDS);
  });

  it("sobrevive a valores que no son números", () => {
    expect(clampTotal(NaN)).toBe(0);
    expect(clampTotal(Infinity)).toBe(MAX_TOTAL_SECONDS);
  });
});

describe("stepDuration", () => {
  it("las flechas mueven el total, así que 04:59 + 1s da 05:00", () => {
    // Si cada segmento se topeara solo, esto quedaría trabado en 59.
    expect(formatDuration(stepDuration(4 * 60 + 59, "seconds", 1))).toBe("05:00");
  });

  it("bajar un segundo desde 05:00 vuelve a 04:59", () => {
    expect(formatDuration(stepDuration(5 * 60, "seconds", -1))).toBe("04:59");
  });

  it("en minutos se mueve de a 60 segundos", () => {
    expect(formatDuration(stepDuration(90, "minutes", 1))).toBe("02:30");
  });

  it("no baja de cero", () => {
    expect(stepDuration(5, "seconds", -10)).toBe(0);
  });

  it("no pasa del tope", () => {
    expect(stepDuration(MAX_TOTAL_SECONDS, "minutes", 1)).toBe(MAX_TOTAL_SECONDS);
  });
});

describe("typeDigit", () => {
  it("el primer dígito abre el valor", () => {
    expect(typeDigit("", "5", 59)).toEqual({ draft: "5", done: false });
  });

  it("el segundo dígito lo completa", () => {
    expect(typeDigit("0", "5", 59)).toEqual({ draft: "05", done: true });
  });

  it("un dígito que no admite segundo cierra solo", () => {
    // En segundos, un 7 solo puede ser 07: 70 se pasa de 59.
    expect(typeDigit("", "7", 59)).toEqual({ draft: "7", done: true });
    // En minutos, en cambio, 7 puede seguir siendo 70..79.
    expect(typeDigit("", "7", 99)).toEqual({ draft: "7", done: false });
  });

  it("si el par se pasa del máximo, el dígito arranca de nuevo", () => {
    // 5 seguido de 9 da 59, válido. Pero 6 seguido de 5 daría 65: se reinicia.
    expect(typeDigit("5", "9", 59)).toEqual({ draft: "59", done: true });
    expect(typeDigit("6", "5", 59)).toEqual({ draft: "5", done: false });
  });

  it("escribir sobre un valor completo lo reemplaza", () => {
    expect(typeDigit("59", "1", 59)).toEqual({ draft: "1", done: false });
  });

  it("ignora lo que no sea un dígito", () => {
    expect(typeDigit("1", "a", 59)).toEqual({ draft: "1", done: false });
  });
});

describe("commitSegment", () => {
  it("reemplaza un segmento sin tocar el otro", () => {
    const total = 4 * 60 + 30; // 04:30
    expect(formatDuration(commitSegment(total, "minutes", 12))).toBe("12:30");
    expect(formatDuration(commitSegment(total, "seconds", 5))).toBe("04:05");
  });

  it("recorta al máximo del segmento", () => {
    expect(formatDuration(commitSegment(0, "seconds", 99))).toBe("00:59");
    expect(segmentMax("minutes")).toBe(99);
  });
});

describe("remainingSeconds", () => {
  it("redondea hacia arriba para que el último segundo se vea", () => {
    // Con 1 ms de vida, en pantalla todavía dice 1s. Truncar mostraría 0
    // mientras el temporizador sigue corriendo.
    expect(remainingSeconds(1000, 999)).toBe(1);
    expect(remainingSeconds(1000, 1000)).toBe(0);
  });

  it("nunca devuelve negativos aunque se pase la hora", () => {
    expect(remainingSeconds(1000, 9999)).toBe(0);
  });

  it("no depende de cuántas veces se lo llame", () => {
    // Esta es la propiedad que evita la deriva: el resultado sale del reloj,
    // no de contar ticks.
    const endsAt = 60_000;
    expect(remainingSeconds(endsAt, 0)).toBe(60);
    expect(remainingSeconds(endsAt, 30_000)).toBe(30);
    expect(remainingSeconds(endsAt, 59_500)).toBe(1);
  });
});

describe("elapsedFraction", () => {
  it("va de 0 a 1 a medida que corre", () => {
    expect(elapsedFraction(60, 60)).toBe(0);
    expect(elapsedFraction(60, 30)).toBe(0.5);
    expect(elapsedFraction(60, 0)).toBe(1);
  });

  it("no explota con duración cero", () => {
    expect(elapsedFraction(0, 0)).toBe(0);
  });
});
