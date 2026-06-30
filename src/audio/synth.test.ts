import { createSynth } from "./synth";

// AudioContext falso mínimo: registra los osciladores creados y sus parámetros.
// jsdom no trae Web Audio, así que inyectamos esto.
class FakeParam {
  value = 0;
  setValueAtTime(v: number) {
    this.value = v;
    return this;
  }
  linearRampToValueAtTime() {
    return this;
  }
  cancelScheduledValues() {
    return this;
  }
}
class FakeNode {
  connect(next: FakeNode) {
    return next;
  }
  disconnect() {}
}
class FakeOscillator extends FakeNode {
  type: OscillatorType = "sine";
  frequency = new FakeParam();
  started = false;
  stopped = false;
  onended: (() => void) | null = null;
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
  }
}
class FakeGain extends FakeNode {
  gain = new FakeParam();
}
class FakeAudioContext {
  currentTime = 0;
  destination = new FakeNode();
  oscillators: FakeOscillator[] = [];
  resumed = false;
  closed = false;
  createOscillator() {
    const o = new FakeOscillator();
    this.oscillators.push(o);
    return o;
  }
  createGain() {
    return new FakeGain();
  }
  resume() {
    this.resumed = true;
    return Promise.resolve();
  }
  close() {
    this.closed = true;
    return Promise.resolve();
  }
}

function setup(type?: OscillatorType) {
  const ctx = new FakeAudioContext();
  const synth = createSynth({ context: ctx as unknown as AudioContext, type });
  return { ctx, synth };
}

test("play(69) suena a 440 Hz (usa notes.ts)", () => {
  const { ctx, synth } = setup();
  synth.play(69);
  const osc = ctx.oscillators.at(-1)!;
  expect(osc.frequency.value).toBe(440);
  expect(osc.started).toBe(true);
});

test("play(60) suena a ~261.63 Hz (middle C)", () => {
  const { ctx, synth } = setup();
  synth.play(60);
  expect(ctx.oscillators.at(-1)!.frequency.value).toBeCloseTo(261.63, 2);
});

test("usa el tipo de sonido configurado", () => {
  const { ctx, synth } = setup("square");
  synth.play(69);
  expect(ctx.oscillators.at(-1)!.type).toBe("square");
});

test("setType cambia el tipo de las próximas notas", () => {
  const { ctx, synth } = setup("sine");
  synth.setType("sawtooth");
  synth.play(69);
  expect(ctx.oscillators.at(-1)!.type).toBe("sawtooth");
});

test("release detiene el oscilador y es idempotente", () => {
  const { ctx, synth } = setup();
  const voice = synth.play(69);
  voice.release();
  voice.release(); // no debe romper
  expect(ctx.oscillators.at(-1)!.stopped).toBe(true);
});

test("resume y dispose delegan en el contexto", async () => {
  const { ctx, synth } = setup();
  await synth.resume();
  synth.dispose();
  expect(ctx.resumed).toBe(true);
  expect(ctx.closed).toBe(true);
});
