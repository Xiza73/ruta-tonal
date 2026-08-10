import { describe, expect, it, vi } from "vitest";
import {
  fillNoteGaps,
  runLyricsPipeline,
  STAGES,
  type LyricNote,
  type PipelineDeps,
} from "./lyrics-pipeline";
import { frequencyToNote } from "./notes";

const SAMPLE_RATE = 44100;

/** Un la (A4) sostenido: da pitch claro para que noteInSpan tenga qué medir. */
function toneSamples(seconds: number): Float32Array {
  const samples = new Float32Array(Math.round(SAMPLE_RATE * seconds));
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.sin((2 * Math.PI * 440 * i) / SAMPLE_RATE);
  }
  return samples;
}

function deps(overrides: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    downloadAudio: vi.fn(async () => "/cache/audio.m4a"),
    separateVocals: vi.fn(async () => "/cache/vocals.wav"),
    transcribeWords: vi.fn(async () => [
      { text: "hola", from: 0.2, to: 0.6 },
      { text: "mundo", from: 0.6, to: 1.0 },
    ]),
    findLyrics: vi.fn(async () => ({ syncedLyrics: "[00:00.20]hola mundo" })),
    loadSamples: vi.fn(async () => ({ samples: toneSamples(2), sampleRate: SAMPLE_RATE })),
    ...overrides,
  };
}

describe("runLyricsPipeline", () => {
  it("encadena las etapas pasando la salida de una a la siguiente", async () => {
    const d = deps();
    await runLyricsPipeline({ url: "https://youtu.be/x", artist: "Zoé", track: "Tema" }, d);

    expect(d.downloadAudio).toHaveBeenCalledWith("https://youtu.be/x");
    expect(d.separateVocals).toHaveBeenCalledWith("/cache/audio.m4a");
    expect(d.transcribeWords).toHaveBeenCalledWith("/cache/vocals.wav");
    // El pitch se mide sobre el MISMO stem que transcribió whisper.
    expect(d.loadSamples).toHaveBeenCalledWith("/cache/vocals.wav");
  });

  it("reporta las etapas en orden", async () => {
    const seen: string[] = [];
    await runLyricsPipeline(
      { url: "u", artist: "a", track: "t" },
      deps({ onStage: (s) => seen.push(s) }),
    );
    expect(seen).toEqual([...STAGES]);
  });

  it("busca la letra con la duración real del audio, no con la del video", async () => {
    const d = deps();
    await runLyricsPipeline({ url: "u", artist: "Zoé", track: "Tema" }, d);
    expect(d.findLyrics).toHaveBeenCalledWith({
      artist: "Zoé",
      track: "Tema",
      durationSeconds: 2,
    });
  });

  it("le pone la nota a cada palabra", async () => {
    const result = await runLyricsPipeline({ url: "u", artist: "a", track: "t" }, deps());
    expect(result.words).toHaveLength(2);
    expect(result.words[0].text).toBe("hola");
    expect(result.words[0].note?.label).toBe("A4");
    expect(result.withNote).toBe(1);
  });

  it("informa qué fracción quedó anclada a un tiempo real", async () => {
    const result = await runLyricsPipeline(
      { url: "u", artist: "a", track: "t" },
      deps({
        // whisper solo reconoció una de las dos.
        transcribeWords: async () => [{ text: "hola", from: 0.2, to: 0.6 }],
      }),
    );
    expect(result.anchored).toBe(0.5);
  });

  it("falla claro si no hay letra para ese tema", async () => {
    await expect(
      runLyricsPipeline({ url: "u", artist: "a", track: "t" }, deps({ findLyrics: async () => null })),
    ).rejects.toThrow(/No encontré la letra/);
  });

  it("falla claro si la versión encontrada no trae letra sincronizada", async () => {
    await expect(
      runLyricsPipeline(
        { url: "u", artist: "a", track: "t" },
        deps({ findLyrics: async () => ({ syncedLyrics: null }) }),
      ),
    ).rejects.toThrow(/No encontré la letra/);
  });

  it("propaga el error de una etapa sin dejarlo pasar en silencio", async () => {
    await expect(
      runLyricsPipeline(
        { url: "u", artist: "a", track: "t" },
        deps({
          separateVocals: async () => {
            throw new Error("falló la separación");
          },
        }),
      ),
    ).rejects.toThrow("falló la separación");
  });
});

/** Palabra de prueba: `note` por nombre de nota, o `null` para un hueco. */
function word(text: string, note: "A4" | "C4" | null, line = 0): LyricNote {
  const HZ = { A4: 440, C4: 261.63 };
  return {
    text,
    from: 0,
    to: 1,
    line,
    inferred: false,
    note: note ? frequencyToNote(HZ[note], "scientific") : null,
  };
}

describe("fillNoteGaps", () => {
  it("deduce la nota cuando la palabra queda entre dos iguales", () => {
    // Una consonante corta el pitch en el medio de una nota sostenida.
    const filled = fillNoteGaps([word("la", "A4"), word("s", null), word("bios", "A4")]);
    expect(filled[1].note?.label).toBe("A4");
    expect(filled[1].inferred).toBe(true);
  });

  it("NO inventa nada si las vecinas suenan distinto", () => {
    const filled = fillNoteGaps([word("uno", "A4"), word("dos", null), word("tres", "C4")]);
    expect(filled[1].note).toBeNull();
    expect(filled[1].inferred).toBe(false);
  });

  it("no cruza el corte entre versos", () => {
    // El final de un verso y el arranque del siguiente no son una nota sostenida.
    const filled = fillNoteGaps([
      word("fin", "A4", 0),
      word("hueco", null, 1),
      word("sigue", "A4", 1),
    ]);
    expect(filled[1].note).toBeNull();
  });

  it("deja intactas las palabras que sí tienen nota medida", () => {
    const filled = fillNoteGaps([word("con", "A4"), word("nota", "C4")]);
    expect(filled.map((w) => w.inferred)).toEqual([false, false]);
  });

  it("no toca los huecos de los extremos, que no tienen dos vecinas", () => {
    const filled = fillNoteGaps([word("borde", null), word("nota", "A4")]);
    expect(filled[0].note).toBeNull();
  });
});

describe("runLyricsPipeline · versos", () => {
  it("conserva a qué verso pertenece cada palabra", async () => {
    const result = await runLyricsPipeline(
      { url: "u", artist: "a", track: "t" },
      deps({
        findLyrics: async () => ({
          syncedLyrics: "[00:00.20]primer verso\n[00:00.60]segundo verso",
        }),
      }),
    );
    expect(result.words.map((w) => w.line)).toEqual([0, 0, 1, 1]);
  });

  it("los interludios no gastan un número de verso", async () => {
    const result = await runLyricsPipeline(
      { url: "u", artist: "a", track: "t" },
      deps({
        findLyrics: async () => ({
          syncedLyrics: "[00:00.20]canta\n[00:00.40]\n[00:00.60]vuelve",
        }),
      }),
    );
    expect(result.words.map((w) => w.line)).toEqual([0, 1]);
  });
});
